import { canFullscreen, enterFullscreen, exitFullscreen } from '../app/display';
import { readSettings, saveSettings } from './settings';
import './style.css';

const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
export function createLauncher() {
  const settings = readSettings();
  const stage = get<HTMLElement>('stage'), launcher = get<HTMLElement>('launcher');
  const loading = get<HTMLElement>('loading'), status = get<HTMLElement>('status');
  const start = get<HTMLButtonElement>('start'), stop = get<HTMLButtonElement>('stop');
  const canvas = get<HTMLCanvasElement>('game');
  const scaling = get<HTMLSelectElement>('scaling'), fullscreen = get<HTMLInputElement>('fullscreen');
  const volume = get<HTMLInputElement>('volume'), muteHidden = get<HTMLInputElement>('mute-hidden');
  const mute = get<HTMLButtonElement>('game-mute'), full = get<HTMLButtonElement>('game-fullscreen');
  const diagnostics = get<HTMLElement>('diagnostics'), diagnosticsToggle = get<HTMLButtonElement>('diagnostics-toggle');
  const gameDiagnostics = get<HTMLButtonElement>('game-diagnostics');
  const problem = get<HTMLElement>('problem');
  let active = false, muted = false, toolbarTimer = 0;
  let onVolume = (_volume: number) => {};
  scaling.value = settings.scaling; fullscreen.checked = settings.fullscreen;
  volume.value = String(settings.volume); muteHidden.checked = settings.muteHidden;
  get<HTMLOutputElement>('volume-value').value = `${settings.volume}%`;
  const hasFullscreen = canFullscreen();
  fullscreen.disabled = !hasFullscreen; full.hidden = !hasFullscreen;
  if (!hasFullscreen) fullscreen.checked = false;
  function persist() {
    settings.scaling = scaling.value === 'pixelated' ? 'pixelated' : 'smooth'; settings.fullscreen = fullscreen.checked;
    settings.volume = Number(volume.value); settings.muteHidden = muteHidden.checked;
    get<HTMLOutputElement>('volume-value').value = `${settings.volume}%`;
    saveSettings(settings);
  }
  scaling.addEventListener('change', persist); fullscreen.addEventListener('change', persist);
  volume.addEventListener('input', persist); muteHidden.addEventListener('change', persist);
  diagnosticsToggle.addEventListener('click', () => {
    diagnostics.hidden = !diagnostics.hidden;
    diagnosticsToggle.setAttribute('aria-expanded', String(!diagnostics.hidden));
    if (!diagnostics.hidden) diagnostics.scrollIntoView({block:'nearest'});
  });
  gameDiagnostics.addEventListener('click', () => {
    diagnostics.hidden = !diagnostics.hidden;
    gameDiagnostics.setAttribute('aria-expanded', String(!diagnostics.hidden));
    if (diagnostics.hidden) canvas.focus();
    else { clearTimeout(toolbarTimer); stage.classList.add('show-tools'); }
  });
  function showTools() {
    clearTimeout(toolbarTimer); stage.classList.add('show-tools');
    toolbarTimer = window.setTimeout(() => stage.classList.remove('show-tools'), 4500);
  }
  async function fullScreen() {
    if (document.fullscreenElement) { exitFullscreen(); return; }
    const result = await enterFullscreen(stage);
    // Fullscreen can finish after Stop was pressed; don't retain a hidden stage.
    if (!active) { exitFullscreen(); return; }
    get<HTMLElement>('stage-note').textContent = result.ok
      ? (result.locked ? 'F8 · controls   /   hold Esc · leave full screen' : 'F8 · controls   /   Esc · leave full screen')
      : 'Full screen unavailable · playing in this window';
    canvas.focus(); showTools();
  }
  full.addEventListener('click', () => void fullScreen());
  document.addEventListener('fullscreenchange', () => {
    full.textContent = document.fullscreenElement ? 'Windowed' : 'Full screen';
    if (!document.fullscreenElement) get<HTMLElement>('stage-note').textContent = 'F8 · show controls';
    if (active) { canvas.focus(); showTools(); }
  });
  mute.addEventListener('click', () => {
    muted = !muted; mute.setAttribute('aria-pressed',String(muted)); mute.textContent = muted ? 'Unmute' : 'Mute';
    onVolume(muted ? 0 : settings.volume / 100); canvas.focus(); showTools();
  });
  window.addEventListener('keydown', event => {
    if (!active || event.code !== 'F8') return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (event.repeat) return;
    diagnostics.hidden = true; gameDiagnostics.setAttribute('aria-expanded','false');
    clearTimeout(toolbarTimer);
    const showing = stage.classList.toggle('show-tools');
    if (showing) mute.focus(); else canvas.focus();
  }, true);
  return {
    start, stop, canvas, settings,
    setVolumeHandler(handler: (volume: number) => void) { onVolume = handler; },
    volume: () => muted ? 0 : settings.volume / 100,
    message(text: string) { status.textContent = text; get<HTMLElement>('loading-status').textContent = text; },
    problem(text: string) { problem.textContent = text; problem.hidden = !text; },
    setAvailable(available: boolean) { start.disabled = !available; },
    begin() {
      persist(); active = true; muted = false; problem.hidden = true;
      mute.textContent = 'Mute'; mute.setAttribute('aria-pressed','false');
      get<HTMLElement>('stage-note').textContent = 'F8 · show controls';
      launcher.inert = true;
      diagnostics.hidden = true; diagnostics.classList.add('game-diagnostics'); stage.append(diagnostics);
      diagnosticsToggle.setAttribute('aria-expanded','false'); gameDiagnostics.setAttribute('aria-expanded','false');
      stage.hidden = false; loading.hidden = false; start.disabled = true; stop.disabled = false;
      document.body.classList.add('playing');
      canvas.width = 800; canvas.height = 600;
      canvas.style.imageRendering = settings.scaling === 'pixelated' ? 'pixelated' : 'auto';
      canvas.focus();
      stage.classList.add('show-tools');
      if (fullscreen.checked) void fullScreen();

    },
    ready() { loading.hidden = true; canvas.focus(); showTools(); },
    end() {
      active = false; clearTimeout(toolbarTimer); exitFullscreen();
      stage.hidden = true; launcher.inert = false;
      diagnostics.hidden = true; diagnostics.classList.remove('game-diagnostics'); document.body.append(diagnostics);
      document.body.classList.remove('playing'); stop.disabled = true; start.disabled = false; start.focus();
    },
  };
}

export async function checkBrowser(): Promise<void> {
  if (!crossOriginIsolated || typeof SharedArrayBuffer === 'undefined') throw Error('This page needs cross-origin isolation. Start it with web/start.sh and use the local server URL.');
  if (!navigator.gpu) throw Error('WebGPU is unavailable. Use a current desktop Chrome with graphics acceleration enabled.');
  if (!navigator.storage?.getDirectory) throw Error('This browser cannot store game profiles. Use a regular Chrome window.');
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw Error('No WebGPU adapter is available. Check the browser’s graphics acceleration setting.');
  await navigator.storage.getDirectory();
}
