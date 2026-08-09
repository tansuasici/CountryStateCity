import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { prettyJson } from './lib/data-artifacts.mjs';
import { applyEntityLevelPolicy, summarizeEntityLevels } from './lib/entity-levels.mjs';

const root = path.resolve(import.meta.dirname, '..');
const [countries, states, cities, policy, display] = await Promise.all([
  readJson('data/country.json'),
  readJson('data/state.json'),
  readJson('data/city.json'),
  readJson('data/entity-level-policy.json'),
  readJson('data/location-display.json'),
]);
const canonical = { countries, states, cities };
const changes = applyEntityLevelPolicy(canonical, policy, display);
const report = summarizeEntityLevels(canonical);

await Promise.all([
  writeAtomic('data/state.json', prettyJson(states)),
  writeAtomic('data/city.json', prettyJson(cities)),
  writeAtomic('data/entity-level-report.json', prettyJson(report)),
]);

console.log(
  `Applied entity level policy: ${JSON.stringify(changes)}; ${states.length} administrative source rows and ${cities.length} source place rows classified.`
);

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), 'utf8'));
}

async function writeAtomic(relativePath, content) {
  const destination = path.join(root, relativePath);
  if (!destination.startsWith(`${root}${path.sep}`))
    throw new Error(`Unsafe output path: ${relativePath}`);
  await mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.entity-levels-${process.pid}`;
  await writeFile(temporary, content);
  await rename(temporary, destination);
}
