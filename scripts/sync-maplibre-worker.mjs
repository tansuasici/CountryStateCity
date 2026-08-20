import { readFile, rename, writeFile } from 'node:fs/promises';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const sourceDir = path.join(root, 'node_modules/maplibre-gl/dist');
const outputDir = path.join(root, 'public/vendor/maplibre');
const checkOnly = process.argv.includes('--check');
const assets = [
  {
    source: 'maplibre-gl-worker.mjs',
    destination: 'maplibre-gl-worker.js',
    transform: (contents) =>
      contents
        .replaceAll('./maplibre-gl-shared.mjs', './maplibre-gl-shared.js')
        .replace(/\n\/\/# sourceMappingURL=.*$/u, ''),
  },
  {
    source: 'maplibre-gl-shared.mjs',
    destination: 'maplibre-gl-shared.js',
    transform: (contents) => contents.replace(/\n\/\/# sourceMappingURL=.*$/u, ''),
  },
];

for (const asset of assets) {
  const source = await readFile(path.join(sourceDir, asset.source), 'utf8');
  const expected = Buffer.from(asset.transform(source));
  const destination = path.join(outputDir, asset.destination);
  if (checkOnly) {
    const actual = await readFile(destination).catch(() => null);
    if (!actual || !actual.equals(expected))
      throw new Error(`MapLibre worker is stale: ${asset.destination}`);
  } else {
    await mkdir(outputDir, { recursive: true });
    const temporary = `${destination}.generate-${process.pid}`;
    await writeFile(temporary, expected);
    await rename(temporary, destination);
  }
}

console.log(
  `MapLibre module worker ${checkOnly ? 'verified' : 'generated'}: ${assets
    .map((asset) => asset.destination)
    .join(', ')}.`
);
