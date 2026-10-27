import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
process.chdir(path.dirname(fileURLToPath(import.meta.url)));
await esbuild.build({
  absWorkingDir: process.cwd(),
  entryPoints: { stock: 'src/stock.ts', 'host/game-worker': 'src/host/game-worker.ts',
    'host/io-worker': 'src/host/io-worker.ts', 'gpu/png-worker': 'src/gpu/png-worker.ts',
    'audio/worklet': 'src/audio/worklet.ts' },
  outdir: 'dist', bundle: true, format: 'esm', target: ['chrome140', 'firefox145'], sourcemap: true,
});
fs.copyFileSync('stock.html', 'dist/index.html');
