import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { prettyJson } from './lib/data-artifacts.mjs';
import { applyTimezonePolicy } from './lib/timezones.mjs';

const root = path.resolve(import.meta.dirname, '..');
const countries = await readJson('data/country.json');
const policy = await readJson('data/timezone-policy.json');
const result = applyTimezonePolicy(countries, policy);
await writeAtomic('data/country.json', prettyJson(countries));
console.log(`Applied timezone policy: ${JSON.stringify(result)}.`);

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), 'utf8'));
}

async function writeAtomic(relativePath, content) {
  const destination = path.join(root, relativePath);
  if (!destination.startsWith(`${root}${path.sep}`))
    throw new Error(`Unsafe output path: ${relativePath}`);
  await mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.timezone-${process.pid}`;
  await writeFile(temporary, content);
  await rename(temporary, destination);
}
