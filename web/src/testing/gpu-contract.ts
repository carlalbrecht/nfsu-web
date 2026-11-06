/** Small readback regressions against the actual encoder and browser GPU. */
import { Encoder } from '../gpu/encoder';
import { C, D, F, Kind, Op, DRAW_WORDS, CTL_BYTES, TF_RT, TF_CUBE, Fmt } from '../gpu/proto';

export async function runGpuContracts() {
  const adapter = await navigator.gpu?.requestAdapter();
  if (!adapter) throw Error('WebGPU adapter unavailable');
  const device = await adapter.requestDevice();
  const errors: string[] = [];
  device.addEventListener('uncapturederror', e => errors.push(e.error.message));
  const memory = new WebAssembly.Memory({ initial: 4, maximum: 4, shared: true });
  const words = new Uint32Array(memory.buffer), floats = new Float32Array(memory.buffer);
  words[C.size] = CTL_BYTES;
  words[C.rqPtr] = 1024; words[C.rqCap] = 1024;
  const frame = C.frame, draws = 2048/4;
  words[frame+F.draws] = draws*4; words[frame+F.bbW] = 2; words[frame+F.bbH] = 2;
  const encoder = new Encoder(device, memory, 0, line => { if (line.includes('[gpu] WGSL ')) errors.push(line); }, true);
  // A two-by-two ARGB render texture is enough to verify load/clear semantics.
  words.set([Op.TexCreate,32,1,2,2,1,Fmt.A8R8G8B8,TF_RT],1024/4);
  words.set([Op.TexCreate,32,2,2,2,1,Fmt.A8R8G8B8,TF_RT|TF_CUBE],1056/4);
  encoder.drain(64);
  const checks: { name: string; passed: boolean; pixel: number[]; expected: number[] }[] = [];
  async function check(name: string, clears: { flags: number; colour: number; target?: number }[], expected: number[], face?: number) {
    words[frame+F.dn] = clears.length;
    for (const [i, clear] of clears.entries()) {
      const w = draws+i*DRAW_WORDS; words.fill(0,w,w+DRAW_WORDS);
      words[w+D.kind] = Kind.Clear; words[w+D.target] = clear.target ?? 1;
      words[w+D.depth] = 2<<8; words[w+D.clrFlags] = clear.flags;
      words[w+D.clrArgb] = clear.colour; floats[w+D.clrZ] = 1;
    }
    const command = device.createCommandEncoder();
    encoder.encodeFrame(0,command);
    const texture = face === undefined ? encoder.readable(command,1) : encoder.snapshot(command,2,face)?.tex;
    if (!texture) throw Error('Test render target missing');
    const read = device.createBuffer({ size: 512, usage: GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ });
    command.copyTextureToBuffer({ texture },{ buffer: read, bytesPerRow: 256 },[2,2]);
    device.queue.submit([command.finish()]); encoder.afterSubmit();
    await read.mapAsync(GPUMapMode.READ);
    const pixel = [...new Uint8Array(read.getMappedRange()).slice(0,4)]; // BGRA
    read.unmap(); read.destroy();
    checks.push({ name, pixel, expected, passed: pixel.every((v,i)=>v===expected[i]) });
  }
  try {
    await check('second colour clear replaces first on the same target',[
      { flags:3,colour:0xffff0000 },{ flags:1,colour:0xff0000ff }],[255,0,0,255]);
    await check('depth-only clear preserves colour',[
      { flags:3,colour:0xffff0000 },{ flags:2,colour:0xff00ff00 }],[0,0,255,255]);
    await check('target content survives a later frame without colour clear',[
      { flags:2,colour:0xff000000 }],[0,0,255,255]);
    await check('render texture clear preserves its alpha byte',[
      { flags:1,colour:0x4000ff00 }],[0,255,0,64]);
    const colours = [0xffff0000,0xff00ff00,0xff0000ff,0xffffff00,0xffff00ff,0xff00ffff];
    for (let face=0;face<6;face++) {
      const c=colours[face];
      await check(`cube face ${face} survives writes to every other face`,face === 0
        ? colours.map((colour,f)=>({ flags:3,colour,target:2|((f+1)<<16) })) : [],
        [c&255,(c>>>8)&255,(c>>>16)&255,255],face);
    }
    await device.queue.onSubmittedWorkDone();
    return { passed: !errors.length && checks.every(c=>c.passed), checks, errors };
  } finally { device.destroy(); }
}
