import { startProcess, type GameProcess } from './host/process';
import { attachRenderer, type Renderer } from './gpu/index';
import { attachAudio, type AudioHandle } from './audio/index';
import { attachInput, type InputHandle } from './input/index';
import { attachCoverage } from './testing/coverage';
import { runGpuContracts } from './testing/gpu-contract';
import { attachScenarioRunner } from './testing/runner';

const start = document.querySelector<HTMLButtonElement>('#start')!;
const stop = document.querySelector<HTMLButtonElement>('#stop')!;
const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const status = document.querySelector<HTMLElement>('#status')!;
const output = document.querySelector<HTMLElement>('#log')!;
const lines: string[] = [];
declare const __WEB_BUILD__: string;
let faults = 0;
let process: GameProcess | null = null;
let renderer: Renderer | null = null;
let audio: AudioHandle | null = null;
let input: InputHandle | null = null;
let generation = 0;
const testMode = new URLSearchParams(location.search).has('test');
const coverageOutput = document.querySelector<HTMLElement>('#coverage-status')!;
let coverage: Awaited<ReturnType<typeof attachCoverage>> | null = null;
document.querySelector<HTMLButtonElement>('#coverage-export')!.addEventListener('click', () => coverage?.download());
if (testMode) coverageOutput.textContent = 'Coverage enabled · separate test saves';
if (testMode) attachScenarioRunner(() => ({ input, renderer, coverage, process, audio }));

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
  coverage = null;
  input?.detach(); input = null;
  audio?.detach(); audio = null;
  renderer?.detach(); renderer = null;
  process?.terminate(); process = null;
  Reflect.deleteProperty(globalThis, 'underground');
  stop.disabled = true; start.disabled = false;
}

start.addEventListener('click', async () => {
  halt();
  const run = generation;
  start.disabled = true; stop.disabled = false;
  lines.length = 0; faults = 0; output.textContent = '';
  status.textContent = 'Compiling WebAssembly…';
  try {
    const response = await fetch('/game.wasm', { cache: 'no-store' });
    if (!response.ok) throw Error(`WebAssembly download: ${response.status}`);
    const fingerprint = testMode ? response.clone().arrayBuffer().then(bytes => crypto.subtle.digest('SHA-256',bytes)).then(hash =>
      Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('')) : Promise.resolve('');
    const module = await WebAssembly.compileStreaming(response);
    const build = { wasm: await fingerprint, web: __WEB_BUILD__ };
    if (generation !== run) return;
    status.textContent = 'Starting game…';
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
    // Browser smoke tests can inspect the real renderer and host state.
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
    }).catch(error => { coverageOutput.textContent = `Coverage failed: ${error}`; });
    input = attachInput(active, canvas, { keyboardTarget: canvas, hideCursor: false });
    void attachAudio(active, { log }).then(handle => {
      if (generation !== run) { handle.detach(); return; }
      audio = handle;
    }).catch(error => log(`Audio: ${error}`));
    void attachRenderer(active, canvas, { log, autoSize: false }).then(handle => {
      if (generation !== run) { handle.detach(); return; }
      renderer = handle; status.textContent = 'Running'; canvas.focus();
    }).catch(error => { log(`Renderer: ${error}`); if (generation === run) status.textContent = 'Rendering failed'; });
    const code = await active.exited;
    if (generation === run) { halt(); status.textContent = `Game stopped (exit ${code})`; }
  } catch (error) {
    if (generation === run) { log(String(error)); halt(); status.textContent = 'Startup failed'; }
  }
});
stop.addEventListener('click', () => { halt(); status.textContent = 'Stopped'; });
canvas.addEventListener('pointerdown', () => { canvas.focus(); void audio?.resume(); });
window.addEventListener('pagehide', halt);
