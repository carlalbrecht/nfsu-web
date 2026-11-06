export interface Settings { scaling: 'smooth' | 'pixelated'; fullscreen: boolean; volume: number; muteHidden: boolean }
const key = 'nfsu1-launcher-v1';
export function readSettings(): Settings {
  const defaults = { scaling:'smooth' as const, fullscreen:true, volume:100, muteHidden:true };
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? '{}');
    return {
      scaling: value.scaling === 'pixelated' ? 'pixelated' : 'smooth',
      fullscreen: typeof value.fullscreen === 'boolean' ? value.fullscreen : defaults.fullscreen,
      volume: typeof value.volume === 'number' && Number.isFinite(value.volume) ? Math.max(0,Math.min(100,value.volume)) : defaults.volume,
      muteHidden: typeof value.muteHidden === 'boolean' ? value.muteHidden : defaults.muteHidden,
    };
  } catch { return defaults; }
}
export function saveSettings(settings: Settings): void {
  try { localStorage.setItem(key, JSON.stringify(settings)); } catch { /* Settings still work for this page. */ }
}
