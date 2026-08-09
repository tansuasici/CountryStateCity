import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data');
const npmDataDir = path.join(root, 'countrystatecity-npm/data');
const shardDir = path.join(npmDataDir, 'cities');

const [cities, countries, manifest, shardIndex] = await Promise.all([
  readJson(path.join(dataDir, 'city.json')),
  readJson(path.join(dataDir, 'country.json')),
  readJson(path.join(dataDir, 'migrations/city-id-migrations.json')),
  readJson(path.join(shardDir, 'index.json')),
]);

const compactCities = cities.map((city) => ({
  i: city.id,
  n: city.name,
  s: city.stateId,
  c: city.countryId,
  la: roundCoordinate(city.latitude),
  lo: roundCoordinate(city.longitude),
  ...(city.wikiDataId ? { w: city.wikiDataId } : {}),
}));
const compactJson = JSON.stringify(compactCities);
await Promise.all([
  writeFile(path.join(dataDir, 'city-optimized.json'), compactJson),
  writeFile(path.join(npmDataDir, 'city.json'), compactJson),
]);

const countriesById = new Map(countries.map((country) => [country.id, country]));
const affectedCountryIds = new Set(manifest.migrations.map(({ selector }) => selector.countryId));

for (const countryId of affectedCountryIds) {
  const country = countriesById.get(countryId);
  if (!country) throw new Error(`Unknown country ID: ${countryId}`);
  const code = country.iso2.toLowerCase();
  const shardPath = path.join(shardDir, `${code}.json`);
  const shard = await readJson(shardPath);

  for (const migration of manifest.migrations.filter(
    ({ selector }) => selector.countryId === countryId
  )) {
    const matchesSelector = (city) =>
      city.n === migration.selector.name && city.s === migration.selector.stateId;

    if (migration.operation === 'reassign') {
      const city = shard.find(
        (item) =>
          matchesSelector(item) && (item.i === migration.previousId || item.i === migration.newId)
      );
      if (!city) throw new Error(`City migration target is absent from ${code}.json`);
      city.i = migration.newId;
    } else if (migration.operation === 'removeDuplicate') {
      const duplicateIndex = shard.findIndex(
        (item) => matchesSelector(item) && item.i === migration.previousId
      );
      if (duplicateIndex !== -1) shard.splice(duplicateIndex, 1);
      if (!shard.some((item) => matchesSelector(item) && item.i === migration.canonicalId)) {
        throw new Error(`Canonical city is absent from ${code}.json`);
      }
    }
  }

  const shardJson = JSON.stringify(shard);
  await writeFile(shardPath, shardJson);
  shardIndex[countryId] = {
    code,
    count: shard.length,
    size: Buffer.byteLength(shardJson),
  };
}

await writeFile(path.join(shardDir, 'index.json'), JSON.stringify(shardIndex));
console.log(
  `Synchronized ${manifest.migrations.length} city ID migrations across compact data and ${affectedCountryIds.size} country shards.`
);

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

function roundCoordinate(value) {
  const coordinate = Number(value);
  if (!Number.isFinite(coordinate)) throw new Error(`Invalid coordinate: ${value}`);
  return Number(coordinate.toFixed(4));
}
