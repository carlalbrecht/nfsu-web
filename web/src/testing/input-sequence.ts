import type { InputHandle } from '../input/index';

interface Step { keys: string[]; ms: number }

/** Bounded overlapping controls for driving tests, using the real input bridge.
 * Releases held keys even if a test is interrupted by an input error. */
export async function runInputSequence(input: InputHandle, steps: unknown) {
  if (!Array.isArray(steps) || !steps.length || steps.length > 30)
    throw Error('Expected 1–30 input steps');
  let duration = 0;
  for (const step of steps) {
    if (!step || !Array.isArray(step.keys) || step.keys.length > 6
        || step.keys.some((key: unknown) => typeof key !== 'string')
        || !Number.isFinite(step.ms) || step.ms < 50 || step.ms > 10000)
      throw Error('Each step needs up to six keys and 50–10000 ms');
    duration += step.ms;
  }
  if (duration > 30000) throw Error('Input sequence exceeds 30 seconds');
  const held = new Set<string>();
  input.testFocus(true);
  try {
    for (const step of steps as Step[]) {
      const next = new Set(step.keys);
      for (const key of held) if (!next.has(key)) { input.key(key, false); held.delete(key); }
      for (const key of next) if (!held.has(key)) { input.key(key, true); held.add(key); }
      await new Promise<void>(resolve => setTimeout(resolve, step.ms));
    }
  } finally {
    for (const key of held) input.key(key, false);
  }
  return { steps, duration, input: input.status() };
}
