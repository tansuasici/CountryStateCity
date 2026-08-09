import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { validateTimezonePolicy } from './lib/timezones.mjs';

const root = path.resolve(import.meta.dirname, '..');
const [countries, policy] = await Promise.all([
  readJson('data/country.json'),
  readJson('data/timezone-policy.json'),
]);
const result = validateTimezonePolicy(countries, policy);
console.log(
  `Timezone validation passed: ${result.records} records, ${result.uniqueZones} unique IANA zones.`
);

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), 'utf8'));
}
