import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cityPath = path.join(root, 'data/city.json');
const migrationPath = path.join(root, 'data/migrations/city-id-migrations.json');

const cities = JSON.parse(await readFile(cityPath, 'utf8'));
const manifest = JSON.parse(await readFile(migrationPath, 'utf8'));

function matchesSelector(city, selector) {
  return Object.entries(selector).every(([field, value]) => city[field] === value);
}

for (const migration of manifest.migrations) {
  const matches = cities.filter((city) => matchesSelector(city, migration.selector));

  if (migration.operation === 'reassign') {
    const current = matches.find(
      (city) => city.id === migration.previousId || city.id === migration.newId
    );
    if (!current) {
      throw new Error(`Migration target not found: ${JSON.stringify(migration.selector)}`);
    }
    if (current.id === migration.newId) continue;
    if (cities.some((city) => city.id === migration.newId)) {
      throw new Error(`New city ID is already in use: ${migration.newId}`);
    }
    current.id = migration.newId;
    continue;
  }

  if (migration.operation === 'removeDuplicate') {
    const duplicateIndex = cities.findIndex(
      (city) => city.id === migration.previousId && matchesSelector(city, migration.selector)
    );
    if (duplicateIndex === -1) {
      if (cities.some((city) => city.id === migration.canonicalId)) continue;
      throw new Error(`Duplicate target not found: ${migration.previousId}`);
    }

    const duplicate = cities[duplicateIndex];
    const canonical = cities.find((city) => city.id === migration.canonicalId);
    if (!canonical) throw new Error(`Canonical city not found: ${migration.canonicalId}`);

    const withoutId = ({ id: _id, ...city }) => city;
    if (JSON.stringify(withoutId(duplicate)) !== JSON.stringify(withoutId(canonical))) {
      throw new Error(
        `Rows ${migration.previousId} and ${migration.canonicalId} are not exact duplicates`
      );
    }
    cities.splice(duplicateIndex, 1);
    continue;
  }

  throw new Error(`Unsupported migration operation: ${migration.operation}`);
}

const ids = new Set();
for (const city of cities) {
  if (ids.has(city.id)) throw new Error(`Duplicate city ID remains: ${city.id}`);
  ids.add(city.id);
}

await writeFile(cityPath, `${JSON.stringify(cities, null, 2)}\n`);
console.log(`Applied ${manifest.migrationId}; ${cities.length} canonical cities remain.`);
