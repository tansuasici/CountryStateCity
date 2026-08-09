import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const fromRef = argument('--from-ref') || latestTag();
const fromVersion = argument('--from-version') || fromRef.replace(/^v/, '');
const toVersion = argument('--to-version') || JSON.parse(await readFileAt('package.json')).version;
const releaseId = `${fromVersion}...${toVersion}`;
const outputRoot = path.join(root, 'data', 'versions', releaseId);

const currentManifest = JSON.parse(await readFileAt('data/production-manifest.json'));
const migrations = JSON.parse(await readFileAt('data/migrations/city-id-migrations.json'));
const migrationByOldId = new Map(
  migrations.migrations.map((migration) => [
    Number(migration.fromId ?? migration.previousId),
    migration,
  ])
);

const definitions = {
  country: {
    file: 'data/country.json',
    fields: [
      'name',
      'iso2',
      'iso3',
      'numericCode',
      'capital',
      'region',
      'subregion',
      'latitude',
      'longitude',
    ],
  },
  state: {
    file: 'data/state.json',
    fields: ['name', 'countryId', 'countryCode', 'stateCode', 'type', 'latitude', 'longitude'],
  },
  city: {
    file: 'data/city.json',
    fields: [
      'name',
      'stateId',
      'stateCode',
      'countryId',
      'countryCode',
      'latitude',
      'longitude',
      'wikiDataId',
    ],
  },
  district: {
    file: 'data/admin/districts/tr.json',
    fields: ['name', 'stateId', 'stateCode', 'countryId', 'countryCode', 'latitude', 'longitude'],
    unwrap: (value) => value.districts,
    optionalBefore: true,
  },
};

const allChanges = [];
const schemaChanges = [];
const entityCounts = {};

for (const [entityType, definition] of Object.entries(definitions)) {
  const currentValue = JSON.parse(await readFileAt(definition.file));
  const current = definition.unwrap ? definition.unwrap(currentValue) : currentValue;
  let previous = [];
  try {
    const previousValue = JSON.parse(readFromGit(fromRef, definition.file));
    previous = definition.unwrap ? definition.unwrap(previousValue) : previousValue;
  } catch (error) {
    if (!definition.optionalBefore) throw error;
  }

  const previousFields = fieldSet(previous);
  const currentFields = fieldSet(current);
  schemaChanges.push({
    entityType,
    addedFields: [...currentFields].filter((field) => !previousFields.has(field)).sort(),
    removedFields: [...previousFields].filter((field) => !currentFields.has(field)).sort(),
  });

  const previousById = new Map(previous.map((record) => [record.id, record]));
  const currentById = new Map(current.map((record) => [record.id, record]));
  const changes = [];

  for (const record of current) {
    const before = previousById.get(record.id);
    if (!before) {
      changes.push(changeRecord(entityType, record, ['added'], [], false));
      continue;
    }
    const fields = definition.fields.flatMap((field) =>
      equal(before[field], record[field])
        ? []
        : [{ field, before: before[field] ?? null, after: record[field] ?? null }]
    );
    if (!fields.length) continue;
    const types = classify(fields);
    changes.push(changeRecord(entityType, record, types, fields, false));
  }

  for (const record of previous) {
    if (currentById.has(record.id)) continue;
    const migration = entityType === 'city' ? migrationByOldId.get(record.id) : undefined;
    changes.push({
      ...changeRecord(entityType, record, ['removed'], [], !migration),
      migration: migration || null,
    });
  }

  entityCounts[entityType] = summarize(changes);
  allChanges.push(...changes);
}

allChanges.sort(compareChanges);
const countryGroups = new Map();
for (const change of allChanges) {
  const code = change.countryCode || 'GLOBAL';
  const bucket = countryGroups.get(code) || [];
  bucket.push(change);
  countryGroups.set(code, bucket);
}

await mkdir(path.join(outputRoot, 'countries'), { recursive: true });
await mkdir(path.join(outputRoot, 'changes'), { recursive: true });
for (const [code, changes] of [...countryGroups].sort(([a], [b]) => a.localeCompare(b))) {
  await writeJsonCompact(path.join(outputRoot, 'countries', `${code.toLowerCase()}.json`), {
    releaseId,
    countryCode: code,
    changes,
  });
}
for (const entityType of Object.keys(definitions)) {
  await writeJsonCompact(path.join(outputRoot, 'changes', `${entityType}.json`), {
    releaseId,
    entityType,
    changes: allChanges.filter((change) => change.entityType === entityType),
  });
}

const countrySummaries = [...countryGroups]
  .map(([countryCode, changes]) => ({ countryCode, ...summarize(changes) }))
  .sort((a, b) => a.countryCode.localeCompare(b.countryCode));
const summary = {
  schemaVersion: 1,
  releaseId,
  fromVersion,
  toVersion,
  fromDataVersion: `sha256:${canonicalDigest(fromRef)}`,
  toDataVersion: currentManifest.dataVersion,
  generatedAt: '2026-08-08T00:00:00.000Z',
  totals: summarize(allChanges),
  entities: entityCounts,
  countries: countrySummaries,
  schemaChanges,
  identity: {
    breakingChanges: allChanges.filter((change) => change.breakingIdentity).length,
    migratedChanges: allChanges.filter((change) => change.migration).length,
    policy: 'Removed identities are breaking unless a versioned migration maps the old public id.',
  },
  downloads: {
    jsonByEntity: Object.keys(definitions).map((type) => `changes/${type}.json`),
    jsonByCountry: 'countries/{iso2}.json',
    csv: 'changes.csv',
  },
};
await writeJson(path.join(outputRoot, 'summary.json'), summary);
await writeFile(path.join(outputRoot, 'changes.csv'), toCsv(allChanges));

const indexPath = path.join(root, 'data', 'versions', 'index.json');
let index = { schemaVersion: 1, releases: [] };
try {
  index = JSON.parse(await readFile(indexPath, 'utf8'));
} catch {
  // First versioned diff.
}
index.releases = [
  {
    releaseId,
    fromVersion,
    toVersion,
    fromDataVersion: summary.fromDataVersion,
    toDataVersion: summary.toDataVersion,
    generatedAt: summary.generatedAt,
    totals: summary.totals,
    summaryUrl: `/data/versions/${releaseId}/summary.json`,
  },
  ...index.releases.filter((release) => release.releaseId !== releaseId),
];
await writeJson(indexPath, index);
await writeFile(path.join(root, 'data', 'versions', 'feed.xml'), rss(index.releases));

console.log(
  `Version diff ${releaseId}: ${summary.totals.total} changes, ${summary.identity.breakingChanges} breaking identities, ${countryGroups.size} country shards.`
);

function changeRecord(entityType, record, changeTypes, fields, breakingIdentity) {
  return {
    publicId: `csc:${entityType}:${record.id}`,
    entityType,
    id: record.id,
    name: record.name,
    countryCode: entityType === 'country' ? record.iso2 : record.countryCode || null,
    stateCode: record.stateCode || null,
    changeTypes,
    changedFields: fields,
    breakingIdentity,
    migration: null,
  };
}

function classify(fields) {
  const names = new Set(fields.map((change) => change.field));
  const types = [];
  if (names.has('name')) types.push('renamed');
  if (names.has('countryId') || names.has('stateId')) types.push('moved');
  if (names.has('latitude') || names.has('longitude')) types.push('coordinate-changed');
  if ([...names].some((name) => /code$/i.test(name))) types.push('code-changed');
  if (
    !types.length ||
    fields.some(
      (change) => !['name', 'countryId', 'stateId', 'latitude', 'longitude'].includes(change.field)
    )
  ) {
    types.push('metadata-changed');
  }
  return [...new Set(types)];
}

function summarize(changes) {
  const changeTypeCounts = {};
  for (const change of changes) {
    for (const type of change.changeTypes)
      changeTypeCounts[type] = (changeTypeCounts[type] || 0) + 1;
  }
  return {
    total: changes.length,
    breakingIdentity: changes.filter((change) => change.breakingIdentity).length,
    changeTypes: Object.fromEntries(
      Object.entries(changeTypeCounts).sort(([a], [b]) => a.localeCompare(b))
    ),
  };
}

function fieldSet(records) {
  return new Set(records.flatMap((record) => Object.keys(record)));
}

function equal(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function compareChanges(a, b) {
  return (
    a.entityType.localeCompare(b.entityType) ||
    a.countryCode?.localeCompare(b.countryCode || '') ||
    a.id - b.id
  );
}

function canonicalDigest(ref) {
  const hash = createHash('sha256');
  for (const file of ['data/country.json', 'data/state.json', 'data/city.json']) {
    hash.update(file).update('\0').update(readFromGit(ref, file)).update('\n');
  }
  return hash.digest('hex');
}

function toCsv(changes) {
  const rows = [
    [
      'publicId',
      'entityType',
      'id',
      'name',
      'countryCode',
      'stateCode',
      'changeTypes',
      'breakingIdentity',
      'changedFields',
    ],
  ];
  for (const change of changes) {
    rows.push([
      change.publicId,
      change.entityType,
      change.id,
      change.name,
      change.countryCode || '',
      change.stateCode || '',
      change.changeTypes.join('|'),
      change.breakingIdentity,
      change.changedFields.map(({ field }) => field).join('|'),
    ]);
  }
  return `${rows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`;
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function rss(releases) {
  const items = releases
    .map(
      (release) => `    <item>
      <title>CountryStateCity ${release.toVersion} data changes</title>
      <link>https://countrystatecity.tansuasici.com/docs/version-diffs</link>
      <guid isPermaLink="false">${release.toDataVersion}</guid>
      <pubDate>${new Date(release.generatedAt).toUTCString()}</pubDate>
      <description>${release.totals.total} machine-readable changes from ${release.fromVersion} to ${release.toVersion}.</description>
    </item>`
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>CountryStateCity data releases</title>
  <link>https://countrystatecity.tansuasici.com/docs/version-diffs</link>
  <description>Versioned country, subdivision, place, and district data changes.</description>
${items}
</channel></rss>
`;
}

function readFromGit(ref, file) {
  return execFileSync('git', ['show', `${ref}:${file}`], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
}

async function readFileAt(relative) {
  return readFile(path.join(root, relative), 'utf8');
}

async function writeJson(destination, value) {
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeJsonCompact(destination, value) {
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, JSON.stringify(value));
}

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

function latestTag() {
  return execFileSync('git', ['describe', '--tags', '--abbrev=0'], {
    cwd: root,
    encoding: 'utf8',
  }).trim();
}
