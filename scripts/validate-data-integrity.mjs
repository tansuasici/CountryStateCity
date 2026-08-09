import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildProductionManifest } from './lib/data-manifest.mjs';
import { buildCoverageReport } from './lib/coverage.mjs';
import { auditParentFields, totalParentFieldMismatches } from './lib/parent-fields.mjs';
import { validateCountryMetadataPolicy } from './lib/country-metadata.mjs';
import { validateEntityLevelPolicy } from './lib/entity-levels.mjs';
import { validateStateCoordinatePolicy } from './lib/state-coordinates.mjs';
import { validateSchemaNormalization } from './lib/schema-normalization.mjs';
import { validateTimezonePolicy } from './lib/timezones.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data');
const npmDataDir = path.join(root, 'countrystatecity-npm/data');
const shardDir = path.join(npmDataDir, 'cities');
const pkg = await readJson(path.join(root, 'package.json'));

const [
  countries,
  states,
  cities,
  optimized,
  npmCities,
  shardIndex,
  provenance,
  recordedProductionManifest,
  locationDisplay,
  districtLayer,
  districtMigration,
  coveragePolicy,
  recordedCoverageReport,
  wikidataQidPolicy,
  wikidataQidReport,
  countryMetadataPolicy,
  entityLevelPolicy,
  recordedEntityLevelReport,
  stateCoordinatePolicy,
  schemaNormalizationPolicy,
  timezonePolicy,
] = await Promise.all([
  readJson(path.join(dataDir, 'country.json')),
  readJson(path.join(dataDir, 'state.json')),
  readJson(path.join(dataDir, 'city.json')),
  readJson(path.join(dataDir, 'city-optimized.json')),
  readJson(path.join(npmDataDir, 'city.json')),
  readJson(path.join(shardDir, 'index.json')),
  readJson(path.join(dataDir, 'provenance.json')),
  readJson(path.join(dataDir, 'production-manifest.json')),
  readJson(path.join(dataDir, 'location-display.json')),
  readJson(path.join(dataDir, 'admin/districts/tr.json')),
  readJson(path.join(dataDir, 'migrations/tr-city-to-district.json')),
  readJson(path.join(dataDir, 'coverage-policy.json')),
  readJson(path.join(dataDir, 'coverage-report.json')),
  readJson(path.join(dataDir, 'identity/wikidata-qid-policy.json')),
  readJson(path.join(dataDir, 'identity/wikidata-qid-verification.json')),
  readJson(path.join(dataDir, 'country-metadata-policy.json')),
  readJson(path.join(dataDir, 'entity-level-policy.json')),
  readJson(path.join(dataDir, 'entity-level-report.json')),
  readJson(path.join(dataDir, 'geography/state-coordinate-policy.json')),
  readJson(path.join(dataDir, 'schema-normalization-policy.json')),
  readJson(path.join(dataDir, 'timezone-policy.json')),
]);

await validateProvenance(provenance);
assert(recordedProductionManifest.schemaVersion === 2, 'Unsupported production manifest schema');
assert(
  recordedProductionManifest.dataVersion === `sha256:${recordedProductionManifest.digest}`,
  'Production data version must be content-addressed by the manifest digest'
);
assert(
  !Number.isNaN(Date.parse(recordedProductionManifest.generatedAt)),
  'Production manifest generatedAt must be an ISO-8601 timestamp'
);
assert(
  recordedProductionManifest.packageVersion === pkg.version,
  'Production manifest package version differs from package.json'
);
const computedProductionManifest = await buildProductionManifest(root, pkg.version, {
  generatedAt: recordedProductionManifest.generatedAt,
});
assert(
  JSON.stringify(recordedProductionManifest) === JSON.stringify(computedProductionManifest),
  'Production snapshot manifest is stale; run npm run data:snapshot-manifest'
);

assertUniqueIds('country', countries);
assertUniqueIds('state', states);
assertUniqueIds('city', cities);
assertUniqueIds('district', districtLayer.districts);
validateLocationDisplay(locationDisplay, states, provenance);
validateTurkeyDistrictLayer(districtLayer, districtMigration, countries, states, cities);
validateCoverage(coveragePolicy, recordedCoverageReport, countries, states, cities);
validateWikidataQids(wikidataQidPolicy, wikidataQidReport, cities);
validateCountryMetadataPolicy(countries, countryMetadataPolicy);
validateStateCoordinatePolicy(states, stateCoordinatePolicy);
validateSchemaNormalization(countries, states, schemaNormalizationPolicy);
validateTimezonePolicy(countries, timezonePolicy);
const computedEntityLevelReport = validateEntityLevelPolicy(
  { countries, states, cities },
  entityLevelPolicy,
  locationDisplay
);
assert(
  JSON.stringify(recordedEntityLevelReport) === JSON.stringify(computedEntityLevelReport),
  'Entity level report is stale; run npm run data:entity-levels'
);
const parentFieldMismatches = auditParentFields({ countries, states, cities });
assert(
  totalParentFieldMismatches(parentFieldMismatches) === 0,
  `Denormalized parent field mismatches: ${JSON.stringify(parentFieldMismatches)}`
);

const countryIds = new Set(countries.map(({ id }) => id));
const stateIds = new Set(states.map(({ id }) => id));
const cityById = new Map(cities.map((city) => [city.id, city]));
for (const state of states) assert(countryIds.has(state.countryId), `Orphan state ${state.id}`);
for (const city of cities) {
  assert(countryIds.has(city.countryId), `Orphan city country reference ${city.id}`);
  assert(stateIds.has(city.stateId), `Orphan city state reference ${city.id}`);
}

const exactCityKeys = new Set();
for (const city of cities) {
  const cityWithoutId = Object.fromEntries(
    Object.entries(city).filter(([field]) => field !== 'id')
  );
  const key = JSON.stringify(cityWithoutId);
  assert(!exactCityKeys.has(key), `Exact duplicate city row: ${city.name}/${city.stateId}`);
  exactCityKeys.add(key);
}

assert(optimized.length === cities.length, 'Optimized city count differs from canonical data');
assert(
  JSON.stringify(optimized) === JSON.stringify(npmCities),
  'NPM city data differs from optimized data'
);
for (let index = 0; index < cities.length; index += 1) {
  const city = cities[index];
  const compact = optimized[index];
  assert(compact.i === city.id, `Optimized ID mismatch at row ${index}`);
  assert(compact.n === city.name, `Optimized name mismatch for city ${city.id}`);
  assert(compact.s === city.stateId, `Optimized state mismatch for city ${city.id}`);
  assert(compact.c === city.countryId, `Optimized country mismatch for city ${city.id}`);
}

const shardIds = new Set();
let shardCount = 0;
for (const [countryId, metadata] of Object.entries(shardIndex)) {
  const shardPath = path.join(shardDir, `${metadata.code}.json`);
  const shard = await readJson(shardPath);
  const shardStats = await stat(shardPath);
  assert(shard.length === metadata.count, `Shard count mismatch: ${metadata.code}`);
  assert(shardStats.size === metadata.size, `Shard size mismatch: ${metadata.code}`);
  for (const city of shard) {
    assert(!shardIds.has(city.i), `Duplicate city ID across shards: ${city.i}`);
    const canonical = cityById.get(city.i);
    assert(canonical, `Unknown city ID in shard ${metadata.code}: ${city.i}`);
    assert(canonical.countryId === Number(countryId), `Wrong country shard for city ${city.i}`);
    shardIds.add(city.i);
  }
  shardCount += shard.length;
}
assert(shardCount === cities.length, 'Country shard total differs from canonical data');

console.log(
  `Data integrity passed: ${countries.length} countries, ${states.length} states, ${cities.length} unique cities, ${districtLayer.districts.length} districts, ${Object.keys(locationDisplay.subdivisions).length} subdivision display records, ${Object.keys(shardIndex).length} shards.`
);

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

function assertUniqueIds(entity, rows) {
  const ids = new Set();
  for (const row of rows) {
    assert(!ids.has(row.id), `Duplicate ${entity} ID: ${row.id}`);
    ids.add(row.id);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validateLocationDisplay(display, states, provenance) {
  assert(display.schemaVersion === 1, 'Unsupported location display schema');
  const pinnedRelease = provenance.sources?.[0]?.syncPipeline?.pinnedRelease;
  const pinnedRevision = provenance.sources?.[0]?.syncPipeline?.revision;
  assert(display.source?.release === pinnedRelease, 'Display metadata release is not pinned');
  assert(display.source?.revision === pinnedRevision, 'Display metadata revision is not pinned');

  const entries = Object.entries(display.subdivisions ?? {});
  const countryEntries = Object.entries(display.countries ?? {});
  assert(countryEntries.length === 250, 'Unexpected country display count');
  assert(display.counts?.countries === countryEntries.length, 'Country display count is stale');
  for (const [code, entry] of countryEntries) {
    assert(/^[A-Z]{2}$/u.test(code), `Invalid country display code: ${code}`);
    assert(entry.name === entry.name.normalize('NFC').trim(), `Unnormalized country name: ${code}`);
    assert(entry.name.length > 0, `Empty country display name: ${code}`);
  }
  assert(display.countries.TR?.name === 'Türkiye', 'Türkiye display name regressed');
  assert(display.countries.AX?.name === 'Åland Islands', 'Åland display name regressed');
  assert(entries.length === display.counts?.subdivisions, 'Display metadata count is stale');
  assert(entries.length === 5308, 'Unexpected pinned subdivision display count');
  for (const [code, entry] of entries) {
    assert(/^[A-Z]{2}-.+$/u.test(code), `Invalid subdivision display code: ${code}`);
    assert(entry.name === entry.name.normalize('NFC').trim(), `Unnormalized display name: ${code}`);
    assert(entry.name.length > 0, `Empty subdivision display name: ${code}`);
    assert(entry.type !== 'administrative area', `Invented generic display type: ${code}`);
    if (entry.type !== null) {
      assert(entry.type === entry.type.trim(), `Unnormalized display type: ${code}`);
      assert(entry.type === entry.type.toLowerCase(), `Display type must be canonical: ${code}`);
    }
  }

  const localKeys = new Set(states.map((state) => `${state.countryCode}-${state.stateCode}`));
  const matched = entries.filter(([code]) => localKeys.has(code)).length;
  assert(matched === 4488, `Unexpected local/display subdivision match count: ${matched}`);

  for (const code of ['ME-01', 'ME-06', 'ME-08', 'ME-24', 'ME-25']) {
    assert(display.subdivisions[code]?.type === 'municipality', `Missing Montenegro type: ${code}`);
  }
  assert(display.subdivisions['ME-01'].name === 'Andrijevica', 'Montenegro display name regressed');
}

function validateTurkeyDistrictLayer(layer, migration, countries, states, cities) {
  assert(layer.schemaVersion === 1, 'Unsupported district layer schema');
  assert(layer.countryCode === 'TR', 'Unexpected district layer country');
  assert(layer.districts.length === 922, 'Türkiye district count must be 922');
  assert(migration.counts?.districtAliases === 922, 'District migration alias count is stale');
  assert(migration.counts?.remainingPlaces === 104, 'Remaining Türkiye place count is stale');

  const country = countries.find((item) => item.iso2 === 'TR');
  assert(country, 'Türkiye country record is missing');
  const stateById = new Map(states.map((item) => [item.id, item]));
  const cityById = new Map(cities.map((item) => [item.id, item]));
  const publicIds = new Set();
  const geoNameIds = new Set();
  for (const district of layer.districts) {
    assert(district.countryId === country.id, `Wrong district country: ${district.publicId}`);
    const state = stateById.get(district.stateId);
    assert(state?.countryId === country.id, `Orphan district state: ${district.publicId}`);
    assert(
      state.stateCode === district.stateCode,
      `District state code drift: ${district.publicId}`
    );
    assert(district.publicId === `csc:district:${district.id}`, `Bad district ID: ${district.id}`);
    assert(!publicIds.has(district.publicId), `Duplicate district public ID: ${district.publicId}`);
    assert(
      !geoNameIds.has(district.geoNameId),
      `Duplicate GeoNames district ID: ${district.geoNameId}`
    );
    assert(cityById.has(district.id), `District has no legacy city identity: ${district.publicId}`);
    assert(district.officialDistrictCode === null, `Invented official code: ${district.publicId}`);
    publicIds.add(district.publicId);
    geoNameIds.add(district.geoNameId);
  }

  const classifiedLegacyIds = new Set([
    ...migration.aliases.map((item) => Number(item.legacyPublicId.split(':').at(-1))),
    ...migration.remainingPlaces.map((item) => item.id),
  ]);
  const turkeyCityIds = new Set(
    cities.filter((item) => item.countryId === country.id).map((item) => item.id)
  );
  assert(
    classifiedLegacyIds.size === turkeyCityIds.size,
    'Türkiye city grain classification is incomplete'
  );
  for (const id of turkeyCityIds) {
    assert(classifiedLegacyIds.has(id), `Unclassified Türkiye city identity: ${id}`);
  }
}

function validateCoverage(policy, recordedReport, countries, states, cities) {
  const computedReport = buildCoverageReport({ countries, states, cities, policy });
  assert(
    JSON.stringify(recordedReport) === JSON.stringify(computedReport),
    'Coverage report is stale; run npm run data:coverage'
  );
  assert(recordedReport.summary.contract.passed, 'Coverage contract failed');
  assert(
    recordedReport.summary.contract.gapClassificationRate === 1,
    'Every published coverage gap must carry a reason code'
  );
  assert(
    recordedReport.summary.contract.sentinelCoordinatePairs === 0,
    'Sentinel country coordinates are forbidden'
  );
  assert(
    recordedReport.summary.countriesWithoutStates === 53,
    'Country/state coverage baseline changed without review'
  );
  assert(
    recordedReport.summary.countriesWithoutCities === 58,
    'Country/city coverage baseline changed without review'
  );
  assert(
    recordedReport.summary.statesWithoutCities === 1532,
    'State/city coverage baseline changed without review'
  );
}

function validateWikidataQids(policy, report, cities) {
  assert(policy.schemaVersion === 1, 'Unsupported Wikidata QID policy');
  assert(report.schemaVersion === 1, 'Unsupported Wikidata QID verification report');
  assert(report.verifiedAt === policy.policyDate, 'Wikidata verification date differs from policy');
  assert(report.source.url === policy.source.url, 'Wikidata verification source differs');
  assert(policy.role === 'supplemental-reference-only', 'Wikidata must not be a primary ID');

  const cityById = new Map(cities.map((city) => [city.id, city]));
  const qidToCity = new Map();
  let populatedAssignments = 0;
  for (const city of cities) {
    if (!city.wikiDataId) continue;
    populatedAssignments += 1;
    assert(/^Q[1-9]\d*$/u.test(city.wikiDataId), `Malformed QID: ${city.id}`);
    assert(!qidToCity.has(city.wikiDataId), `Duplicate QID: ${city.wikiDataId}`);
    qidToCity.set(city.wikiDataId, city.id);
  }
  assert(
    populatedAssignments === report.counts.retainedAssignments,
    'Retained Wikidata QID count differs from verification report'
  );
  assert(
    report.metadata.length === populatedAssignments,
    'Wikidata metadata coverage is incomplete'
  );

  const metadataCityIds = new Set();
  for (const entry of report.metadata) {
    const city = cityById.get(entry.cityId);
    assert(city?.wikiDataId === entry.qid, `Stale Wikidata metadata: ${entry.cityId}`);
    assert(!metadataCityIds.has(entry.cityId), `Duplicate Wikidata metadata: ${entry.cityId}`);
    assert(
      ['high', 'medium', 'low'].includes(entry.confidence),
      `Bad QID confidence: ${entry.cityId}`
    );
    assert(
      entry.status === 'verified' || entry.status === 'partial',
      `Bad QID status: ${entry.cityId}`
    );
    metadataCityIds.add(entry.cityId);
  }

  const clearedIds = new Set([
    ...report.duplicateGroups.flatMap((group) => group.cityIds),
    ...report.uniqueRejected.map((entry) => entry.cityId),
  ]);
  assert(clearedIds.size === report.counts.clearedAssignments, 'Wikidata cleared count is stale');
  for (const cityId of clearedIds) {
    assert(!cityById.get(cityId)?.wikiDataId, `Rejected QID is still published: ${cityId}`);
  }
  assert(
    report.counts.duplicateGroups === report.duplicateGroups.length,
    'QID group count is stale'
  );
  assert(
    report.counts.high + report.counts.medium + report.counts.low === populatedAssignments,
    'Wikidata confidence counts are stale'
  );
}

async function validateProvenance(manifest) {
  assert(manifest.schemaVersion === 1, 'Unsupported provenance schema');
  assert(manifest.database?.license?.id, 'Database license is missing');
  assert(manifest.database?.license?.url, 'Database license URL is missing');
  assert(manifest.database?.attribution, 'Database attribution is missing');
  assert(manifest.policy?.unknownSourceAction === 'reject', 'Unknown-source policy must reject');
  assert(
    Array.isArray(manifest.sources) && manifest.sources.length > 0,
    'No data sources registered'
  );

  const sourceIds = new Set();
  for (const source of manifest.sources) {
    assert(source.id && !sourceIds.has(source.id), `Missing or duplicate source ID: ${source.id}`);
    sourceIds.add(source.id);
    assert(source.url, `Source URL is missing: ${source.id}`);
    assert(source.license?.id && source.license?.url, `Source license is missing: ${source.id}`);
    assert(
      source.originalImport?.upstreamRevision || source.verificationBaseline?.revision,
      `Source revision or verification baseline is missing: ${source.id}`
    );
    assert(
      source.originalImport?.importedAt || source.verificationBaseline?.verifiedAt,
      `Source date is missing: ${source.id}`
    );
    assert(
      Array.isArray(source.productionFiles) && source.productionFiles.length > 0,
      `Production file registry is missing: ${source.id}`
    );

    for (const file of source.productionFiles.filter((entry) => !entry.includes('*'))) {
      await stat(path.join(root, file));
    }
  }
}
