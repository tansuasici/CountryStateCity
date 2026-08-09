import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { normalizeParentFields, totalParentFieldMismatches } from './lib/parent-fields.mjs';
import { prettyJson } from './lib/data-artifacts.mjs';

const root = path.resolve(import.meta.dirname, '..');
const canonical = {
  countries: await readJson('data/country.json'),
  states: await readJson('data/state.json'),
  cities: await readJson('data/city.json'),
};
const changes = normalizeParentFields(canonical);
const total = totalParentFieldMismatches(changes);

if (total > 0) {
  await Promise.all([
    writeAtomic('data/state.json', prettyJson(canonical.states)),
    writeAtomic('data/city.json', prettyJson(canonical.cities)),
  ]);
}

console.log(`Normalized ${total} parent field mismatches: ${JSON.stringify(changes)}.`);

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), 'utf8'));
}

async function writeAtomic(relativePath, content) {
  const destination = path.join(root, relativePath);
  assert(destination.startsWith(`${root}${path.sep}`), `Unsafe output path: ${relativePath}`);
  await mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.normalize-${process.pid}`;
  await writeFile(temporary, content);
  await rename(temporary, destination);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
