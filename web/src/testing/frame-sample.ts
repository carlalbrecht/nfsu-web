import type { Renderer } from '../gpu/index';

/** Read actual submitted GPU frames. Motion affects these metrics too: they
 * are evidence for a stationary scene, not an automatic flicker verdict. */
export async function sampleFrames(renderer: Renderer, count = 60) {
  if (!Number.isInteger(count) || count < 2 || count > 120) throw Error('Expected 2..120 frames');
  const canvas = new OffscreenCanvas(80,60), context = canvas.getContext('2d')!;
  const samples: { frame: number; mean: number; difference: number }[] = [];
  let previous: Uint8ClampedArray | undefined;
  for (let i=0;i<count;i++) {
    const bitmap = await createImageBitmap(await renderer.dump(`sample-${i}`));
    context.drawImage(bitmap,0,0,80,60); bitmap.close();
    const pixels = context.getImageData(0,0,80,60).data;
    let total=0, difference=0;
    for (let p=0;p<pixels.length;p+=4) for (let c=0;c<3;c++) {
      total+=pixels[p+c]; if (previous) difference+=Math.abs(pixels[p+c]-previous[p+c]);
    }
    const n=80*60*3;
    samples.push({ frame:renderer.stats().frames, mean:total/n, difference:difference/n }); previous=pixels;
  }
  return { samples, maxDifference:Math.max(...samples.map(s=>s.difference)),
    meanDifference:samples.slice(1).reduce((sum,s)=>sum+s.difference,0)/(count-1) };
}
