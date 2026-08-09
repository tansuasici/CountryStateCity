import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const [source, reconciliation, aliases, districtLayer, migration] = await Promise.all([
  readJson('../data/sources/tr-admin-2026-08-05.json'),
  readJson('../analysis/turkey_admin_reconciliation_report.json'),
  readJson('../analysis/turkey_admin_reviewed_aliases.json'),
  readJson('../data/admin/districts/tr.json'),
  readJson('../data/migrations/tr-city-to-district.json'),
]);

assert.equal(source.schemaVersion, 1);
assert.equal(source.snapshotDate, '2026-08-05');
assert.equal(source.counts.provinces, 81);
assert.equal(source.counts.districts, 922);
assert.equal(source.identityPolicy.districtCode, null);
assert.match(source.identityPolicy.districtCodeStatus, /no authoritative district code/i);

const provinceCodes = new Set(source.provinces.map((item) => item.provinceCode));
const districtIds = new Set(source.districts.map((item) => item.sourceId));
assert.equal(provinceCodes.size, 81);
assert.equal(districtIds.size, 922);
assert.equal(
  source.provinces.reduce((sum, province) => sum + province.districtCount, 0),
  922
);
assert.equal(
  source.districts.filter((district) => !provinceCodes.has(district.provinceCode)).length,
  0
);
assert.deepEqual(
  source.districts
    .filter((district) => district.coordinateStatus === 'missing')
    .map((district) => district.sourceId)
    .sort(),
  ['icisleri:08:kemalpasa', 'icisleri:30:derecik']
);

assert.equal(aliases.aliases.length, 3);
assert.equal(reconciliation.counts.exactMatches, 922);
assert.equal(reconciliation.counts.unmatchedHgmCenters, 0);
assert.equal(reconciliation.counts.unmatchedOfficialDistricts, 0);
assert.equal(reconciliation.counts.officialCoordinatesMissing, 2);
assert.equal(reconciliation.counts.coordinateConflictsOver5Km, 12);
assert.equal(reconciliation.counts.coordinateConflictsOver25Km, 4);
assert.equal(reconciliation.gate.hierarchyPasses, true);
assert.equal(reconciliation.gate.coordinatePasses, false);
assert.equal(reconciliation.gate.officialDistrictCodeAvailable, false);
assert.equal(reconciliation.gate.passes, false);

assert.equal(districtLayer.schemaVersion, 1);
assert.equal(districtLayer.countryCode, 'TR');
assert.equal(districtLayer.counts.provinces, 81);
assert.equal(districtLayer.counts.districts, 922);
assert.equal(districtLayer.counts.coordinateCorroborated, 11);
assert.equal(districtLayer.counts.coordinateCorrected, 2);
assert.equal(districtLayer.counts.coordinateReviewRequired, 0);
assert.equal(districtLayer.counts.reviewedLegacyAliases, 3);
assert.equal(districtLayer.counts.reviewedGeoNamesAliases, 6);
assert.equal(new Set(districtLayer.districts.map((item) => item.id)).size, 922);
assert.equal(new Set(districtLayer.districts.map((item) => item.publicId)).size, 922);
assert.equal(new Set(districtLayer.districts.map((item) => item.geoNameId)).size, 922);
assert.equal(districtLayer.districts.filter((item) => item.name.endsWith(' İlçesi')).length, 0);
assert.equal(districtLayer.districts.filter((item) => item.name === 'Merkez').length, 0);
assert.equal(districtLayer.districts.find((item) => item.id === 107956)?.name, 'Kahramankazan');
assert.equal(districtLayer.districts.find((item) => item.id === 999001)?.name, 'Efeler');
assert.equal(districtLayer.districts.find((item) => item.id === 107590)?.name, 'Ereğli');
assert.deepEqual(
  districtLayer.districts
    .filter((item) => item.coordinateStatus === 'corrected')
    .map((item) => [item.publicId, item.coordinateSource, item.latitude, item.longitude]),
  [
    ['csc:district:108414', 'openstreetmap', '37.01974120', '35.39899190'],
    ['csc:district:107863', 'openstreetmap', '40.98109600', '29.06514473'],
  ]
);
for (const district of districtLayer.districts) {
  assert.equal(district.publicId, `csc:district:${district.id}`);
  assert.equal(district.entityType, 'district');
  assert.equal(district.officialDistrictCode, null);
  assert.ok(provinceCodes.has(district.stateCode));
}

assert.equal(migration.schemaVersion, 1);
assert.equal(migration.mode, 'non-destructive-alias');
assert.equal(migration.counts.districtAliases, 922);
assert.equal(migration.counts.remainingPlaces, 104);
assert.equal(new Set(migration.aliases.map((item) => item.legacyPublicId)).size, 922);
assert.equal(new Set(migration.remainingPlaces.map((item) => item.publicId)).size, 104);
assert.equal(
  new Set([
    ...migration.aliases.map((item) => item.legacyPublicId),
    ...migration.remainingPlaces.map((item) => item.publicId),
  ]).size,
  1026
);
const districtPublicIds = new Set(districtLayer.districts.map((item) => item.publicId));
for (const item of migration.aliases) assert.ok(districtPublicIds.has(item.districtPublicId));

console.log(
  'Türkiye district layer passed: 81 provinces, 922 districts, 922 legacy aliases, 104 remaining places; 11 coordinate conflicts corroborated, 2 corrected and 0 unresolved. The missing official-code limitation remains explicit.'
);
