import type { GameProcess } from '../host/process';

// Addresses are for the SHA-256 pinned stock executable in
// profiles/underground1.json. The loader verifies that hash before starting.
// These are data changes only, enabled exclusively by the ?test page.
export function gameState(process: GameProcess) {
  const m = new DataView(process.memory.buffer);
  // mem_load_pe maps sections; DOS/PE headers are deliberately not mapped.
  if (m.getUint32(0x42e230,true) !== 0x83ec8b55 || m.getUint32(0x4ab510,true) !== 0xfa83c033)
    throw Error('Test controls require the pinned Underground executable');
  const u32 = (p: number) => m.getUint32(p,true);
  return { flow: u32(0x77a920), players: u32(0x78a320), player: u32(0x7361bc),
    race: u32(0x73619c), coordinator: u32(0x7361f0),
    unlocks: m.getUint8(0x735ec1), debugMenu: u32(0x6c56e4) === 0,
    speed: m.getFloat32(0x6b7994,true),
    // PrepareRealTimestep (585b40), AdvanceRealTime (585d70) and
    // AdvanceSimulationTime (585e00). Both cumulative clocks use 4000 Hz;
    // simulation time advances by the dt passed to the race update (420b40).
    timing: { realTicks: u32(0x73ad3c), simulationTicks: u32(0x73ad34),
      frames: u32(0x734574), simulationFrames: u32(0x6f08a4),
      realStep: m.getFloat32(0x73ad38,true), simulationStep: m.getFloat32(0x73457c,true),
      real60HzTicks: u32(0x6f0888), simulation60HzTicks: u32(0x6f08a0) } };
}

export function changeGameState(process: GameProcess, setting: string, value: unknown) {
  const before = gameState(process), m = new DataView(process.memory.buffer);
  switch (setting) {
    case 'unlocks':
      if (typeof value !== 'boolean' || ![0,1].includes(before.unlocks)) throw Error('Expected an unlock boolean');
      m.setUint8(0x735ec1, value ? 1 : 0); break;
    case 'debug-menu': {
      const word = m.getUint32(0x6c56e4,true);
      if (typeof value !== 'boolean' || ![0,0x75626544].includes(word)) throw Error('Unexpected debug-menu string');
      m.setUint32(0x6c56e4,value ? 0 : 0x75626544,true); break;
    }
    case 'speed':
      if (typeof value !== 'number' || ![1,2,4].includes(value)) throw Error('Test speed must be 1, 2 or 4');
      m.setFloat32(0x6b7994,value,true); break;
    default: throw Error('Allowed settings: unlocks, debug-menu, speed');
  }
  return { setting, value, before, after: gameState(process) };
}
