import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policy = await readJson('data/geography/city-coordinate-policy.json');
const corrections = new Map(policy.corrections.map((entry) => [entry.cityId, entry]));
const affectedCountryCodes = new Set(policy.corrections.map((entry) => entry.countryCode));

const cities = await readJson('data/city.json');
applyCanonicalCorrections(cities);
await writeFile(path.join(root, 'data/city.json'), `${JSON.stringify(cities, null, 2)}\n`);

const districtLayer = await readJson('data/admin/districts/tr.json');
applyDistrictCorrections(districtLayer.districts);
districtLayer.counts.coordinateSource = districtLayer.districts.filter(
  (item) => item.coordinateStatus === 'source'
).length;
districtLayer.counts.coordinateCorroborated = districtLayer.districts.filter(
  (item) => item.coordinateStatus === 'corroborated'
).length;
districtLayer.counts.coordinateCorrected = districtLayer.districts.filter(
  (item) => item.coordinateStatus === 'corrected'
).length;
districtLayer.counts.coordinateReviewRequired = districtLayer.districts.filter(
  (item) => item.coordinateStatus === 'review-required'
).length;
await writeFile(
  path.join(root, 'data/admin/districts/tr.json'),
  `${JSON.stringify(districtLayer, null, 2)}\n`
);

for (const relativePath of ['data/city-optimized.json', 'countrystatecity-npm/data/city.json']) {
  const rows = await readJson(relativePath);
  applyCompactCorrections(rows);
  await writeFile(path.join(root, relativePath), JSON.stringify(rows));
}

const countries = await readJson('data/country.json');
const countryIdByCode = new Map(countries.map((country) => [country.iso2, country.id]));
const index = await readJson('countrystatecity-npm/data/cities/index.json');

for (const countryCode of [...affectedCountryCodes].sort()) {
  const countryId = countryIdByCode.get(countryCode);
  assert(countryId, `Country not found: ${countryCode}`);
  const shardPath = `countrystatecity-npm/data/cities/${countryCode.toLowerCase()}.json`;
  const rows = await readJson(shardPath);
  applyCompactCorrections(rows);
  const serialized = JSON.stringify(rows);
  await writeFile(path.join(root, shardPath), serialized);
  assert(index[countryId], `Shard index entry not found: ${countryId}`);
  index[countryId].size = Buffer.byteLength(serialized);
}

await writeFile(
  path.join(root, 'countrystatecity-npm/data/cities/index.json'),
  JSON.stringify(index)
);

console.log(`Applied ${corrections.size} reviewed city coordinate corrections.`);

function applyCanonicalCorrections(rows) {
  const seen = new Set();
  for (const row of rows) {
    const correction = corrections.get(row.id);
    if (!correction) continue;
    assert(row.countryCode === correction.countryCode, `Country mismatch for city ${row.id}`);
    assertCoordinateState(row.id, row.latitude, row.longitude, correction);
    row.latitude = correction.after.latitude;
    row.longitude = correction.after.longitude;
    seen.add(row.id);
  }
  assertAllSeen(seen);
}

function applyCompactCorrections(rows) {
  const seen = new Set();
  for (const row of rows) {
    const correction = corrections.get(row.i);
    if (!correction) continue;
    assertCoordinateState(row.i, row.la, row.lo, correction);
    row.la = roundCoordinate(correction.after.latitude);
    row.lo = roundCoordinate(correction.after.longitude);
    seen.add(row.i);
  }
  const expectedHere = [...corrections.keys()].filter((id) => rows.some((row) => row.i === id));
  for (const id of expectedHere) assert(seen.has(id), `City ${id} was not updated`);
}

function applyDistrictCorrections(rows) {
  for (const row of rows) {
    const correction = corrections.get(row.id);
    if (!correction || correction.countryCode !== 'TR') continue;
    assertCoordinateState(row.id, row.latitude, row.longitude, correction);
    row.latitude = correction.after.latitude;
    row.longitude = correction.after.longitude;
    row.coordinateStatus = 'corrected';
    row.coordinateSource = correction.source.id.startsWith('openstreetmap')
      ? 'openstreetmap'
      : correction.source.id;
    row.coordinateValidation = `admin-centre:${correction.source.id}`;
  }
}

function assertCoordinateState(cityId, latitude, longitude, correction) {
  const current = [Number(latitude), Number(longitude)];
  const before = [Number(correction.before.latitude), Number(correction.before.longitude)];
  const after = [Number(correction.after.latitude), Number(correction.after.longitude)];
  const matches = ([expectedLatitude, expectedLongitude]) =>
    Math.abs(current[0] - expectedLatitude) < 0.000_051 &&
    Math.abs(current[1] - expectedLongitude) < 0.000_051;
  assert(matches(before) || matches(after), `Unexpected current coordinates for city ${cityId}`);
}

function assertAllSeen(seen) {
  for (const id of corrections.keys()) assert(seen.has(id), `City ${id} not found`);
}

function roundCoordinate(value) {
  return Math.round(Number(value) * 10_000) / 10_000;
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), 'utf8'));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
