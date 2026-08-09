import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { prettyJson } from './lib/data-artifacts.mjs';

const root = path.resolve(import.meta.dirname, '..');
const args = new Set(process.argv.slice(2));
const batchSize = 500;
const cacheRoot = path.join(root, '.data-sync/wikidata-qid-batches');
const userAgent =
  'CountryStateCity/2.0.15 data-quality audit (https://github.com/tansuasici/CountryStateCity)';
const [cities, policy] = await Promise.all([
  readJson('data/city.json'),
  readJson('data/identity/wikidata-qid-policy.json'),
]);

const citiesByQid = new Map();
for (const city of cities) {
  if (!city.wikiDataId) continue;
  assert(/^Q[1-9]\d*$/u.test(city.wikiDataId), `Malformed QID: ${city.id}/${city.wikiDataId}`);
  const rows = citiesByQid.get(city.wikiDataId) ?? [];
  rows.push(city);
  citiesByQid.set(city.wikiDataId, rows);
}

const allowedAliases = new Set(policy.duplicatePolicy.allowedAliases.map((entry) => entry.qid));
const duplicateGroups = [...citiesByQid.entries()]
  .filter(([qid, rows]) => rows.length > 1 && !allowedAliases.has(qid))
  .sort(compareQid);
const uniqueEntries = [...citiesByQid.entries()]
  .filter(([, rows]) => rows.length === 1)
  .sort(compareQid);
const uniqueQids = uniqueEntries.map(([qid]) => qid);
const sourceDigest = sha256(uniqueQids.join('\n'));

await mkdir(cacheRoot, { recursive: true });
const resultsByQid = new Map();
const batches = [];
for (let offset = 0; offset < uniqueQids.length; offset += batchSize) {
  batches.push({
    index: Math.floor(offset / batchSize),
    qids: uniqueQids.slice(offset, offset + batchSize),
  });
}
for (let start = 0; start < batches.length; start += 4) {
  const loaded = await Promise.all(batches.slice(start, start + 4).map(loadBatch));
  for (const { index, qids, bindings } of loaded) {
    mergeBindings(resultsByQid, qids, bindings);
    if ((index + 1) % 10 === 0 || index + 1 === batches.length) {
      console.log(`Wikidata QID batches: ${index + 1}/${batches.length}`);
    }
  }
}

const metadata = [];
const uniqueRejected = [];
const counts = {
  high: 0,
  medium: 0,
  low: 0,
  rejected: 0,
  duplicateGroups: duplicateGroups.length,
  duplicateAssignments: duplicateGroups.reduce((total, [, rows]) => total + rows.length, 0),
};

for (const [qid, [city]] of uniqueEntries) {
  const evidence = resultsByQid.get(qid);
  const decision = classify(city, evidence, policy.coordinateThresholdsMeters);
  counts[decision.confidence] += 1;
  if (decision.confidence === 'rejected') {
    uniqueRejected.push({
      cityId: city.id,
      qid,
      reasonCode: decision.reasonCode,
      ...decision.details,
    });
  } else {
    metadata.push({
      cityId: city.id,
      qid,
      status: decision.status,
      confidence: decision.confidence,
      reasonCode: decision.reasonCode,
      ...decision.details,
      entityTypes: [...evidence.entityTypes].sort(compareText),
      revision: evidence.revision,
      modifiedAt: evidence.modifiedAt,
    });
  }
}

counts.rejected += duplicateGroups.reduce((total, [, rows]) => total + rows.length, 0);
const clearedCityIds = new Set([
  ...duplicateGroups.flatMap(([, rows]) => rows.map((city) => city.id)),
  ...uniqueRejected.map((entry) => entry.cityId),
]);
const report = {
  schemaVersion: 1,
  verifiedAt: policy.policyDate,
  source: policy.source,
  input: {
    cityRecords: cities.length,
    populatedAssignments: [...citiesByQid.values()].reduce((total, rows) => total + rows.length, 0),
    uniqueQids: citiesByQid.size,
    queryableUniqueAssignments: uniqueEntries.length,
    qidSetSha256: sourceDigest,
  },
  policy: {
    role: policy.role,
    primaryIdentity: policy.primaryIdentity,
    duplicateAction: policy.duplicatePolicy.defaultAction,
    coordinateThresholdsMeters: policy.coordinateThresholdsMeters,
    countryMismatchPolicy: policy.countryMismatchPolicy,
  },
  counts: {
    ...counts,
    clearedAssignments: clearedCityIds.size,
    retainedAssignments: metadata.length,
  },
  duplicateGroups: duplicateGroups.map(([qid, rows]) => ({
    qid,
    cityIds: rows.map((city) => city.id),
    countryCodes: [...new Set(rows.map((city) => city.countryCode))].sort(compareText),
    stateIds: [...new Set(rows.map((city) => city.stateId))].sort((a, b) => a - b),
  })),
  uniqueRejected,
  metadata,
};

await writeAtomic('data/identity/wikidata-qid-verification.json', prettyJson(report));

if (args.has('--apply')) {
  for (const city of cities) {
    if (clearedCityIds.has(city.id)) city.wikiDataId = '';
  }
  await writeAtomic('data/city.json', prettyJson(cities));
}

console.log(
  `Wikidata QID audit: ${counts.duplicateGroups} duplicate groups, ${clearedCityIds.size} cleared, ${metadata.length} retained; ${counts.high}/${counts.medium}/${counts.low} high/medium/low.`
);

async function fetchBatch(qids, index) {
  const query = `SELECT ?item ?statementCount ?modified ?revision ?instance ?countryCode ?coord WHERE { VALUES ?item { ${qids
    .map((qid) => `wd:${qid}`)
    .join(
      ' '
    )} } OPTIONAL { ?item wikibase:statements ?statementCount. } OPTIONAL { ?item schema:dateModified ?modified; schema:version ?revision. } OPTIONAL { ?item wdt:P31 ?instance. } OPTIONAL { ?item wdt:P17 ?country. ?country wdt:P297 ?countryCode. } OPTIONAL { ?item wdt:P625 ?coord. } }`;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(policy.source.url, {
      method: 'POST',
      headers: {
        'User-Agent': userAgent,
        Accept: 'application/sparql-results+json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ query }),
    });
    if (response.ok) return (await response.json()).results.bindings;
    if (response.status !== 429 && response.status < 500) {
      throw new Error(
        `Wikidata batch ${index} failed: ${response.status} ${await response.text()}`
      );
    }
    await delay(1000 * 2 ** attempt);
  }
  throw new Error(`Wikidata batch ${index} exhausted retries`);
}

async function loadBatch({ index, qids }) {
  const cachePath = path.join(cacheRoot, `${sourceDigest}-${String(index).padStart(4, '0')}.json`);
  let bindings;
  try {
    bindings = JSON.parse(await readFile(cachePath, 'utf8'));
  } catch {
    assert(args.has('--fetch'), `Missing Wikidata cache batch ${index}; rerun with --fetch`);
    bindings = await fetchBatch(qids, index);
    await writeFile(cachePath, JSON.stringify(bindings));
  }
  return { index, qids, bindings };
}

function mergeBindings(target, qids, bindings) {
  for (const qid of qids) {
    target.set(qid, {
      exists: false,
      entityTypes: new Set(),
      countryCodes: new Set(),
      coordinates: [],
      revision: null,
      modifiedAt: null,
    });
  }
  for (const binding of bindings) {
    const qid = binding.item?.value?.match(/Q\d+$/u)?.[0];
    if (!qid || !target.has(qid)) continue;
    const evidence = target.get(qid);
    evidence.exists ||= binding.statementCount !== undefined;
    if (binding.instance) evidence.entityTypes.add(binding.instance.value.match(/Q\d+$/u)?.[0]);
    if (binding.countryCode) evidence.countryCodes.add(binding.countryCode.value.toUpperCase());
    if (binding.coord) {
      const coordinate = parsePoint(binding.coord.value);
      if (coordinate) evidence.coordinates.push(coordinate);
    }
    evidence.revision ??= binding.revision?.value ? Number(binding.revision.value) : null;
    evidence.modifiedAt ??= binding.modified?.value ?? null;
  }
}

function classify(city, evidence, thresholds) {
  if (!evidence?.exists) {
    return {
      confidence: 'rejected',
      status: 'missing-entity',
      reasonCode: 'entity-not-found',
      details: {},
    };
  }
  const countryCodes = [...evidence.countryCodes].sort(compareText);
  const countryStatus =
    countryCodes.length === 0
      ? 'missing'
      : countryCodes.includes(city.countryCode)
        ? 'match'
        : 'mismatch-or-territorial-parent';
  const distances = evidence.coordinates.map((coordinate) =>
    distanceMeters(
      Number(city.latitude),
      Number(city.longitude),
      coordinate.latitude,
      coordinate.longitude
    )
  );
  const distanceMetersToEntity = distances.length === 0 ? null : Math.min(...distances);
  const details = {
    countryStatus,
    ...(countryCodes.length > 0 ? { countryCodes } : {}),
    distanceMeters:
      distanceMetersToEntity === null ? null : Number(distanceMetersToEntity.toFixed(1)),
  };
  if (distanceMetersToEntity !== null && distanceMetersToEntity > thresholds.automaticClearAbove) {
    return {
      confidence: 'rejected',
      status: 'coordinate-mismatch',
      reasonCode: 'coordinate-distance-over-100km',
      details,
    };
  }
  if (
    distanceMetersToEntity !== null &&
    distanceMetersToEntity <= thresholds.highConfidenceMaximum &&
    countryStatus === 'match'
  ) {
    return {
      confidence: 'high',
      status: 'verified',
      reasonCode: 'country-and-coordinate-match',
      details,
    };
  }
  if (
    distanceMetersToEntity !== null &&
    distanceMetersToEntity <= thresholds.highConfidenceMaximum
  ) {
    return { confidence: 'medium', status: 'verified', reasonCode: 'coordinate-match', details };
  }
  return {
    confidence: 'low',
    status: 'partial',
    reasonCode:
      distanceMetersToEntity === null
        ? 'coordinate-unavailable'
        : 'coordinate-distance-25-to-100km',
    details,
  };
}

function parsePoint(value) {
  const match = /^Point\((-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)\)$/u.exec(value);
  return match ? { longitude: Number(match[1]), latitude: Number(match[2]) } : null;
}

function distanceMeters(latitudeA, longitudeA, latitudeB, longitudeB) {
  const radius = 6_371_008.8;
  const toRadians = (value) => (value * Math.PI) / 180;
  const deltaLatitude = toRadians(latitudeB - latitudeA);
  const deltaLongitude = toRadians(longitudeB - longitudeA);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(latitudeA)) *
      Math.cos(toRadians(latitudeB)) *
      Math.sin(deltaLongitude / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(a));
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), 'utf8'));
}

async function writeAtomic(relativePath, content) {
  const destination = path.join(root, relativePath);
  assert(destination.startsWith(`${root}${path.sep}`), `Unsafe output path: ${relativePath}`);
  await mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.qid-${process.pid}`;
  await writeFile(temporary, content);
  await rename(temporary, destination);
}

function compareQid([left], [right]) {
  return Number(left.slice(1)) - Number(right.slice(1));
}

function compareText(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
