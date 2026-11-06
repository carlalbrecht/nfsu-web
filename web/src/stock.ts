import { startProcess, type GameProcess } from './host/process';
import { attachRenderer, type Renderer } from './gpu/index';
import { attachAudio, type AudioHandle } from './audio/index';
import { attachInput, type InputHandle } from './input/index';
import { attachCoverage } from './testing/coverage';
import { runGpuContracts } from './testing/gpu-contract';
import { attachScenarioRunner } from './testing/runner';
import { createLauncher, checkBrowser } from './launcher/shell';

const ui = createLauncher();
const {start,stop,canvas} = ui;
const output = document.querySelector<HTMLElement>('#log')!;
const lines: string[] = [];
declare const __WEB_BUILD__: string;
let faults = 0;
let process: GameProcess | null = null;
let renderer: Renderer | null = null;
let audio: AudioHandle | null = null;
let input: InputHandle | null = null;
let pendingAudio: AudioContext | null = null;
let download: AbortController | null = null;
let firstFrame = 0;
let generation = 0;
const testMode = new URLSearchParams(location.search).has('test');
const coverageOutput = document.querySelector<HTMLElement>('#coverage-status')!;
let coverage: Awaited<ReturnType<typeof attachCoverage>> | null = null;
document.querySelector<HTMLButtonElement>('#coverage-export')!.addEventListener('click', () => coverage?.download());
if (testMode) {
  coverageOutput.textContent = 'Coverage enabled · separate test saves';
  document.querySelector<HTMLElement>('#launch-note')!.textContent = 'Test mode · separate test profiles';
  attachScenarioRunner(() => ({ input, renderer, coverage, process, audio }));
}
ui.setVolumeHandler(volume => audio?.setVolume(volume));
void checkBrowser().then(() => { ui.message('Ready to race'); ui.setAvailable(true); }).catch(error => {
  ui.message('Browser setup needed'); ui.problem(String(error)); ui.setAvailable(false);
});

function log(message: string) {
  if (/unsupported instruction|unsupported_insn|unresolved guest target|unimplemented import|TRAP in thread|^Renderer:|^Audio:|^\[pool\] game worker \d+:/i.test(message)) faults++;
  console.log(message);
  lines.push(message);
  if (lines.length > 400) lines.splice(0, lines.length - 400);
  output.textContent = lines.join('\n');
  output.scrollTop = output.scrollHeight;
}

function halt() {
  generation++;
  download?.abort(); download = null;
  clearInterval(firstFrame);
  coverage = null;
  input?.detach(); input = null;
  audio?.detach(); audio = null;
  if (pendingAudio && pendingAudio.state !== 'closed') void pendingAudio.close().catch(() => {});
  pendingAudio = null;
  renderer?.detach(); renderer = null;
  process?.terminate(); process = null;
  Reflect.deleteProperty(globalThis, 'underground');
  ui.end();
}
function failure(message: string, error: unknown) {
  log(`${message}: ${error}`); halt(); ui.message(message);
  ui.problem(`${message}. ${String(error)} You can retry; details are in Diagnostics.`);
}

start.addEventListener('click', async () => {
  halt();
  const run = generation;
  lines.length = 0; faults = 0; output.textContent = '';
  ui.begin();
  ui.message('Loading game…');
  try {
    // Create/resume inside the click gesture, before downloading or compiling.
    pendingAudio = new AudioContext({sampleRate:44100,latencyHint:'interactive'});
    void pendingAudio.resume().catch(error => log(`Audio resume: ${error}`));
    const context = pendingAudio;
    download = new AbortController();
    const response = await fetch('/game.wasm', { cache: 'no-store', signal:download.signal });
    if (!response.ok) throw Error(`WebAssembly download: ${response.status}`);
    ui.message('Preparing game…');
    const fingerprint = testMode ? response.clone().arrayBuffer().then(bytes => crypto.subtle.digest('SHA-256',bytes)).then(hash =>
      Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('')) : Promise.resolve('');
    const [module,wasm] = await Promise.all([WebAssembly.compileStreaming(response),fingerprint]);
    const build = { wasm, web: __WEB_BUILD__ };
    if (generation !== run) return;
    ui.message('Starting Underground…');
    const active = await startProcess({ module, pool: 24, poolStart: 8,
      cfg: { args: ['nfsu1', '/data/Speed.exe'], env: {
        NFSU1_SAVEDIR: '/save', NFSU2_RENDERER: 'webgpu', NFSU2_MOVIE_CODEC: 'vp6',
        NFSU2_WIDTH: '800', NFSU2_HEIGHT: '600', TRACE_MAX: '20',
        ...(testMode ? { COVREPORT: '1' } : {}),
      }, dataBase: '/data/', manifestUrl: '/data-manifest', saveDir: testMode ? 'nfsu1-coverage-save' : 'nfsu1-stock-save' },
      onNote: log, onLog: (line, fd, tid) => log(`[${tid}${fd === 2 ? '!' : ''}] ${line}`),
    });
    if (generation !== run) { active.terminate(); return; }
    process = active;
    const debug = {
      process: active, stats: () => renderer?.stats(), key: (code: string, down: boolean) => input?.key(code, down),
      audio: () => audio?.status(), input: () => input?.status(),
      coverage: null as Awaited<ReturnType<typeof attachCoverage>> | null,
      gpuContracts: runGpuContracts,
    };
    Object.assign(globalThis, { underground: debug });
    if (testMode) void attachCoverage(active, () => ({ renderer: renderer?.stats(), audio: audio?.status(), faults }),build).then(handle => {
      if (generation !== run) return;
      coverage = debug.coverage = handle;
      coverageOutput.textContent = 'Recording coverage · use underground.coverage in the console';
    }).catch(error => { if (generation === run) coverageOutput.textContent = `Coverage failed: ${error}`; });
    input = attachInput(active, canvas, { keyboardTarget: canvas, hideCursor: false });
    void attachAudio(active, { log, context, volume:ui.volume(), muteWhenHidden:ui.settings.muteHidden }).then(handle => {
      if (generation !== run) { handle.detach(); return; }
      pendingAudio = null; audio = handle; audio.setVolume(ui.volume());
    }).catch(error => { if (generation === run) failure('Audio failed',error); });
    void attachRenderer(active, canvas, { log, autoSize: false,
      onLost: () => { if (generation === run) failure('Graphics device lost','Reload the page to reconnect to your GPU.'); },
    }).then(handle => {
      if (generation !== run) { handle.detach(); return; }
      renderer = handle;
      firstFrame = window.setInterval(() => {
        if (generation !== run || !renderer?.stats().frames) return;
        clearInterval(firstFrame); ui.message('Running'); ui.ready();
      }, 100);
    }).catch(error => { if (generation === run) failure('Renderer failed',error); });
    const code = await active.exited;
    if (generation === run) { halt(); ui.message(code === 0 ? 'Ready to race' : `Game stopped (exit ${code})`); }
  } catch (error) {
    if (generation === run) failure('Startup failed',error);
  }
});
stop.addEventListener('click', () => { halt(); ui.message('Ready to race'); });
canvas.addEventListener('pointerdown', () => { canvas.focus(); void audio?.resume(); });
window.addEventListener('pagehide', halt);
