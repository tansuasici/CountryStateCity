import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access } from 'node:fs/promises';

const [manifest, report, config] = await Promise.all([
  readJson('../data/sources/osm-tr-admin-boundaries-2026-08-06.json'),
  readJson('../analysis/turkey_osm_boundary_etl_report.json'),
  readJson('../analysis/turkey_osm_boundary_etl_config.json'),
]);

assert.equal(manifest.schemaVersion, 1);
assert.equal(manifest.source.license, 'ODbL-1.0');
assert.equal(manifest.counts.provinces, 81);
assert.equal(manifest.counts.districts, 922);
assert.equal(manifest.counts.reviewedDistrictRelationOverrides, 6);
assert.equal(new Set(manifest.provinces.map((item) => item.publicId)).size, 81);
assert.equal(new Set(manifest.provinces.map((item) => item.osmRelationId)).size, 81);
assert.equal(new Set(manifest.districts.map((item) => item.publicId)).size, 922);
assert.equal(new Set(manifest.districts.map((item) => item.osmRelationId)).size, 922);

assert.deepEqual(report.counts, { districts: 922, provinces: 81 });
assert.deepEqual(report.geometryModel, config.geometryModel);
assert.equal(report.fetch.provinces.versionMismatches.length, 0);
assert.equal(report.fetch.districts.versionMismatches.length, 0);
assert.equal(report.sourceTopology.provinces.positiveAreaOverlapPairs, 1);
assert.equal(report.sourceTopology.districts.positiveAreaOverlapPairs, 13);
assert.equal(report.normalization.districtOverlapRepairs.length, 13);
assert.ok(
  report.normalization.districtOverlapRepairs.every(
    (item) =>
      item.rule === 'nearest-published-district-centre' &&
      item.separationMeters === config.geometryModel.overlapSeparationMeters
  )
);
assert.equal(report.topology.provinces.invalidFeatures, 0);
assert.equal(report.topology.districts.invalidFeatures, 0);
assert.equal(report.topology.provinces.positiveAreaOverlapPairs, 0);
assert.equal(report.topology.districts.positiveAreaOverlapPairs, 0);
assert.equal(report.coverage.districtParentFailures.length, 0);
assert.equal(report.coverage.provinceInteriorGapRatio, 0);
assert.ok(Object.values(report.qualityGate.checks).every(Boolean));
assert.equal(report.qualityGate.passes, true);

const [provinceGeoJson, districtGeoJson, overviewTopology] = await Promise.all([
  readJson('../data/boundaries/tr/turkey-provinces.geojson'),
  readJson('../data/boundaries/tr/turkey-districts.geojson'),
  readJson('../data/boundaries/tr/turkey-admin-z0-4.topojson'),
]);
assert.equal(provinceGeoJson.features.length, 81);
assert.equal(districtGeoJson.features.length, 922);
assert.deepEqual(provinceGeoJson['csc:geometryModel'], config.geometryModel);
assert.deepEqual(districtGeoJson['csc:geometryModel'], config.geometryModel);
assert.ok(
  provinceGeoJson.features.every((item) => item.properties.geometryStatus === 'derived-boundary')
);
assert.ok(
  districtGeoJson.features.every(
    (item) => item.properties.geometryStatus === 'normalized-osm-boundary'
  )
);
assert.equal(overviewTopology.objects.provinces.geometries.length, 81);
assert.equal(overviewTopology.objects.districts.geometries.length, 922);

for (const [name, profile] of Object.entries(report.simplification)) {
  assert.equal(profile.validGeometry, true, `${name} contains invalid geometry`);
  assert.equal(profile.nonOverlappingGeometry, true, `${name} contains overlap`);
  assert.equal(typeof profile.coverageValid, 'boolean');
  assert.equal(profile.sha256, report.outputSha256[`turkey-admin-${name}.topojson`]);
}

for (const [filename, expectedHash] of Object.entries(report.outputSha256)) {
  const fileUrl = new URL(`../data/boundaries/tr/${filename}`, import.meta.url);
  await access(fileUrl);
  assert.equal(await sha256(fileUrl), expectedHash, `${filename} hash mismatch`);
}

console.log(
  'Türkiye boundary layer passed: 81 provinces, 922 districts, 13 documented source-overlap repairs, valid non-overlapping output, and verified zoom-profile hashes.'
);

async function readJson(relativePath) {
  const { readFile } = await import('node:fs/promises');
  return JSON.parse(await readFile(new URL(relativePath, import.meta.url), 'utf8'));
}

async function sha256(fileUrl) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(fileUrl)) hash.update(chunk);
  return hash.digest('hex');
}
