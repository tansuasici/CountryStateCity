#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, stat, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const options = parseArguments(process.argv.slice(2));
const geoNamesDirectory = path.resolve(options.geoNamesDirectory);

const [
  sourceManifest,
  official,
  reconciliation,
  reviewedAliases,
  coordinateOverrides,
  countries,
  states,
  cities,
] = await Promise.all([
  readJson('data/sources/geonames-tr-2026-08-05.json'),
  readJson('data/sources/tr-admin-2026-08-05.json'),
  readJson('analysis/turkey_admin_reconciliation_report.json'),
  readJson('analysis/turkey_district_reviewed_aliases.json'),
  readJson('analysis/turkey_district_coordinate_overrides.json'),
  readJson('data/country.json'),
  readJson('data/state.json'),
  readJson('data/city.json'),
]);

await verifyGeoNamesFiles(sourceManifest, geoNamesDirectory);

const country = countries.find((item) => item.iso2 === 'TR');
assert(country, 'Türkiye country record is missing');
const turkeyStates = states.filter((item) => item.countryId === country.id);
const turkeyCities = cities.filter((item) => item.countryId === country.id);
assert(
  turkeyStates.length === 81,
  `Expected 81 Türkiye provinces; received ${turkeyStates.length}`
);
assert(
  official.districts.length === 922,
  'Official validation snapshot must contain 922 districts'
);

const statesByCode = new Map(turkeyStates.map((item) => [item.stateCode, item]));
const geoNames = await loadGeoNames(geoNamesDirectory);
const legacyAliases = new Map(
  reviewedAliases.legacyCityAliases.map((item) => [item.districtSourceId, item])
);
const geoNamesAliases = new Map(
  reviewedAliases.geoNamesAliases.map((item) => [item.districtSourceId, item])
);
const coordinateReviewSourceIds = new Set(
  reconciliation.coordinateReviewQueue.map((item) => item.officialSourceId)
);
const reconciliationBySourceId = new Map(
  reconciliation.matches.map((item) => [item.officialSourceId, item])
);
const coordinateOverridesBySourceId = new Map(
  coordinateOverrides.overrides.map((item) => [item.districtSourceId, item])
);

const usedLegacyCityIds = new Set();
const usedGeoNameIds = new Set();
const districtRows = [];
const migrationRows = [];

for (const district of official.districts) {
  const state = statesByCode.get(district.provinceCode);
  assert(state, `Unknown province code ${district.provinceCode} for ${district.name}`);

  const reviewedLegacy = legacyAliases.get(district.sourceId);
  const candidates = turkeyCities.filter(
    (city) =>
      city.stateId === state.id &&
      normalizeDistrictName(city.name) === normalizeDistrictName(district.name)
  );
  const legacyCity = reviewedLegacy
    ? turkeyCities.find((city) => city.id === reviewedLegacy.legacyCityId)
    : exactlyOne(candidates, `legacy city for ${district.sourceId}`);
  assert(legacyCity, `Reviewed legacy city is missing for ${district.sourceId}`);
  assert(legacyCity.stateId === state.id, `Legacy city parent mismatch for ${district.sourceId}`);
  assert(
    !usedLegacyCityIds.has(legacyCity.id),
    `Legacy city reused by multiple districts: ${legacyCity.id}`
  );
  usedLegacyCityIds.add(legacyCity.id);

  const reviewedGeoNames = geoNamesAliases.get(district.sourceId);
  const geoNameCandidates =
    geoNames.admin2ByProvince
      .get(normalizeProvinceName(district.provinceName))
      ?.filter(
        (item) => normalizeDistrictName(item.name) === normalizeDistrictName(district.name)
      ) ?? [];
  const geoName = reviewedGeoNames
    ? geoNames.admin2ById.get(reviewedGeoNames.geoNameId)
    : exactlyOne(geoNameCandidates, `GeoNames ADM2 for ${district.sourceId}`);
  assert(geoName, `Reviewed GeoNames ADM2 is missing for ${district.sourceId}`);
  assert(!usedGeoNameIds.has(geoName.id), `GeoNames ADM2 reused: ${geoName.id}`);
  usedGeoNameIds.add(geoName.id);

  const canonicalName = reviewedLegacy?.canonicalName ?? stripDistrictSuffix(legacyCity.name);
  const aliases = [
    ...new Set([legacyCity.name, geoName.name].filter((name) => name !== canonicalName)),
  ];
  const publicId = `csc:district:${legacyCity.id}`;
  const reconciliationMatch = reconciliationBySourceId.get(district.sourceId);
  const coordinateOverride = coordinateOverridesBySourceId.get(district.sourceId);
  const validationDistanceKm = reconciliationMatch
    ? Math.min(
        haversineKm(
          Number(legacyCity.latitude),
          Number(legacyCity.longitude),
          reconciliationMatch.hgmLatitude,
          reconciliationMatch.hgmLongitude
        ),
        reconciliationMatch.officialLatitude === null
          ? Number.POSITIVE_INFINITY
          : haversineKm(
              Number(legacyCity.latitude),
              Number(legacyCity.longitude),
              reconciliationMatch.officialLatitude,
              reconciliationMatch.officialLongitude
            )
      )
    : Number.POSITIVE_INFINITY;
  const isCoordinateConflict = coordinateReviewSourceIds.has(district.sourceId);
  const coordinateStatus = coordinateOverride
    ? 'corrected'
    : isCoordinateConflict && validationDistanceKm <= 2
      ? 'corroborated'
      : isCoordinateConflict
        ? 'review-required'
        : 'source';

  districtRows.push({
    id: legacyCity.id,
    publicId,
    name: canonicalName,
    aliases,
    entityType: 'district',
    countryId: country.id,
    countryCode: country.iso2,
    countryName: country.name,
    stateId: state.id,
    stateCode: state.stateCode,
    stateName: state.name,
    latitude: coordinateOverride?.latitude ?? legacyCity.latitude,
    longitude: coordinateOverride?.longitude ?? legacyCity.longitude,
    coordinateStatus,
    coordinateSource: coordinateOverride?.source ?? 'dr5hn-countries-states-cities-database',
    coordinateValidation: coordinateOverride
      ? `admin-centre:${coordinateOverride.sourceId}`
      : coordinateStatus === 'corroborated'
        ? 'cross-source-within-2km'
        : coordinateStatus === 'source'
          ? 'source-provided'
          : 'unresolved-source-conflict',
    geoNameId: geoName.id,
    wikiDataId: legacyCity.wikiDataId || null,
    officialDistrictCode: null,
    officialDistrictCodeStatus: 'not-published-by-validation-source',
    sourceSnapshotDate: official.snapshotDate,
  });

  migrationRows.push({
    legacyPublicId: `csc:city:${legacyCity.id}`,
    districtPublicId: publicId,
    legacyName: legacyCity.name,
    canonicalName,
    stateId: state.id,
    stateCode: state.stateCode,
    matchMethod: reviewedLegacy ? 'reviewed-alias' : 'normalized-name-and-parent',
    relationship: 'legacy-city-record-reclassified-as-district-centre',
  });
}

districtRows.sort(compareDistricts);
migrationRows.sort((left, right) => compareText(left.districtPublicId, right.districtPublicId));
const remainingPlaces = turkeyCities
  .filter((city) => !usedLegacyCityIds.has(city.id))
  .map((city) => ({
    publicId: `csc:city:${city.id}`,
    id: city.id,
    name: city.name,
    stateId: city.stateId,
    stateCode: city.stateCode,
    stateName: city.stateName,
    entityType: 'place',
    classificationStatus: 'verified-not-current-district',
  }))
  .sort((left, right) => left.id - right.id);

assert(districtRows.length === 922, `Expected 922 district rows; received ${districtRows.length}`);
assert(
  usedLegacyCityIds.size === 922,
  'District layer does not have one legacy identity per district'
);
assert(
  usedGeoNameIds.size === 922,
  'District layer does not have one GeoNames identity per district'
);
assert(
  remainingPlaces.length === 104,
  `Expected 104 non-district legacy places; received ${remainingPlaces.length}`
);

const districtLayer = {
  schemaVersion: 1,
  dataVersion: official.snapshotDate,
  entityType: 'district',
  countryCode: 'TR',
  identityPolicy: {
    publicIdFormat: 'csc:district:{legacyNumericId}',
    publicIdAuthority: 'CountryStateCity',
    officialDistrictCode: null,
    note: 'The numeric component preserves the matched legacy city identity. It is not an official government district code.',
  },
  sources: [
    {
      id: 'dr5hn-countries-states-cities-database',
      role: 'published centre coordinates and legacy public identity',
      license: 'ODbL-1.0',
    },
    {
      id: 'geonames',
      role: 'open ADM2 source identity and name corroboration',
      snapshotDate: sourceManifest.snapshotDate,
      license: 'CC-BY-4.0',
    },
    {
      id: 'openstreetmap',
      role: 'reviewed district admin-centre correction',
      snapshotDate: official.snapshotDate,
      license: 'ODbL-1.0',
    },
  ],
  verification: {
    hierarchyReference: official.source.url,
    hierarchySnapshotDate: official.snapshotDate,
    hgmArchiveSha256: reconciliation.sources.hgm.sha256,
    note: 'Restricted validation sources are not redistributed in this production layer.',
  },
  counts: {
    provinces: 81,
    districts: districtRows.length,
    coordinateSource: districtRows.filter((item) => item.coordinateStatus === 'source').length,
    coordinateCorroborated: districtRows.filter((item) => item.coordinateStatus === 'corroborated')
      .length,
    coordinateCorrected: districtRows.filter((item) => item.coordinateStatus === 'corrected')
      .length,
    coordinateReviewRequired: districtRows.filter(
      (item) => item.coordinateStatus === 'review-required'
    ).length,
    reviewedLegacyAliases: legacyAliases.size,
    reviewedGeoNamesAliases: geoNamesAliases.size,
  },
  districts: districtRows,
};

const migration = {
  schemaVersion: 1,
  migrationId: '2026-08-tr-city-to-district-layer',
  dataVersion: official.snapshotDate,
  countryCode: 'TR',
  mode: 'non-destructive-alias',
  note: 'Legacy city records remain available for backward compatibility. Consumers that need the administrative district grain should use districtPublicId.',
  counts: {
    districtAliases: migrationRows.length,
    remainingPlaces: remainingPlaces.length,
  },
  aliases: migrationRows,
  remainingPlaces,
};

await mkdir(path.dirname(path.resolve(options.output)), { recursive: true });
await mkdir(path.dirname(path.resolve(options.migrationOutput)), { recursive: true });
await Promise.all([
  writeFile(path.resolve(options.output), `${JSON.stringify(districtLayer, null, 2)}\n`),
  writeFile(path.resolve(options.migrationOutput), `${JSON.stringify(migration, null, 2)}\n`),
]);

console.log(
  `Generated ${districtRows.length} Türkiye districts, ${migrationRows.length} legacy aliases and ${remainingPlaces.length} remaining places.`
);

async function loadGeoNames(directory) {
  const [countryText, admin1Text] = await Promise.all([
    readFile(path.join(directory, 'TR.txt'), 'utf8'),
    readFile(path.join(directory, 'admin1CodesASCII.txt'), 'utf8'),
  ]);
  const provinceNames = new Map(
    admin1Text
      .trim()
      .split('\n')
      .filter((line) => line.startsWith('TR.'))
      .map((line) => {
        const [code, name] = line.split('\t');
        return [code.slice(3), name];
      })
  );
  const admin2ById = new Map();
  const admin2ByProvince = new Map();
  for (const line of countryText.trim().split('\n')) {
    const fields = line.split('\t');
    if (fields[6] !== 'A' || fields[7] !== 'ADM2') continue;
    const item = {
      id: Number(fields[0]),
      name: fields[1],
      latitude: Number(fields[4]),
      longitude: Number(fields[5]),
      admin1Code: fields[10],
      admin2Code: fields[11],
      modifiedAt: fields[18],
    };
    admin2ById.set(item.id, item);
    const provinceName = normalizeProvinceName(provinceNames.get(item.admin1Code) ?? '');
    const group = admin2ByProvince.get(provinceName) ?? [];
    group.push(item);
    admin2ByProvince.set(provinceName, group);
  }
  assert(admin2ById.size === 974, `Expected 974 GeoNames ADM2 rows; received ${admin2ById.size}`);
  return { admin2ById, admin2ByProvince };
}

async function verifyGeoNamesFiles(manifest, directory) {
  for (const expected of manifest.files) {
    const file = path.join(directory, expected.name);
    const fileStats = await stat(file);
    assert(fileStats.size === expected.bytes, `GeoNames byte size changed for ${expected.name}`);
    const digest = createHash('sha256')
      .update(await readFile(file))
      .digest('hex');
    assert(digest === expected.sha256, `GeoNames SHA-256 changed for ${expected.name}`);
  }
}

function normalizeDistrictName(value) {
  return normalize(value)
    .replace(/\b(ilcesi|district)\b/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

function normalizeProvinceName(value) {
  return normalize(value)
    .replace(/\bprovince\b/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

function normalize(value) {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('tr-TR')
    .replaceAll('ı', 'i')
    .replace(/[^a-z0-9]+/gu, ' ')
    .trim();
}

function stripDistrictSuffix(value) {
  return value
    .replace(/\s+İlçesi$/u, '')
    .normalize('NFC')
    .trim();
}

function haversineKm(latitude1, longitude1, latitude2, longitude2) {
  const radius = 6371.0088;
  const radians = (value) => (value * Math.PI) / 180;
  const deltaLatitude = radians(latitude2 - latitude1);
  const deltaLongitude = radians(longitude2 - longitude1);
  const value =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(radians(latitude1)) * Math.cos(radians(latitude2)) * Math.sin(deltaLongitude / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(value));
}

function exactlyOne(values, label) {
  assert(values.length === 1, `Expected one ${label}; received ${values.length}`);
  return values[0];
}

function compareDistricts(left, right) {
  return Number(left.stateCode) - Number(right.stateCode) || compareText(left.name, right.name);
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), 'utf8'));
}

function parseArguments(arguments_) {
  const result = {
    geoNamesDirectory: null,
    output: 'data/admin/districts/tr.json',
    migrationOutput: 'data/migrations/tr-city-to-district.json',
  };
  for (let index = 0; index < arguments_.length; index += 1) {
    if (arguments_[index] === '--geonames-dir') result.geoNamesDirectory = arguments_[index + 1];
    if (arguments_[index] === '--output') result.output = arguments_[index + 1];
    if (arguments_[index] === '--migration-output') result.migrationOutput = arguments_[index + 1];
  }
  if (!result.geoNamesDirectory) {
    throw new Error('Usage: generate-turkey-district-layer.mjs --geonames-dir <directory>');
  }
  return result;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
