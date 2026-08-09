#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const args = parseArgs(process.argv.slice(2));
const provinceMetaPath = path.resolve(args['province-meta'] ?? '');
const districtMetaPath = path.resolve(args['district-meta'] ?? '');
const outputPath = path.resolve(
  args.output ?? path.join(root, 'data/sources/osm-tr-admin-boundaries-2026-08-06.json')
);

assert(args['province-meta'], '--province-meta is required');
assert(args['district-meta'], '--district-meta is required');

const [provinceMeta, districtMeta, states, districtLayer] = await Promise.all([
  readJson(provinceMetaPath),
  readJson(districtMetaPath),
  readJson(path.join(root, 'data/state.json')),
  readJson(path.join(root, 'data/admin/districts/tr.json')),
]);

const turkeyStates = states.filter((state) => state.countryCode === 'TR');
assert.equal(turkeyStates.length, 81, 'Expected 81 Türkiye provinces');
assert.equal(districtLayer.districts.length, 922, 'Expected 922 Türkiye districts');

const provinceRelations = provinceMeta.elements.filter(isAdministrativeRelation);
const districtRelations = districtMeta.elements.filter(isAdministrativeRelation);

const provinceByName = indexRelationsByName(provinceRelations);
const provinces = turkeyStates.map((state) => {
  const candidates = provinceByName.get(normalizeName(state.name)) ?? [];
  assert.equal(
    candidates.length,
    1,
    `Expected one OSM province relation for ${state.stateCode} ${state.name}; received ${candidates.length}`
  );
  return {
    ...entityReference(state, 'state'),
    ...relationReference(candidates[0]),
  };
});

const reviewedDistrictRelationOverrides = new Map([
  ['33:aydincik', 1827893],
  ['53:pazar', 1838681],
  ['61:koprubasi', 1236149],
  ['67:eregli', 1840250],
  ['78:ovacik', 1245157],
  ['78:yenice', 1245153],
]);

const districtByName = indexRelationsByName(districtRelations);
const districts = districtLayer.districts.map((district) => {
  const entityKey = `${district.stateCode}:${normalizeName(district.name)}`;
  const reviewedRelationId = reviewedDistrictRelationOverrides.get(entityKey);
  const candidatesById = new Map();

  for (const name of [district.name, ...district.aliases]) {
    for (const relation of districtByName.get(normalizeName(name)) ?? []) {
      candidatesById.set(relation.id, relation);
    }
  }

  let candidates = [...candidatesById.values()];
  if (reviewedRelationId) {
    candidates = candidates.filter((relation) => relation.id === reviewedRelationId);
  } else {
    const expectedNetwork = `TR${district.stateCode}-districts`;
    const exactNetwork = candidates.filter((relation) => relation.tags.network === expectedNetwork);
    if (exactNetwork.length === 1) candidates = exactNetwork;
  }

  assert.equal(
    candidates.length,
    1,
    `Expected one OSM district relation for ${district.stateCode} ${district.name}; received ${candidates.length}`
  );

  return {
    ...entityReference(district, 'district'),
    officialCode: null,
    officialCodeStatus: 'not-published-by-validation-source',
    matchMethod: reviewedRelationId ? 'reviewed-relation-id' : 'canonical-name-and-network',
    ...relationReference(candidates[0]),
  };
});

assert.equal(new Set(provinces.map((item) => item.osmRelationId)).size, 81);
assert.equal(new Set(districts.map((item) => item.osmRelationId)).size, 922);

const snapshotDate = [
  provinceMeta.osm3s?.timestamp_osm_base,
  districtMeta.osm3s?.timestamp_osm_base,
]
  .filter(Boolean)
  .sort()
  .at(-1);

const manifest = {
  schemaVersion: 1,
  generatedAt: snapshotDate,
  source: {
    name: 'OpenStreetMap',
    license: 'ODbL-1.0',
    attribution: '© OpenStreetMap contributors',
    licenseUrl: 'https://www.openstreetmap.org/copyright',
    overpassEndpoint: 'https://overpass-api.de/api/interpreter',
    snapshotDate,
    relationQuery: 'boundary=administrative + admin_level=4/6',
  },
  counts: {
    provinces: provinces.length,
    districts: districts.length,
    reviewedDistrictRelationOverrides: reviewedDistrictRelationOverrides.size,
  },
  identityPolicy: {
    entityIdAuthority: 'CountryStateCity',
    boundaryIdAuthority: 'OpenStreetMap',
    officialDistrictCode: null,
  },
  provinces: provinces.sort((left, right) => left.stateCode.localeCompare(right.stateCode)),
  districts: districts.sort(
    (left, right) =>
      left.stateCode.localeCompare(right.stateCode) || left.name.localeCompare(right.name, 'tr')
  ),
};

await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(
  `Generated OSM boundary manifest: ${manifest.counts.provinces} provinces, ${manifest.counts.districts} districts, ${manifest.counts.reviewedDistrictRelationOverrides} reviewed overrides.`
);

function entityReference(entity, level) {
  if (level === 'state') {
    return {
      id: entity.id,
      publicId: `csc:state:${entity.id}`,
      name: entity.name,
      stateCode: entity.stateCode,
      officialCode: entity.stateCode,
      officialCodeStatus: 'published-province-code',
    };
  }
  return {
    id: entity.id,
    publicId: entity.publicId,
    name: entity.name,
    stateId: entity.stateId,
    stateCode: entity.stateCode,
    stateName: entity.stateName,
  };
}

function relationReference(relation) {
  return {
    osmRelationId: relation.id,
    osmVersion: relation.version,
    osmTimestamp: relation.timestamp,
    osmChangeset: relation.changeset,
    osmName: relation.tags.name,
    osmNetwork: relation.tags.network ?? null,
    osmWikidataId: relation.tags.wikidata ?? null,
  };
}

function indexRelationsByName(relations) {
  const result = new Map();
  for (const relation of relations) {
    for (const name of new Set([relation.tags.name, relation.tags['name:tr']].filter(Boolean))) {
      const key = normalizeName(name);
      const values = result.get(key) ?? [];
      if (!values.some((item) => item.id === relation.id)) values.push(relation);
      result.set(key, values);
    }
  }
  return result;
}

function isAdministrativeRelation(item) {
  return item.type === 'relation' && item.tags?.boundary === 'administrative';
}

function normalizeName(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replaceAll('ı', 'i')
    .replace(/\b(ilcesi|merkez)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function parseArgs(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index];
    assert(key?.startsWith('--'), `Unexpected argument: ${key}`);
    result[key.slice(2)] = values[index + 1];
  }
  return result;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}
