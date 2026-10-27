import { startProcess, type GameProcess } from './host/process';
import { attachRenderer, type Renderer } from './gpu/index';
import { attachAudio, type AudioHandle } from './audio/index';
import { attachInput, type InputHandle } from './input/index';

const start = document.querySelector<HTMLButtonElement>('#start')!;
const stop = document.querySelector<HTMLButtonElement>('#stop')!;
const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const status = document.querySelector<HTMLElement>('#status')!;
const output = document.querySelector<HTMLElement>('#log')!;
const lines: string[] = [];
let process: GameProcess | null = null;
let renderer: Renderer | null = null;
let audio: AudioHandle | null = null;
let input: InputHandle | null = null;
let generation = 0;

function log(message: string) {
  console.log(message);
  lines.push(message);
  if (lines.length > 400) lines.splice(0, lines.length - 400);
  output.textContent = lines.join('\n');
  output.scrollTop = output.scrollHeight;
}

function halt() {
  generation++;
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
  lines.length = 0; output.textContent = '';
  status.textContent = 'Compiling WebAssembly…';
  try {
    const module = await WebAssembly.compileStreaming(fetch('/game.wasm', { cache: 'no-store' }));
    if (generation !== run) return;
    status.textContent = 'Starting game…';
    const active = await startProcess({ module, pool: 24, poolStart: 8,
      cfg: { args: ['nfsu1', '/data/Speed.exe'], env: {
        NFSU1_SAVEDIR: '/save', NFSU2_RENDERER: 'webgpu', NFSU2_MOVIE_CODEC: 'vp6',
        NFSU2_WIDTH: '800', NFSU2_HEIGHT: '600', TRACE_MAX: '20',
      }, dataBase: '/data/', manifestUrl: '/data-manifest', saveDir: 'nfsu1-stock-save' },
      onNote: log, onLog: (line, fd, tid) => log(`[${tid}${fd === 2 ? '!' : ''}] ${line}`),
    });
    if (generation !== run) { active.terminate(); return; }
    process = active;
    // Browser smoke tests can inspect the real renderer and host state.
    Object.assign(globalThis, { underground: {
      process: active, stats: () => renderer?.stats(), key: (code: string, down: boolean) => input?.key(code, down),
      audio: () => audio?.status(), input: () => input?.status(),
    }});
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
