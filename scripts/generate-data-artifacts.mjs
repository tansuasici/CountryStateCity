import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  buildDistributionArtifacts,
  buildDistributionManifest,
  prettyJson,
} from './lib/data-artifacts.mjs';
import { auditParentFields, totalParentFieldMismatches } from './lib/parent-fields.mjs';
import { assertUniqueWikidataQids } from './lib/wikidata-qids.mjs';
import { validateCountryMetadataPolicy } from './lib/country-metadata.mjs';
import { validateEntityLevelPolicy } from './lib/entity-levels.mjs';
import { validateStateCoordinatePolicy } from './lib/state-coordinates.mjs';
import { validateSchemaNormalization } from './lib/schema-normalization.mjs';
import { validateTimezonePolicy } from './lib/timezones.mjs';

const root = path.resolve(import.meta.dirname, '..');
const checkOnly = process.argv.includes('--check');
const [
  countries,
  states,
  cities,
  pkg,
  nestedPkg,
  nestedLock,
  provenance,
  countryPolicy,
  entityPolicy,
  display,
  stateCoordinatePolicy,
  schemaNormalizationPolicy,
  timezonePolicy,
] = await Promise.all([
  readJson('data/country.json'),
  readJson('data/state.json'),
  readJson('data/city.json'),
  readJson('package.json'),
  readJson('countrystatecity-npm/package.json'),
  readJson('countrystatecity-npm/package-lock.json'),
  readJson('data/provenance.json'),
  readJson('data/country-metadata-policy.json'),
  readJson('data/entity-level-policy.json'),
  readJson('data/location-display.json'),
  readJson('data/geography/state-coordinate-policy.json'),
  readJson('data/schema-normalization-policy.json'),
  readJson('data/timezone-policy.json'),
]);

assert(nestedPkg.version === pkg.version, 'Nested package version differs from root package');
assert(nestedLock.version === pkg.version, 'Nested package-lock version differs from root package');
assert(
  nestedLock.packages?.['']?.version === pkg.version,
  'Nested package-lock root entry differs from root package'
);

const canonical = { countries, states, cities };
validateCountryMetadataPolicy(countries, countryPolicy);
validateEntityLevelPolicy(canonical, entityPolicy, display);
validateStateCoordinatePolicy(states, stateCoordinatePolicy);
validateSchemaNormalization(countries, states, schemaNormalizationPolicy);
validateTimezonePolicy(countries, timezonePolicy);
assertUniqueWikidataQids(cities);
const parentFieldMismatches = auditParentFields(canonical);
assert(
  totalParentFieldMismatches(parentFieldMismatches) === 0,
  `Canonical parent fields are stale; run npm run data:normalize-parents: ${JSON.stringify(parentFieldMismatches)}`
);
const artifacts = buildDistributionArtifacts(canonical);
const upstream = provenance.sources.find(
  (source) => source.id === 'dr5hn-countries-states-cities-database'
);
assert(upstream?.syncPipeline, 'Pinned upstream source metadata is missing');
const distributionManifest = buildDistributionManifest(canonical, artifacts, {
  packageVersion: pkg.version,
  sourceRelease: upstream.syncPipeline.pinnedRelease,
  sourceRevision: upstream.syncPipeline.revision,
});
const expected = new Map(artifacts);
expected.set('data/distribution-manifest.json', prettyJson(distributionManifest));

if (checkOnly) {
  for (const [relativePath, content] of expected) {
    const actual = await readFile(path.join(root, relativePath), 'utf8').catch(() => null);
    assert(actual !== null, `Generated artifact is missing: ${relativePath}`);
    assert(actual === content, `Generated artifact drift: ${relativePath}`);
  }

  const expectedShards = new Set(
    [...artifacts.keys()]
      .filter((file) => /^countrystatecity-npm\/data\/cities\/[a-z]{2}\.json$/u.test(file))
      .map((file) => path.basename(file))
  );
  const actualShards = (await readdir(path.join(root, 'countrystatecity-npm/data/cities')))
    .filter((file) => /^[a-z]{2}\.json$/u.test(file))
    .sort();
  for (const shard of actualShards) {
    assert(expectedShards.has(shard), `Unexpected generated shard: ${shard}`);
  }
  assert(actualShards.length === expectedShards.size, 'Generated shard count differs');

  console.log(
    `Generated artifact parity passed: ${expected.size} files, ${actualShards.length} country shards, data ${distributionManifest.dataVersion}.`
  );
} else {
  for (const [relativePath, content] of expected) {
    await writeAtomic(relativePath, content);
  }
  console.log(
    `Generated ${expected.size} artifacts from canonical country/state/city data; ${actualSummary(distributionManifest)}.`
  );
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), 'utf8'));
}

async function writeAtomic(relativePath, content) {
  const destination = path.join(root, relativePath);
  assert(destination.startsWith(`${root}${path.sep}`), `Unsafe output path: ${relativePath}`);
  await mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.generate-${process.pid}`;
  await writeFile(temporary, content);
  await rename(temporary, destination);
}

function actualSummary(manifest) {
  return `${manifest.generatedArtifacts.count} derived files, max coordinate error ${manifest.coordinatePrecision.observedMaximumCenterErrorMeters}m`;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
