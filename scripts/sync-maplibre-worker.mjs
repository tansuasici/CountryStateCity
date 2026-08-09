import { readFile, rename, writeFile } from 'node:fs/promises';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const sourceDir = path.join(root, 'node_modules/maplibre-gl/dist');
const outputDir = path.join(root, 'public/vendor/maplibre');
const checkOnly = process.argv.includes('--check');
const files = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs'];

for (const filename of files) {
  const expected = await readFile(path.join(sourceDir, filename));
  const destination = path.join(outputDir, filename);
  if (checkOnly) {
    const actual = await readFile(destination).catch(() => null);
    if (!actual || !actual.equals(expected))
      throw new Error(`MapLibre worker is stale: ${filename}`);
  } else {
    await mkdir(outputDir, { recursive: true });
    const temporary = `${destination}.generate-${process.pid}`;
    await writeFile(temporary, expected);
    await rename(temporary, destination);
  }
}

console.log(`MapLibre module worker ${checkOnly ? 'verified' : 'generated'}: ${files.join(', ')}.`);
