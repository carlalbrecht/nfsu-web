import type { InputHandle } from '../input/index';
import type { Renderer } from '../gpu/index';
import type { attachCoverage } from './coverage';
import { runGpuContracts } from './gpu-contract';
import type { GameProcess } from '../host/process';
import { gameState, changeGameState } from './game-state';
import { sampleFrames } from './frame-sample';
import { runShaderContracts } from './shader-contract';
import { sampleScene } from './scene-sample';
import type { AudioHandle } from '../audio/index';
import { runInputSequence } from './input-sequence';

type Coverage = Awaited<ReturnType<typeof attachCoverage>>;
interface Handles { input: InputHandle | null; renderer: Renderer | null; coverage: Coverage | null; process: GameProcess | null; audio: AudioHandle | null }
const pause = (ms: number) => new Promise<void>(resolve => setTimeout(resolve,ms));

/** Explicit, bounded commands, usable through the page UI by any browser
 * driver. No eval, downloaded scripts, or arbitrary guest function calls. */
export function attachScenarioRunner(handles: () => Handles) {
  const panel = document.querySelector<HTMLElement>('#test-runner')!;
  const command = document.querySelector<HTMLTextAreaElement>('#test-command')!;
  const result = document.querySelector<HTMLElement>('#test-result')!;
  const button = document.querySelector<HTMLButtonElement>('#test-run')!;
  panel.hidden = false;
  button.addEventListener('click', async () => {
    button.disabled = true; result.textContent = 'Running';
    const h = handles();
    try {
      const request = JSON.parse(command.value);
      let output: unknown;
      switch (request.action) {
        case 'summary': output = { coverage: h.coverage?.summary(), renderer: h.renderer?.stats(), input: h.input?.status(), audio: h.audio?.status() }; break;
        case 'report':
          if (!h.coverage) throw Error('Coverage is not ready');
          output = h.coverage.report(); break;
        case 'gpu-contracts': output = await runGpuContracts(); break;
        case 'shader-contracts': output = await runShaderContracts(); break;
        case 'gpu-inspect':
          if (!h.renderer) throw Error('Renderer is not ready');
          output = await h.renderer.inspect(); break;
        case 'frame-sample':
          if (!h.renderer) throw Error('Renderer is not ready');
          output = await sampleFrames(h.renderer,request.count); break;
        case 'scene-sample':
          if (!h.renderer || !h.process) throw Error('Game is not ready');
          output = await sampleScene(h.process,h.renderer,request.duration,request.gpu === true); break;
        case 'begin': case 'end':
          if (!h.coverage) throw Error('Coverage is not ready');
          output = request.action === 'begin' ? h.coverage.begin(request.name) : h.coverage.end(request.checks); break;
        case 'state':
          if (!h.process) throw Error('Game is not ready');
          output = gameState(h.process); break;
        case 'set':
          if (!h.process || !h.coverage) throw Error('Test controls are not ready');
          output = changeGameState(h.process, request.setting, request.value);
          h.coverage.recordManipulation(output); break;
        case 'sequence':
          if (!h.input) throw Error('Input is not ready');
          output = await runInputSequence(h.input, request.steps); break;
        case 'press': {
          if (!h.input) throw Error('Input is not ready');
          const keys: string[] = request.keys ?? [request.code];
          const ms = request.ms ?? 200, gap = request.gap ?? 250;
          if (!Array.isArray(keys) || !keys.length || keys.length > 30 || keys.some(k=>typeof k!=='string')
              || !Number.isFinite(ms) || ms<50 || ms>10000 || !Number.isFinite(gap) || gap<0 || gap>2000
              || keys.length*(ms+gap)>30000) throw Error('Key sequence exceeds test limits');
          h.input.testFocus(true);
          for (const key of keys) { h.input.key(key,true); await pause(ms); h.input.key(key,false); await pause(gap); }
          output = { keys, input: h.input.status() }; break;
        }
        case 'text': {
          if (!h.input || typeof request.text !== 'string' || request.text.length>64) throw Error('Expected at most 64 text characters');
          h.input.testFocus(true); h.input.text(Array.from(request.text, (c: string)=>c.charCodeAt(0)));
          output = { typed: request.text.length }; break;
        }
        case 'focus': h.input?.testFocus(request.active === true); output = { active: request.active === true }; break;
        default: throw Error('Unknown action. Use summary, report, state, set, gpu-contracts, shader-contracts, gpu-inspect, frame-sample, scene-sample, begin, end, press, sequence, text or focus.');
      }
      // Large address inventories stay compact; pretty-printing tens of
      // thousands of lines can stall the browser's layout/accessibility tree.
      result.textContent = JSON.stringify({ ok: true, output },null,['report','gpu-inspect','scene-sample'].includes(request.action) ? undefined : 2);
    } catch (error) { result.textContent = JSON.stringify({ ok:false, error:String(error) },null,2); }
    finally { button.disabled = false; }
  });
}
