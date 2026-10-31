// Reproducible local assets. GPL-2.0-or-later; upstream notices are retained.
import { build } from 'esbuild';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const plugin = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const leaflet = dirname(require.resolve('leaflet/package.json'));
const chart = JSON.parse(await readFile(resolve(plugin, 'source/vendor/chart.js/package.json'), 'utf8'));
const color = require('@kurkle/color/package.json');
const common = { absWorkingDir: plugin, write: false, bundle: true, format: 'iife', target: 'es2020', legalComments: 'eof', logLevel: 'info' };

async function writeChanged(path, contents) {
  try { if ((await readFile(path)).equals(contents)) return; }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  await writeFile(path, contents);
}

async function bundle(options) {
  const result = await build(options);
  for (const file of result.outputFiles) await writeChanged(file.path, file.contents);
}

await mkdir(resolve(plugin, 'assets/vendor/leaflet'), { recursive: true });
await bundle({ ...common, entryPoints: [resolve(plugin, 'src/editor.js')], outfile: resolve(plugin, 'assets/editor.js') });
// Build the upstream UMD entry from preferred sources so the locked current
// @kurkle/color is actually included instead of the older embedded UMD copy.
await bundle({ ...common, minify: true, entryPoints: [resolve(plugin, 'source/vendor/chart.js/src/index.umd.ts')],
  outfile: resolve(plugin, 'assets/vendor/chart.js'),
  banner: { js: `/*! Chart.js v${chart.version} + @kurkle/color v${color.version}; local build. MIT licenses: licenses/chartjs.txt and licenses/kurkle-color.txt. */` } });
for (const file of ['leaflet.js', 'leaflet.js.map', 'leaflet.css']) {
  await writeChanged(resolve(plugin, 'assets/vendor/leaflet', file), await readFile(resolve(leaflet, 'dist', file)));
}
await mkdir(resolve(plugin, 'assets/vendor/leaflet/images'), { recursive: true });
for (const file of await readdir(resolve(leaflet, 'dist/images'))) {
  await writeChanged(resolve(plugin, 'assets/vendor/leaflet/images', file), await readFile(resolve(leaflet, 'dist/images', file)));
}
