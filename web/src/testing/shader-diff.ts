import { KWIN_SIZE } from '../gpu/shader-abi';

// ---- differential test: the WGSL vertex function vs the CPU interpreter ----
// vs_<id>.vec comes from web/tools/wgsl-xl --pairs (vs_run on the same bytes
// and constants).  The vertex entry point becomes a plain function called by
// a compute shader that stores the 29 VOut floats per vertex.
export interface DiffResult { modules: number; vertices: number; components: number; bad: number; maxRel: number; worst: string;
  /** pixel shaders: alpha-test decisions that differ only because alpha is within the tolerance of aref */
  edgeFlips?: number }
export async function vsDiff(device: GPUDevice, name: string, code: string, vec: ArrayBuffer, res: DiffResult, failures: string[]) {
  const u = new Uint32Array(vec, 0, 4);
  if (u[0] !== 0x31565356) { failures.push(`${name}.vec: bad magic`); return; }
  const nv = u[1], stride = u[2];
  const vbBytes = new Uint8Array(vec, 16, nv * stride);
  const consts = new Float32Array(vec, 16 + nv * stride, 1024);
  const want = new Float32Array(vec, 16 + nv * stride + 4096, nv * 29);
  const head = code.match(/@vertex fn (vs_\d+)\(@builtin\(vertex_index\) vid: u32, @builtin\(instance_index\) iid: u32\) -> VOut \{/);
  if (!head) { failures.push(`${name}: no vertex entry point`); return; }
  // the draw's K block at row KB of the window, as the renderer passes it in firstInstance
  const KB = 37;
  const cs = code.replace(head[0], 'fn vsfn(vid: u32, iid: u32) -> VOut {') + `
@group(0) @binding(3) var<storage, read_write> OUTV: array<f32>;
@compute @workgroup_size(64) fn cs(@builtin(global_invocation_id) g: vec3u) {
  if (g.x >= arrayLength(&OUTV) / 29u) { return; }
  let o = vsfn(g.x, ${KB}u);
  let b = g.x * 29u;
  for (var c = 0u; c < 4u; c++) {
    OUTV[b + c] = o.pos[c]; OUTV[b + 4u + c] = o.col0[c]; OUTV[b + 8u + c] = o.col1[c];
    OUTV[b + 12u + c] = o.uv0[c]; OUTV[b + 16u + c] = o.uv1[c]; OUTV[b + 20u + c] = o.uv2[c]; OUTV[b + 24u + c] = o.uv3[c];
  }
  OUTV[b + 28u] = o.fog;
}`;
  const module = device.createShaderModule({ code: cs, label: name + '.cs' });
  const ci = await module.getCompilationInfo();
  const errs = ci.messages.filter(m => m.type === 'error');
  if (errs.length) { failures.push(`${name} (compute twin): ${errs.map(m => m.message).join('; ')}`); return; }
  const pipe = await device.createComputePipelineAsync({ layout: 'auto', compute: { module } });
  const vbSize = Math.max(16, (vbBytes.length + 3) & ~3);
  const vb = device.createBuffer({ size: vbSize, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
  const vbCopy = new Uint8Array(vbSize); vbCopy.set(vbBytes);
  device.queue.writeBuffer(vb, 0, vbCopy);
  // a 64 KB window (KWIN_SIZE) with the block at row KB; the rows around it hold other values,
  // so a shader that read outside its block would differ from the CPU
  const k = new ArrayBuffer(KWIN_SIZE);
  new Float32Array(k).fill(-7.25);
  new Uint32Array(k, KB * 16, 4).set([stride, 0x03020100, 0, 0]);    // tsel: stage k reads oTk
  new Float32Array(k, KB * 16 + 16, 1024).set(consts);
  const kb = device.createBuffer({ size: KWIN_SIZE, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  device.queue.writeBuffer(kb, 0, k);
  const out = device.createBuffer({ size: nv * 29 * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
  const rd = device.createBuffer({ size: nv * 29 * 4, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
  const bg = device.createBindGroup({ layout: pipe.getBindGroupLayout(0), entries: [
    { binding: 0, resource: { buffer: vb } }, { binding: 1, resource: { buffer: kb } }, { binding: 3, resource: { buffer: out } }] });
  const enc = device.createCommandEncoder();
  const pass = enc.beginComputePass(); pass.setPipeline(pipe); pass.setBindGroup(0, bg); pass.dispatchWorkgroups(Math.ceil(nv / 64)); pass.end();
  enc.copyBufferToBuffer(out, 0, rd, 0, nv * 29 * 4);
  device.queue.submit([enc.finish()]);
  await rd.mapAsync(GPUMapMode.READ);
  const got = new Float32Array(rd.getMappedRange().slice(0)); rd.unmap();
  vb.destroy(); kb.destroy(); out.destroy(); rd.destroy();
  const FIELD = ['pos', 'col0', 'col1', 'uv0', 'uv1', 'uv2', 'uv3'];
  let bad = 0;
  for (let i = 0; i < nv * 29; i++) {
    const g = got[i], w = want[i];
    res.components++;
    if (g === w || (Number.isNaN(g) && Number.isNaN(w))) continue;
    const rel = Math.abs(g - w) / Math.max(1, Math.abs(w));
    if (rel > res.maxRel) { res.maxRel = rel; res.worst = `${name} v${Math.floor(i / 29)} ${i % 29 === 28 ? 'fog' : FIELD[Math.floor((i % 29) / 4)] + '.' + 'xyzw'[i % 29 % 4]}: gpu ${g} cpu ${w}`; }
    if (!(rel <= 1e-4)) {
      bad++;
      if (bad <= 3) failures.push(`${name} vertex ${Math.floor(i / 29)} out ${i % 29}: gpu ${g} cpu ${w}`);
    }
  }
  res.modules++; res.vertices += nv; res.bad += bad;
}
