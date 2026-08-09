import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildProductionManifest } from './lib/data-manifest.mjs';

const root = path.resolve(import.meta.dirname, '..');
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const manifest = await buildProductionManifest(root, pkg.version, {
  generatedAt: new Date().toISOString(),
});
await writeFile(
  path.join(root, 'data/production-manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`
);
console.log(
  `Production snapshot manifest: ${manifest.counts.countries}/${manifest.counts.states}/${manifest.counts.cities}/${manifest.counts.districts}, ${manifest.files.length} files, ${manifest.digest}`
);
