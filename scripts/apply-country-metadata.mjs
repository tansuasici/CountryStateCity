import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { prettyJson } from './lib/data-artifacts.mjs';
import { applyCountryMetadataPolicy } from './lib/country-metadata.mjs';
import { normalizeParentFields } from './lib/parent-fields.mjs';

const root = path.resolve(import.meta.dirname, '..');
const [countries, states, cities, policy] = await Promise.all([
  readJson('data/country.json'),
  readJson('data/state.json'),
  readJson('data/city.json'),
  readJson('data/country-metadata-policy.json'),
]);
const changes = applyCountryMetadataPolicy(countries, policy);
const parentChanges = normalizeParentFields({ countries, states, cities });

await Promise.all([
  writeAtomic('data/country.json', prettyJson(countries)),
  writeAtomic('data/state.json', prettyJson(states)),
  writeAtomic('data/city.json', prettyJson(cities)),
]);

console.log(
  `Applied ${changes.length} country metadata changes and normalized parent fields: ${JSON.stringify(parentChanges)}.`
);

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), 'utf8'));
}

async function writeAtomic(relativePath, content) {
  const destination = path.join(root, relativePath);
  await mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.country-${process.pid}`;
  await writeFile(temporary, content);
  await rename(temporary, destination);
}
