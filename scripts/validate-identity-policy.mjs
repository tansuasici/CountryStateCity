import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { buildIdentityReport, toPublicId } from './lib/identity.mjs';

const root = path.resolve(import.meta.dirname, '..');
const [policy, index] = await Promise.all([
  readJson('data/identity-policy.json'),
  readJson('data/migrations/index.json'),
]);

assert(policy.schemaVersion === 1, 'Unsupported identity policy schema');
assert(policy.namespace === 'csc', 'Public ID namespace must be csc');
assert(policy.publicId?.immutable === true, 'Public IDs must be immutable');
assert(policy.publicId?.reuseAllowed === false, 'Public ID reuse must be forbidden');
assert(policy.applyGate?.sameSourceIdCollisionAction === 'stop', 'Collision gate must stop');
assert(policy.applyGate?.unresolvedRemovalAction === 'stop', 'Unresolved removals must stop');

assert(index.schemaVersion === 1, 'Unsupported migration index schema');
assert(Array.isArray(index.migrations) && index.migrations.length > 0, 'Migration index is empty');
const migrationKeys = new Set();
for (const entry of index.migrations) {
  const key = `${entry.fromDataVersion}->${entry.toDataVersion}`;
  assert(!migrationKeys.has(key), `Duplicate migration range: ${key}`);
  migrationKeys.add(key);
  const manifest = await readJson(path.posix.join('data/migrations', entry.file));
  assert(manifest.schemaVersion === 2, `Unsupported migration schema: ${entry.file}`);
  assert(manifest.fromDataVersion === entry.fromDataVersion, `Migration start mismatch: ${key}`);
  assert(manifest.toDataVersion === entry.toDataVersion, `Migration end mismatch: ${key}`);
  for (const migration of manifest.migrations) validateMigration(migration, entry.file);
}

const syntheticCurrent = {
  countries: [{ id: 1, name: 'Example', iso2: 'EX', latitude: '0', longitude: '0' }],
  states: [],
  cities: [
    {
      id: 11,
      name: 'Original Place',
      countryCode: 'EX',
      stateCode: 'A',
      latitude: '10',
      longitude: '10',
      wikiDataId: 'Q1',
    },
  ],
};
const syntheticCandidate = {
  countries: syntheticCurrent.countries,
  states: [],
  cities: [
    {
      id: 11,
      name: 'Different Place',
      countryCode: 'EX',
      stateCode: 'B',
      latitude: '-10',
      longitude: '-10',
      wikiDataId: 'Q2',
    },
  ],
};
const collisionReport = buildIdentityReport(syntheticCurrent, syntheticCandidate, {
  fromDataVersion: 'test',
  toSource: { release: 'test', revision: '0'.repeat(40) },
});
assert(collisionReport.gate.passed === false, 'Synthetic source ID reuse did not stop the gate');
assert(
  collisionReport.entities.cities.sameSourceIdCollisions[0]?.publicId === toPublicId('city', 11),
  'Synthetic collision did not preserve the original public ID'
);

console.log(
  `Identity policy passed: ${index.migrations.length} versioned migration file, immutable ${policy.namespace} namespace, collision stop gate verified.`
);

function validateMigration(migration, file) {
  assert(policy.migrationEvents.allowed.includes(migration.event), `Unknown event in ${file}`);
  assert(
    /^csc:(country|state|city|district):\d+$/.test(migration.previousPublicId),
    `Bad public ID in ${file}`
  );
  if (policy.migrationEvents.successorRequiredFor.includes(migration.event)) {
    assert(
      Array.isArray(migration.successorPublicIds) && migration.successorPublicIds.length > 0,
      `Successor is required for ${migration.previousPublicId}`
    );
  }
  if (migration.event === 'merge') {
    assert(migration.successorPublicIds.length === 1, 'Merge must have one canonical successor');
  }
  if (migration.event === 'split') {
    assert(migration.successorPublicIds.length > 1, 'Split must have multiple successors');
    assert(migration.redirect === 'manual', 'Split redirect must be manual');
  }
  for (const successor of migration.successorPublicIds ?? []) {
    assert(
      /^csc:(country|state|city|district):\d+$/.test(successor),
      `Bad successor ID: ${successor}`
    );
  }
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), 'utf8'));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
