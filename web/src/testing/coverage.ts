import type { GameProcess } from '../host/process';
import { HostKind } from '../host/abi';

interface Manifest {
  schema: number; generation: string; profile: unknown; denominator: string;
  functions: number[]; blocks: number[]; trapSites: number[];
  uninstrumentedFunctions?: number[]; comMapping?: number;
  imports: { dll: string; name: string }[];
  com: { interface: number; name: string; methods: string[] }[];
}
interface Check { name: string; passed: boolean; evidence: string }
interface Sample { functions: number[]; blocks: number[]; imports: number[]; com: number[]; failures: number[] }
interface Scenario { name: string; started: string; ended: string; functions: number[]; blocks: number[];
  imports: string[]; com: string[]; checks: Check[]; verified: boolean; diagnostics: unknown }
interface Diagnostics { renderer?: { errors: number }; audio?: unknown; faults: number }

/** Counters are cumulative and never reset under running guest threads. The
 * snapshot is observational (not a stop-the-world save state). Uint32 deltas
 * also handle a wrapping counter; a complete 2^32 wrap during one scenario is
 * not distinguishable from no calls. Heap-generated x86 is outside this map. */
export async function attachCoverage(process: GameProcess, diagnostics: () => Diagnostics, build: { wasm: string; web: string }) {
  const [registration, manifest] = await Promise.all([
    process.registered(HostKind.Coverage), fetch('/coverage.json').then(r => {
      if (!r.ok) throw Error('Coverage manifest unavailable'); return r.json() as Promise<Manifest>;
    }),
  ]);
  const header = new Uint32Array(process.memory.buffer, registration.ptr, 9).slice();
  if (registration.size !== 36 || header[0] !== 1 || manifest.schema !== 1) throw Error('Coverage ABI mismatch');
  const base = header[1], size = header[2];
  for (const address of [...manifest.functions, ...manifest.blocks])
    if (address < base || address >= base+size) throw Error('Coverage address outside executable');
  const comNames = manifest.com.flatMap(i => i.methods.map((name, slot) => ({ name: `${i.name}::${name}`, index: i.interface*128+slot })));
  const sample = (): Sample => {
    const words = new Uint32Array(process.memory.buffer);
    const counts = (ptr: number, addresses: number[]) => addresses.map(address => Atomics.load(words, (ptr>>>2)+address-base));
    return { functions: counts(header[3], manifest.functions), blocks: counts(header[4], manifest.blocks),
      imports: manifest.imports.map((_, i) => Atomics.load(words, (header[5]>>>2)+i*2)),
      failures: manifest.imports.map((_, i) => Atomics.load(words, (header[5]>>>2)+i*2+1)),
      // Low 32 bits are sufficient for deltas; the runtime stores uint64s.
      com: comNames.map(m => Atomics.load(words, (header[6]>>>2)+m.index*2)),
    };
  };
  let pending: { name: string; started: string; sample: Sample; diagnostics: Diagnostics } | null = null;
  const scenarios: Scenario[] = [];
  const manipulations: { at: string; scenario: string | null; change: unknown }[] = [];
  const selected = <T>(keys: T[], values: number[], before?: number[]) => keys.filter((_, i) => before ? values[i] !== before[i] : values[i] !== 0);
  const sound = () => {
    const d = new DataView(process.memory.buffer);
    return [15,16].map(i => ({ interface: i === 15 ? 'IDirectSound' : 'IDirectSoundBuffer',
      created: Number(d.getBigUint64(header[7]+i*8, true)), destroyed: Number(d.getBigUint64(header[8]+i*8, true)) }));
  };
  const summary = () => {
    const s = sample();
    return { functions: { hit: s.functions.filter(Boolean).length, discovered: manifest.functions.length+(manifest.uninstrumentedFunctions?.length ?? 0), instrumented: manifest.functions.length },
      blocks: { hit: s.blocks.filter(Boolean).length, discovered: manifest.blocks.length },
      imports: { hit: s.imports.filter(Boolean).length, available: manifest.imports.length },
      checkedScenarios: scenarios.filter(s => s.verified).length, scenarios: scenarios.length, sound: sound() };
  };
  return {
    summary,
    recordManipulation(change: unknown) { manipulations.push({ at: new Date().toISOString(), scenario: pending?.name ?? null, change }); },
    begin(name: string) {
      if (pending) throw Error(`Finish scenario ${pending.name} first`);
      if (typeof name !== 'string' || !name.trim()) throw Error('Scenario needs a name');
      pending = { name, started: new Date().toISOString(), sample: sample(), diagnostics: diagnostics() };
      return summary();
    },
    end(checks: Check[] = []) {
      if (!pending) throw Error('No scenario is running');
      if (!Array.isArray(checks) || checks.some(c => !c || typeof c.passed !== 'boolean' || typeof c.name !== 'string' || !c.name.trim() || typeof c.evidence !== 'string' || !c.evidence.trim())) throw Error('Each check needs a name, boolean outcome and evidence');
      const s = sample(), before = pending.sample;
      const runtime = diagnostics(), clean = runtime.faults === pending.diagnostics.faults
        && (runtime.renderer?.errors ?? 0) === (pending.diagnostics.renderer?.errors ?? 0);
      const result: Scenario = { name: pending.name, started: pending.started, ended: new Date().toISOString(),
        functions: selected(manifest.functions, s.functions, before.functions), blocks: selected(manifest.blocks, s.blocks, before.blocks),
        imports: selected(manifest.imports.map(i => `${i.dll}!${i.name}`), s.imports, before.imports),
        com: selected(comNames.map(m => m.name), s.com, before.com), checks,
        verified: checks.length > 0 && checks.every(c => c.passed) && clean && s.failures.every((v,i) => v === before.failures[i]),
        diagnostics: { runtime, sound: sound() } };
      scenarios.push(result); pending = null; return { ...result, functions: result.functions.length, blocks: result.blocks.length };
    },
    report() {
      const s = sample();
      return { schema: 1, generation: manifest.generation, profile: manifest.profile, denominator: manifest.denominator, build, comMapping: manifest.comMapping,
        captured: new Date().toISOString(), browser: navigator.userAgent, summary: summary(),
        executedFunctions: selected(manifest.functions, s.functions), executedBlocks: selected(manifest.blocks, s.blocks),
        unimplementedImports: selected(manifest.imports.map(i => `${i.dll}!${i.name}`), s.failures),
        scenarios, manipulations, pending: pending?.name ?? null };
    },
    download() {
      const blob = new Blob([JSON.stringify(this.report(), null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = `nfsu1-coverage-${Date.now()}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
  };
}
