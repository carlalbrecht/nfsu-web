import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
process.chdir(path.dirname(fileURLToPath(import.meta.url)));
const hash = createHash('sha256');
for (const file of fs.readdirSync('src',{recursive:true}).filter(f=>/\.(ts|css|woff2)$/.test(f)).sort())
  hash.update(file).update(fs.readFileSync(path.join('src',file)));
hash.update(fs.readFileSync('stock.html')).update(fs.readFileSync('build-stock.mjs'));
await esbuild.build({
  absWorkingDir: process.cwd(),
  entryPoints: { stock: 'src/stock.ts', 'host/game-worker': 'src/host/game-worker.ts',
    'host/io-worker': 'src/host/io-worker.ts', 'gpu/png-worker': 'src/gpu/png-worker.ts',
    'audio/worklet': 'src/audio/worklet.ts' },
  outdir: 'dist', bundle: true, format: 'esm', target: ['chrome140', 'firefox145'], sourcemap: true,
  loader: { '.woff2': 'dataurl' },
  define: { __WEB_BUILD__: JSON.stringify(hash.digest('hex')) },
});
fs.copyFileSync('stock.html', 'dist/index.html');
fs.copyFileSync('src/launcher/fonts/OFL.txt', 'dist/IBM-Plex-Sans-Condensed-LICENSE.txt');
fs.copyFileSync('../gen/all/coverage.json', 'dist/coverage.json');
// Optional browser vectors produced by the asset-free regression suite.
if (fs.existsSync('../out/tests/shaders')) fs.cpSync('../out/tests/shaders','dist/shader-tests',{recursive:true});
