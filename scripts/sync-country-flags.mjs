import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const countries = JSON.parse(await readFile(path.join(root, 'data/country.json'), 'utf8'));
const sourceDir = path.join(root, 'node_modules/flag-icons/flags/4x3');
const outputDir = path.join(root, 'public/vendor/flags');
const checkOnly = process.argv.includes('--check');

for (const country of countries) {
  const code = country.iso2.toLowerCase();
  const expected = await readFile(path.join(sourceDir, `${code}.svg`));
  const destination = path.join(outputDir, `${code}.svg`);

  if (checkOnly) {
    const actual = await readFile(destination).catch(() => null);
    if (!actual || !actual.equals(expected)) {
      throw new Error(`Country flag is missing or stale: ${code}.svg`);
    }
  } else {
    await mkdir(outputDir, { recursive: true });
    const temporary = `${destination}.generate-${process.pid}`;
    await writeFile(temporary, expected);
    await rename(temporary, destination);
  }
}

console.log(
  `Country flags ${checkOnly ? 'verified' : 'generated'}: ${countries.length} local SVG assets.`
);
