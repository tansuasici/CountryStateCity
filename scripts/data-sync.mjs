import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildIdentityReport } from './lib/identity.mjs';
import { buildArtifactManifest, buildDistributionArtifacts } from './lib/data-artifacts.mjs';
import { normalizeParentFields } from './lib/parent-fields.mjs';
import { applyWikidataQidCleanup } from './lib/wikidata-qids.mjs';
import { applyCountryMetadataPolicy } from './lib/country-metadata.mjs';
import { applyEntityLevelPolicy } from './lib/entity-levels.mjs';
import { applyStateCoordinatePolicy } from './lib/state-coordinates.mjs';
import { applySchemaNormalization } from './lib/schema-normalization.mjs';
import { applyTimezonePolicy } from './lib/timezones.mjs';

const root = path.resolve(import.meta.dirname, '..');
const args = new Set(process.argv.slice(2));
const configPath = path.join(root, 'data/sources/dr5hn-v3.2-export.7.json');
const config = JSON.parse(await readFile(configPath, 'utf8'));
const patchManifest = JSON.parse(await readFile(path.join(root, config.patchFile), 'utf8'));
const wikidataQidReport = JSON.parse(
  await readFile(path.join(root, 'data/identity/wikidata-qid-verification.json'), 'utf8')
);
const countryMetadataPolicy = JSON.parse(
  await readFile(path.join(root, 'data/country-metadata-policy.json'), 'utf8')
);
const entityLevelPolicy = JSON.parse(
  await readFile(path.join(root, 'data/entity-level-policy.json'), 'utf8')
);
const locationDisplay = JSON.parse(
  await readFile(path.join(root, 'data/location-display.json'), 'utf8')
);
const stateCoordinatePolicy = JSON.parse(
  await readFile(path.join(root, 'data/geography/state-coordinate-policy.json'), 'utf8')
);
const schemaNormalizationPolicy = JSON.parse(
  await readFile(path.join(root, 'data/schema-normalization-policy.json'), 'utf8')
);
const timezonePolicy = JSON.parse(
  await readFile(path.join(root, 'data/timezone-policy.json'), 'utf8')
);
const productionManifest = JSON.parse(
  await readFile(path.join(root, 'data/production-manifest.json'), 'utf8')
);
const runId = `${config.source.release}-${Date.now()}-${process.pid}`;
const syncRoot = path.join(root, '.data-sync');
const cacheDir = path.join(syncRoot, 'cache');
const runDir = path.join(syncRoot, 'runs', runId);
const rawDir = path.join(runDir, 'raw');
const normalizedDir = path.join(runDir, 'normalized');
const productionDir = path.join(runDir, 'production');
const reportDir = path.join(runDir, 'reports');

await Promise.all([cacheDir, rawDir, normalizedDir, productionDir, reportDir].map(mkdirRecursive));

const rawAssets = {};
for (const [name, asset] of Object.entries(config.assets)) {
  const bytes = await loadPinnedAsset(name, asset);
  rawAssets[name] = bytes;
  const extension = asset.compression === 'gzip' ? '.json.gz' : '.json';
  await writeFile(path.join(rawDir, `${name}${extension}`), bytes);
}

const upstream = {
  countries: parseAsset(rawAssets.countries, config.assets.countries),
  states: parseAsset(rawAssets.states, config.assets.states),
  cities: parseAsset(rawAssets.cities, config.assets.cities),
};
const canonical = normalize(upstream);
applyPatches(canonical, patchManifest);
applyCountryMetadataPolicy(canonical.countries, countryMetadataPolicy);
applySchemaNormalization(canonical.countries, canonical.states, schemaNormalizationPolicy);
applyTimezonePolicy(canonical.countries, timezonePolicy);
normalizeParentFields(canonical);
applyWikidataQidCleanup(canonical.cities, wikidataQidReport);
applyEntityLevelPolicy(canonical, entityLevelPolicy, locationDisplay);
applyStateCoordinatePolicy(canonical.states, stateCoordinatePolicy, { allowUnreviewed: true });
sortCanonical(canonical);

await Promise.all([
  writeJson(path.join(normalizedDir, 'country.json'), canonical.countries, true),
  writeJson(path.join(normalizedDir, 'state.json'), canonical.states, true),
  writeJson(path.join(normalizedDir, 'city.json'), canonical.cities, true),
]);

const qualityReport = validateCanonical(canonical);
await writeJson(path.join(reportDir, 'quality-report.json'), qualityReport, true);
enforceQuality(qualityReport, config.validation);

const current = {
  countries: JSON.parse(await readFile(path.join(root, 'data/country.json'), 'utf8')),
  states: JSON.parse(await readFile(path.join(root, 'data/state.json'), 'utf8')),
  cities: JSON.parse(await readFile(path.join(root, 'data/city.json'), 'utf8')),
};
const changeReport = buildChangeReport(current, canonical);
const identityReport = buildIdentityReport(current, canonical, {
  fromDataVersion: productionManifest.dataVersion,
  toSource: {
    id: config.source.id,
    release: config.source.release,
    revision: config.source.revision,
  },
});
const schemaDiff = buildSchemaDiff(current, canonical);
const sourceManifest = buildSourceManifest(config, rawAssets, canonical);

await Promise.all([
  writeJson(path.join(reportDir, 'source-manifest.json'), sourceManifest, true),
  writeJson(path.join(reportDir, 'change-report.json'), changeReport, true),
  writeJson(path.join(reportDir, 'identity-report.json'), identityReport, true),
  writeJson(path.join(reportDir, 'schema-diff.json'), schemaDiff, true),
]);

const artifacts = buildDistributionArtifacts(canonical, { includeCanonical: true });
const outputManifest = await writeArtifacts(productionDir, artifacts);
await writeJson(path.join(reportDir, 'output-manifest.json'), outputManifest, true);

if (args.has('--verify-reproducible')) {
  const secondManifest = buildArtifactManifest(
    buildDistributionArtifacts(canonical, { includeCanonical: true }),
    { sourceRelease: config.source.release }
  );
  assert(
    secondManifest.digest === outputManifest.digest,
    `Non-reproducible output: ${outputManifest.digest} != ${secondManifest.digest}`
  );
}

if (args.has('--record-report')) {
  const recordedDir = path.join(root, 'data/sync-reports', config.source.release);
  await mkdir(recordedDir, { recursive: true });
  for (const name of [
    'source-manifest.json',
    'change-report.json',
    'identity-report.json',
    'schema-diff.json',
    'quality-report.json',
    'output-manifest.json',
  ]) {
    await writeFile(path.join(recordedDir, name), await readFile(path.join(reportDir, name)));
  }
  await writeJson(
    path.join(recordedDir, 'change-summary.json'),
    summarizeChanges(changeReport),
    true
  );
}

if (args.has('--apply')) {
  assert(identityReport.gate.passed, identityReport.gate.message);
  assert(
    config.apply?.enabled === true,
    `Production apply is disabled: ${config.apply?.reason} Blocked by: ${(config.apply?.blockedBy ?? []).join(', ')}`
  );
  await applyArtifacts(artifacts);
}

const summary = {
  release: config.source.release,
  revision: config.source.revision,
  counts: qualityReport.counts,
  changes: Object.fromEntries(
    Object.entries(changeReport.entities).map(([entity, report]) => [entity, report.counts])
  ),
  outputDigest: outputManifest.digest,
  identityGate: identityReport.gate,
  reproducible: args.has('--verify-reproducible'),
  applied: args.has('--apply'),
  reportDir: path.relative(root, reportDir),
};
console.log(JSON.stringify(summary, null, 2));

async function loadPinnedAsset(name, asset) {
  const cachePath = path.join(cacheDir, `${name}-${asset.sha256}.asset`);
  let bytes;
  try {
    bytes = await readFile(cachePath);
  } catch {
    assert(!args.has('--offline'), `Pinned ${name} asset is not cached`);
    const response = await fetch(asset.url, { redirect: 'follow' });
    assert(response.ok, `Failed to fetch ${name}: ${response.status} ${response.statusText}`);
    bytes = Buffer.from(await response.arrayBuffer());
    await writeFile(cachePath, bytes);
  }
  assert(bytes.length === asset.bytes, `${name} byte size mismatch: ${bytes.length}`);
  assert(sha256(bytes) === asset.sha256, `${name} SHA-256 mismatch`);
  return bytes;
}

function parseAsset(bytes, asset) {
  const json = asset.compression === 'gzip' ? gunzipSync(bytes) : bytes;
  const parsed = JSON.parse(json.toString('utf8'));
  assert(Array.isArray(parsed), `Source asset is not an array: ${asset.url}`);
  return parsed;
}

function normalize(source) {
  const countries = source.countries.map((country) => ({
    id: country.id,
    name: country.name,
    iso3: country.iso3,
    iso2: country.iso2,
    numericCode: country.numeric_code ?? '',
    phoneCode: country.phonecode ?? '',
    capital: country.capital ?? '',
    currency: country.currency ?? '',
    currencyName: country.currency_name ?? '',
    currencySymbol: country.currency_symbol ?? '',
    tld: country.tld ?? '',
    native: country.native ?? '',
    region: country.region ?? '',
    subregion: country.subregion ?? '',
    timezones: country.timezones ?? [],
    translations: country.translations ?? {},
    latitude: country.latitude ?? '',
    longitude: country.longitude ?? '',
    emoji: country.emoji ?? '',
    emojiU: country.emojiU ?? '',
  }));
  const countryById = new Map(countries.map((country) => [country.id, country]));

  const states = source.states.map((state) => {
    const country = countryById.get(state.country_id);
    return {
      id: state.id,
      name: state.name,
      countryId: state.country_id,
      countryCode: country?.iso2 ?? state.country_code ?? '',
      countryName: country?.name ?? state.country_name ?? '',
      stateCode: state.iso2 ?? '',
      type: state.type ?? null,
      latitude: state.latitude ?? '',
      longitude: state.longitude ?? '',
    };
  });
  const stateById = new Map(states.map((state) => [state.id, state]));

  const cities = source.cities.map((city) => {
    const state = stateById.get(city.state_id);
    const country = countryById.get(city.country_id);
    return {
      id: city.id,
      name: city.name,
      stateId: city.state_id,
      stateCode: state?.stateCode ?? city.state_code ?? '',
      stateName: state?.name ?? city.state_name ?? '',
      countryId: city.country_id,
      countryCode: country?.iso2 ?? city.country_code ?? '',
      countryName: country?.name ?? city.country_name ?? '',
      latitude: city.latitude ?? '',
      longitude: city.longitude ?? '',
      wikiDataId: city.wikiDataId ?? '',
    };
  });

  return { countries, states, cities };
}

function applyPatches(canonical, manifest) {
  assert(manifest.sourceRelease === config.source.release, 'Patch release does not match source');
  const collectionByEntity = {
    country: 'countries',
    state: 'states',
    city: 'cities',
  };
  for (const patch of manifest.patches) {
    const collection = collectionByEntity[patch.entity];
    const rows = canonical[collection];
    assert(rows, `Unknown patch entity: ${patch.entity}`);
    const index = rows.findIndex((row) => row.id === patch.id);
    if (patch.operation === 'merge') {
      assert(index !== -1, `Merge target is missing: ${patch.entity}/${patch.id}`);
      rows[index] = { ...rows[index], ...patch.changes, id: patch.id };
    } else if (patch.operation === 'upsert') {
      const value = { ...patch.value, id: patch.id };
      if (index === -1) rows.push(value);
      else rows[index] = value;
    } else if (patch.operation === 'delete') {
      assert(index !== -1, `Delete target is missing: ${patch.entity}/${patch.id}`);
      rows.splice(index, 1);
    } else {
      throw new Error(`Unsupported patch operation: ${patch.operation}`);
    }
  }
}

function sortCanonical(canonical) {
  for (const rows of Object.values(canonical)) rows.sort((a, b) => a.id - b.id);
}

function validateCanonical(canonical) {
  const duplicateIds = {};
  for (const [entity, rows] of Object.entries(canonical)) {
    const seen = new Set();
    duplicateIds[entity] = [];
    for (const row of rows) {
      if (seen.has(row.id)) duplicateIds[entity].push(row.id);
      seen.add(row.id);
    }
  }

  const countryIds = new Set(canonical.countries.map((row) => row.id));
  const stateIds = new Set(canonical.states.map((row) => row.id));
  const orphanStates = canonical.states
    .filter((row) => !countryIds.has(row.countryId))
    .map((row) => row.id);
  const orphanCityCountries = canonical.cities
    .filter((row) => !countryIds.has(row.countryId))
    .map((row) => row.id);
  const orphanCityStates = canonical.cities
    .filter((row) => !stateIds.has(row.stateId))
    .map((row) => row.id);

  const exactSeen = new Map();
  const exactDuplicateCities = [];
  for (const city of canonical.cities) {
    const { id, ...values } = city;
    const key = stableStringify(values);
    if (exactSeen.has(key)) exactDuplicateCities.push([exactSeen.get(key), id]);
    else exactSeen.set(key, id);
  }

  const coordinates = Object.fromEntries(
    Object.entries(canonical).map(([entity, rows]) => {
      const missing = [];
      const invalid = [];
      for (const row of rows) {
        if (coordinateMissing(row.latitude, row.longitude)) missing.push(row.id);
        else if (!validCoordinate(row.latitude, row.longitude)) invalid.push(row.id);
      }
      return [entity, { missing, invalid }];
    })
  );

  return {
    sourceRelease: config.source.release,
    counts: {
      countries: canonical.countries.length,
      states: canonical.states.length,
      cities: canonical.cities.length,
    },
    duplicateIds,
    orphanReferences: {
      states: orphanStates,
      cityCountries: orphanCityCountries,
      cityStates: orphanCityStates,
    },
    exactDuplicateCities,
    coordinates,
    passed:
      Object.values(duplicateIds).every((ids) => ids.length === 0) &&
      orphanStates.length === 0 &&
      orphanCityCountries.length === 0 &&
      orphanCityStates.length === 0 &&
      exactDuplicateCities.length === 0 &&
      Object.values(coordinates).every(({ invalid }) => invalid.length === 0),
  };
}

function enforceQuality(report, limits) {
  const duplicates = Object.values(report.duplicateIds).reduce((sum, ids) => sum + ids.length, 0);
  const orphans = Object.values(report.orphanReferences).reduce((sum, ids) => sum + ids.length, 0);
  assert(duplicates <= limits.maximumDuplicateIds, `Duplicate ID limit exceeded: ${duplicates}`);
  assert(orphans <= limits.maximumOrphanReferences, `Orphan limit exceeded: ${orphans}`);
  assert(
    report.exactDuplicateCities.length <= limits.maximumExactDuplicateCities,
    `Exact duplicate city limit exceeded: ${report.exactDuplicateCities.length}`
  );
  const invalidCoordinates = Object.values(report.coordinates).reduce(
    (sum, coordinates) => sum + coordinates.invalid.length,
    0
  );
  assert(
    invalidCoordinates <= limits.maximumInvalidCoordinates,
    `Invalid coordinate limit exceeded: ${invalidCoordinates}`
  );
}

function buildChangeReport(current, staged) {
  const entities = {};
  for (const entity of ['countries', 'states', 'cities']) {
    const before = new Map(current[entity].map((row) => [row.id, row]));
    const after = new Map(staged[entity].map((row) => [row.id, row]));
    const addedIds = [...after.keys()].filter((id) => !before.has(id)).sort(numberSort);
    const removedIds = [...before.keys()].filter((id) => !after.has(id)).sort(numberSort);
    const changed = [];
    for (const id of [...before.keys()].filter((value) => after.has(value)).sort(numberSort)) {
      const fields = changedFields(before.get(id), after.get(id));
      if (fields.length > 0) changed.push({ id, fields });
    }
    entities[entity] = {
      counts: {
        before: before.size,
        after: after.size,
        added: addedIds.length,
        removed: removedIds.length,
        changed: changed.length,
      },
      addedIds,
      removedIds,
      changed,
      changedFieldCounts: Object.fromEntries(
        [...new Set(changed.flatMap(({ fields }) => fields))]
          .sort(compareText)
          .map((field) => [field, changed.filter(({ fields }) => fields.includes(field)).length])
      ),
    };
  }
  return { sourceRelease: config.source.release, entities };
}

function summarizeChanges(report) {
  return {
    sourceRelease: report.sourceRelease,
    entities: Object.fromEntries(
      Object.entries(report.entities).map(([entity, details]) => [
        entity,
        { counts: details.counts, changedFieldCounts: details.changedFieldCounts },
      ])
    ),
  };
}

function buildSchemaDiff(current, staged) {
  const entities = {};
  for (const entity of ['countries', 'states', 'cities']) {
    const before = schemaFor(current[entity]);
    const after = schemaFor(staged[entity]);
    entities[entity] = {
      before,
      after,
      addedFields: Object.keys(after)
        .filter((field) => !(field in before))
        .sort(),
      removedFields: Object.keys(before)
        .filter((field) => !(field in after))
        .sort(),
      changedTypes: Object.keys(before)
        .filter(
          (field) =>
            field in after && stableStringify(before[field]) !== stableStringify(after[field])
        )
        .sort(),
    };
  }
  return { sourceRelease: config.source.release, entities };
}

function buildSourceManifest(sourceConfig, assets, canonical) {
  return {
    schemaVersion: 1,
    source: sourceConfig.source,
    assets: Object.fromEntries(
      Object.entries(sourceConfig.assets).map(([name, asset]) => [
        name,
        { ...asset, verifiedSha256: sha256(assets[name]) },
      ])
    ),
    patchFile: sourceConfig.patchFile,
    patchDigest: sha256(stableStringify(patchManifest)),
    counts: {
      countries: canonical.countries.length,
      states: canonical.states.length,
      cities: canonical.cities.length,
    },
  };
}

async function writeArtifacts(baseDir, artifacts) {
  for (const [relativePath, content] of artifacts) {
    const destination = path.join(baseDir, relativePath);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, content);
  }
  return buildArtifactManifest(artifacts, { sourceRelease: config.source.release });
}

async function applyArtifacts(artifacts) {
  for (const [relativePath, content] of artifacts) {
    const destination = path.join(root, relativePath);
    assert(destination.startsWith(`${root}${path.sep}`), `Unsafe apply path: ${relativePath}`);
    await mkdir(path.dirname(destination), { recursive: true });
    const temporary = `${destination}.sync-${process.pid}`;
    await writeFile(temporary, content);
    await rename(temporary, destination);
  }
}

function schemaFor(rows) {
  const schema = {};
  for (const row of rows) {
    for (const [field, value] of Object.entries(row)) {
      const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
      const types = new Set(schema[field] ?? []);
      types.add(type);
      schema[field] = [...types].sort();
    }
  }
  return Object.fromEntries(Object.entries(schema).sort(([a], [b]) => compareText(a, b)));
}

function changedFields(before, after) {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((field) => stableStringify(before[field]) !== stableStringify(after[field]))
    .sort();
}

function validCoordinate(latitude, longitude) {
  if (isBlank(latitude) || isBlank(longitude)) return false;
  const lat = Number(latitude);
  const lon = Number(longitude);
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

function coordinateMissing(latitude, longitude) {
  return isBlank(latitude) && isBlank(longitude);
}

function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === '';
}

function prettyJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function writeJson(file, value, pretty) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, pretty ? prettyJson(value) : JSON.stringify(value));
}

function stableStringify(value) {
  if (value === undefined) return 'undefined';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(',')}}`;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function numberSort(a, b) {
  return a - b;
}

function compareText(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function mkdirRecursive(directory) {
  return mkdir(directory, { recursive: true });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
