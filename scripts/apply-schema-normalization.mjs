import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { prettyJson } from './lib/data-artifacts.mjs';
import { applySchemaNormalization } from './lib/schema-normalization.mjs';

const root = path.resolve(import.meta.dirname, '..');
const [countries, states, policy] = await Promise.all([
  readJson('data/country.json'),
  readJson('data/state.json'),
  readJson('data/schema-normalization-policy.json'),
]);
const changes = applySchemaNormalization(countries, states, policy);
await Promise.all([
  writeAtomic('data/country.json', prettyJson(countries)),
  writeAtomic('data/state.json', prettyJson(states)),
]);
console.log(`Applied schema normalization: ${JSON.stringify(changes)}.`);

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), 'utf8'));
}

async function writeAtomic(relativePath, content) {
  const destination = path.join(root, relativePath);
  if (!destination.startsWith(`${root}${path.sep}`))
    throw new Error(`Unsafe output path: ${relativePath}`);
  await mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.schema-${process.pid}`;
  await writeFile(temporary, content);
  await rename(temporary, destination);
}
