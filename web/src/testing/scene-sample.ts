import type { GameProcess } from '../host/process';
import type { Renderer } from '../gpu/index';
import { gameState } from './game-state';

/** Bounded, read-only samples. No keys or game-data writes while collecting. */
export async function sampleScene(process: GameProcess, renderer: Renderer, duration = 10000, gpu = false) {
  if (!Number.isInteger(duration) || duration < 1000 || duration > 30000)
    throw Error('Scene sample duration must be 1000–30000 ms');
  const start = performance.now();
  const samples: unknown[] = [];
  const shaders: Record<string,string> = {};
  do {
    const ms = performance.now()-start;
    const state = gameState(process);
    let groups: unknown[] | undefined;
    if (gpu) {
      const frame = await renderer.inspect() as { shaders: Record<string,string>; draws: Record<string,unknown>[] };
      Object.assign(shaders,frame.shaders);
      const unique = new Map<string,{state:unknown;draws:number}>();
      for (const d of frame.draws) {
        if (!(Number(d.vs)>0)) continue;
        const state = {vs:d.vs,ps:d.ps,blend:d.blend,alphaRef:d.alphaRef,blendColor:d.blendColor,c79:d.c79};
        const key = JSON.stringify(state), entry = unique.get(key) ?? {state,draws:0};
        entry.draws++; unique.set(key,entry);
      }
      groups = Array.from(unique.values());
    }
    samples.push({ms,state,...(groups ? {groups} : {})});
    await new Promise<void>(resolve=>setTimeout(resolve,gpu ? 200 : 100));
  } while (performance.now()-start<duration);
  samples.push({ms:performance.now()-start,state:gameState(process)});
  return {samples,...(gpu ? {shaders} : {})};
}
