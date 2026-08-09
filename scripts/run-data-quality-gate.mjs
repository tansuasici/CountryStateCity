import { createHash } from 'node:crypto';
import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildProductionManifest } from './lib/data-manifest.mjs';
import { evaluateQualityGate } from './lib/quality-gate.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checkMode = process.argv.includes('--check');
const reportPath = path.join(root, 'data/quality-report.json');
const markdownPath = path.join(root, 'data/quality-report.md');

const readJson = async (file) => JSON.parse(await readFile(path.join(root, file), 'utf8'));
const [
  countries,
  states,
  cities,
  districts,
  coverage,
  qids,
  cityCoordinates,
  stateCoordinates,
  cityCoordinateArtifact,
  distributionManifest,
  productionManifest,
  policy,
  exceptions,
  packageJson,
] = await Promise.all([
  readJson('data/country.json'),
  readJson('data/state.json'),
  readJson('data/city.json'),
  readJson('data/admin/districts/tr.json'),
  readJson('data/coverage-report.json'),
  readJson('data/identity/wikidata-qid-verification.json'),
  readJson('data/geography/city-coordinate-policy.json'),
  readJson('data/geography/state-coordinate-policy.json'),
  readJson('analysis/city_coordinate_quality_artifact.json'),
  readJson('data/distribution-manifest.json'),
  readJson('data/production-manifest.json'),
  readJson('data/quality-policy.json'),
  readJson('data/quality-exceptions.json'),
  readJson('package.json'),
]);

const checks = [];
const countryById = new Map(countries.map((row) => [row.id, row]));
const stateById = new Map(states.map((row) => [row.id, row]));
const countryDrilldown = new Map(
  countries.map((country) => [
    country.iso2,
    {
      countryId: country.id,
      countryCode: country.iso2,
      countryName: country.name,
      states: 0,
      cities: 0,
      coverageGaps: 0,
      stateCoordinateExceptions: 0,
      lowConfidenceQids: 0,
    },
  ])
);
for (const state of states) countryDrilldown.get(state.countryCode).states += 1;
for (const city of cities) countryDrilldown.get(city.countryCode).cities += 1;

function addCheck(id, title, severity, entity, findings, details = {}) {
  const exception = exceptions.entries.find((entry) => entry.checkId === id);
  const observed = Array.isArray(findings) ? findings.length : Number(findings);
  const excepted = exception?.expectedCount ?? 0;
  const unresolved = Math.max(0, observed - excepted);
  checks.push({
    id,
    title,
    severity,
    entity,
    status: unresolved === 0 ? 'passed' : 'failed',
    observed,
    excepted,
    unresolved,
    sample: Array.isArray(findings) ? findings.slice(0, 20) : [],
    ...details,
  });
}

function missingRequiredFields(rows, entity) {
  const required = policy.requiredFields[entity];
  const findings = [];
  for (const row of rows) {
    const missing = required.filter(
      (field) => row[field] === undefined || row[field] === null || row[field] === ''
    );
    if (missing.length > 0)
      findings.push({ id: row.id, countryCode: row.countryCode ?? row.iso2, missing });
  }
  return findings;
}

addCheck('schema-required-fields', 'Required schema fields are populated', 'critical', 'all', [
  ...missingRequiredFields(countries, 'country').map((item) => ({ entity: 'country', ...item })),
  ...missingRequiredFields(states, 'state').map((item) => ({ entity: 'state', ...item })),
  ...missingRequiredFields(cities, 'city').map((item) => ({ entity: 'city', ...item })),
]);

const duplicateFindings = [];
for (const [entity, rows] of [
  ['country', countries],
  ['state', states],
  ['city', cities],
  ['district', districts.districts],
]) {
  const seen = new Set();
  for (const row of rows) {
    if (seen.has(row.id)) duplicateFindings.push({ entity, id: row.id });
    seen.add(row.id);
  }
}
addCheck(
  'unique-identities',
  'Public numeric IDs are unique per entity',
  'critical',
  'all',
  duplicateFindings
);

const referenceFindings = [];
for (const state of states) {
  if (!countryById.has(state.countryId))
    referenceFindings.push({ entity: 'state', id: state.id, field: 'countryId' });
}
for (const city of cities) {
  if (!countryById.has(city.countryId))
    referenceFindings.push({ entity: 'city', id: city.id, field: 'countryId' });
  if (!stateById.has(city.stateId))
    referenceFindings.push({ entity: 'city', id: city.id, field: 'stateId' });
}
addCheck(
  'referential-integrity',
  'Every parent reference resolves',
  'critical',
  'state,city',
  referenceFindings
);

const parentFindings = [];
for (const state of states) {
  const country = countryById.get(state.countryId);
  if (
    country &&
    (state.countryCode !== country.iso2 ||
      state.countryName !== country.name ||
      state.parentId !== country.id)
  ) {
    parentFindings.push({ entity: 'state', id: state.id, countryCode: state.countryCode });
  }
}
for (const city of cities) {
  const state = stateById.get(city.stateId);
  const country = countryById.get(city.countryId);
  if (
    state &&
    country &&
    (city.stateCode !== state.stateCode ||
      city.stateName !== state.name ||
      city.countryId !== state.countryId ||
      city.countryCode !== country.iso2 ||
      city.countryName !== country.name ||
      city.parentId !== state.id)
  )
    parentFindings.push({ entity: 'city', id: city.id, countryCode: city.countryCode });
}
addCheck(
  'parent-denormalization',
  'Denormalized parent fields match canonical parents',
  'high',
  'state,city',
  parentFindings
);

const normalizeName = (value) =>
  value.normalize('NFC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('en-US');
const normalizedDuplicates = [];
for (const [entity, rows, parentField] of [
  ['state', states, 'countryId'],
  ['city', cities, 'stateId'],
]) {
  const groups = new Map();
  for (const row of rows) {
    const key = `${row[parentField]}:${normalizeName(row.name)}`;
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  for (const group of groups.values()) {
    if (group.length > 1)
      normalizedDuplicates.push({
        entity,
        countryCode: group[0].countryCode,
        ids: group.map((row) => row.id),
        name: group[0].name,
      });
  }
}
addCheck(
  'normalized-duplicates',
  'Normalized names are unique within a parent unless reviewed',
  'high',
  'state,city',
  normalizedDuplicates
);

const rangeFindings = [];
for (const [entity, rows] of [
  ['country', countries],
  ['state', states],
  ['city', cities],
]) {
  for (const row of rows) {
    const emptyLat = row.latitude === null || row.latitude === '' || row.latitude === undefined;
    const emptyLon = row.longitude === null || row.longitude === '' || row.longitude === undefined;
    if (emptyLat !== emptyLon)
      rangeFindings.push({ entity, id: row.id, reason: 'partial-coordinate' });
    if (
      !emptyLat &&
      (!Number.isFinite(Number(row.latitude)) ||
        Number(row.latitude) < -90 ||
        Number(row.latitude) > 90)
    ) {
      rangeFindings.push({ entity, id: row.id, reason: 'latitude-range' });
    }
    if (
      !emptyLon &&
      (!Number.isFinite(Number(row.longitude)) ||
        Number(row.longitude) < -180 ||
        Number(row.longitude) > 180)
    ) {
      rangeFindings.push({ entity, id: row.id, reason: 'longitude-range' });
    }
  }
}
addCheck(
  'coordinate-ranges',
  'Coordinates are paired and within WGS84 ranges',
  'critical',
  'all',
  rangeFindings
);

addCheck(
  'coverage-contract',
  'Every null or coverage gap is classified',
  'high',
  'all',
  coverage.summary.contract.passed && coverage.summary.contract.gapClassificationRate === 1 ? 0 : 1,
  {
    classifiedGaps: coverage.summary.contract.classifiedGapCount,
    totalGaps: coverage.summary.contract.totalGapCount,
  }
);
for (const item of coverage.countryCoverage) {
  const row = countryDrilldown.get(item.countryCode);
  row.coverageGaps =
    Number(item.states.status !== 'available') +
    Number(item.cities.status !== 'available') +
    item.metadataGaps.length +
    Number(item.coordinate.status !== 'available');
}

const qidFindings = [];
const qidSeen = new Set();
const qidMetadata = new Map(qids.metadata.map((entry) => [entry.cityId, entry]));
for (const city of cities) {
  if (!city.wikiDataId) continue;
  if (!/^Q[1-9]\d*$/u.test(city.wikiDataId))
    qidFindings.push({ cityId: city.id, countryCode: city.countryCode, reason: 'invalid-format' });
  if (qidSeen.has(city.wikiDataId))
    qidFindings.push({ cityId: city.id, countryCode: city.countryCode, reason: 'duplicate-qid' });
  qidSeen.add(city.wikiDataId);
  const metadata = qidMetadata.get(city.id);
  if (!metadata || metadata.qid !== city.wikiDataId)
    qidFindings.push({
      cityId: city.id,
      countryCode: city.countryCode,
      reason: 'missing-verification',
    });
  if (metadata?.confidence === 'low') countryDrilldown.get(city.countryCode).lowConfidenceQids += 1;
}
addCheck(
  'wikidata-qids',
  'Published supplemental QIDs are valid, unique, and verified',
  'high',
  'city',
  qidFindings,
  {
    retainedAssignments: qids.counts.retainedAssignments,
    clearedAssignments: qids.counts.clearedAssignments,
  }
);

const timezoneFindings = [];
for (const country of countries) {
  for (const timezone of country.timezones ?? []) {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: timezone.zoneName }).format(new Date(0));
    } catch {
      timezoneFindings.push({ countryCode: country.iso2, zoneName: timezone.zoneName });
    }
    if (!timezone.observedAt || !/^UTC[+-]\d{2}:\d{2}$/u.test(timezone.gmtOffsetName)) {
      timezoneFindings.push({
        countryCode: country.iso2,
        zoneName: timezone.zoneName,
        reason: 'unsafe-static-offset',
      });
    }
  }
}
addCheck(
  'iana-timezones',
  'Timezone IDs and observed static offsets are valid',
  'high',
  'country',
  timezoneFindings
);

const cityHeadline = cityCoordinateArtifact.snapshot.datasets.headline[0];
addCheck(
  'country-polygon-outliers',
  'Country polygon outliers are corrected or explicitly classified',
  'high',
  'city',
  cityHeadline.classifiedExceptions + cityHeadline.unresolvedMajorOutliers,
  {
    corrected: cityHeadline.correctedCoordinates,
    unresolvedBeforeException: cityHeadline.unresolvedMajorOutliers,
    reference: cityCoordinates.reference.id,
  }
);
addCheck(
  'state-coordinate-outliers',
  'State coordinates are verified, derived, or explicitly excepted',
  'high',
  'state',
  stateCoordinates.exceptions.length +
    stateCoordinates.reviewedMajorOutliers.filter((item) => item.resolution === 'unresolved')
      .length,
  {
    reviewedMajorOutliers: stateCoordinates.reviewedMajorOutliers.length,
    unresolvedBeforeException: stateCoordinates.reviewedMajorOutliers.filter(
      (item) => item.resolution === 'unresolved'
    ).length,
  }
);
for (const item of stateCoordinates.exceptions) {
  const state = stateById.get(item.stateId);
  if (state) countryDrilldown.get(state.countryCode).stateCoordinateExceptions += 1;
}

const manifestFindings = [];
for (const manifest of [
  distributionManifest.canonicalSource,
  distributionManifest.generatedArtifacts,
]) {
  for (const asset of manifest.files) {
    const file = path.join(root, asset.file);
    const bytes = await readFile(file);
    const info = await stat(file);
    const digest = createHash('sha256').update(bytes).digest('hex');
    if (info.size !== asset.bytes || digest !== asset.sha256)
      manifestFindings.push({ file: asset.file, reason: 'distribution-hash-drift' });
  }
}
const computedProductionManifest = await buildProductionManifest(root, packageJson.version, {
  generatedAt: productionManifest.generatedAt,
});
if (JSON.stringify(computedProductionManifest) !== JSON.stringify(productionManifest)) {
  manifestFindings.push({
    file: 'data/production-manifest.json',
    reason: 'production-manifest-drift',
  });
}
addCheck(
  'artifact-parity',
  'Raw, optimized, shard, npm, and manifest artifacts match by hash',
  'critical',
  'distribution',
  manifestFindings,
  {
    generatedFiles: distributionManifest.generatedArtifacts.count,
    dataVersion: distributionManifest.dataVersion,
  }
);

const exceptionFindings = [];
const generatedDate = new Date(policy.generatedAt);
for (const entry of exceptions.entries) {
  if (!entry.owner || !exceptions.ownerDirectory[entry.owner])
    exceptionFindings.push({ id: entry.id, reason: 'missing-owner' });
  if (!entry.rationale) exceptionFindings.push({ id: entry.id, reason: 'missing-rationale' });
  if (
    !entry.expiresAt ||
    Number.isNaN(Date.parse(entry.expiresAt)) ||
    new Date(entry.expiresAt) <= generatedDate
  )
    exceptionFindings.push({ id: entry.id, reason: 'expired-or-invalid-expiry' });
  for (const source of entry.sourceRefs ?? []) {
    try {
      await stat(path.join(root, source));
    } catch {
      exceptionFindings.push({ id: entry.id, reason: 'missing-source', source });
    }
  }
}
addCheck(
  'exception-governance',
  'Exceptions have an owner, rationale, evidence, and future expiry',
  'high',
  'policy',
  exceptionFindings,
  {
    activeExceptions: exceptions.entries.length,
    nextExpiry: exceptions.entries.map((entry) => entry.expiresAt).sort()[0],
  }
);

const gate = evaluateQualityGate(checks, policy);
const report = {
  schemaVersion: 1,
  policyVersion: policy.policyVersion,
  generatedAt: policy.generatedAt,
  dataVersion: productionManifest.dataVersion,
  gate,
  entities: {
    country: { records: countries.length },
    state: { records: states.length },
    city: { records: cities.length },
    district: { records: districts.districts.length },
  },
  checks,
  exceptions: exceptions.entries.map(
    ({ id, checkId, severity, expectedCount, owner, expiresAt }) => ({
      id,
      checkId,
      severity,
      expectedCount,
      owner,
      expiresAt,
    })
  ),
  countryDrilldown: [...countryDrilldown.values()],
};

const baselineEntities = {
  countries: 'country',
  states: 'state',
  cities: 'city',
  districts: 'district',
};
for (const [baseline, entity] of Object.entries(baselineEntities)) {
  if (report.entities[entity].records !== policy.baselines[baseline])
    throw new Error(`${baseline} baseline changed without review`);
}
if (
  normalizedDuplicates.filter((item) => item.entity === 'state').length !==
  policy.baselines.normalizedStateDuplicateGroups
)
  throw new Error('Normalized state duplicate baseline changed without review');
if (
  normalizedDuplicates.filter((item) => item.entity === 'city').length !==
  policy.baselines.normalizedCityDuplicateGroups
)
  throw new Error('Normalized city duplicate baseline changed without review');
if (cityHeadline.classifiedExceptions !== policy.baselines.classifiedCountryPolygonOutliers)
  throw new Error('Country polygon exception baseline changed without review');
if (stateCoordinates.exceptions.length !== policy.baselines.stateCoordinateExceptions)
  throw new Error('State coordinate exception baseline changed without review');

const json = `${JSON.stringify(report, null, 2)}\n`;
const markdown = renderMarkdown(report);
if (checkMode) {
  const [recordedJson, recordedMarkdown] = await Promise.all([
    readFile(reportPath, 'utf8'),
    readFile(markdownPath, 'utf8'),
  ]);
  if (recordedJson !== json || recordedMarkdown !== markdown)
    throw new Error('Quality reports are stale; run npm run data:quality');
} else {
  await Promise.all([writeFile(reportPath, json), writeFile(markdownPath, markdown)]);
}
if (!report.gate.passed)
  throw new Error(
    `Data quality gate failed with ${report.gate.unresolvedBlockingFindings} unresolved blocking findings`
  );
console.log(
  `Data quality gate passed: ${report.gate.checksPassed}/${report.gate.checksTotal} checks, ${report.gate.unresolvedBlockingFindings} unresolved blocking findings.`
);

function renderMarkdown(value) {
  const lines = [
    '# Data quality release gate',
    '',
    `Status: **${value.gate.passed ? 'PASS' : 'FAIL'}**`,
    '',
    `Data version: \`${value.dataVersion}\``,
    '',
    `Records: ${value.entities.country.records} countries, ${value.entities.state.records} states, ${value.entities.city.records} cities, ${value.entities.district.records} districts.`,
    '',
    '## Checks',
    '',
    '| Check | Severity | Status | Observed | Excepted | Unresolved |',
    '| --- | --- | --- | ---: | ---: | ---: |',
    ...value.checks.map(
      (check) =>
        `| ${check.title} | ${check.severity} | ${check.status.toUpperCase()} | ${check.observed} | ${check.excepted} | ${check.unresolved} |`
    ),
    '',
    '## Managed exceptions',
    '',
    '| Exception | Check | Count | Owner | Expires |',
    '| --- | --- | ---: | --- | --- |',
    ...value.exceptions.map(
      (entry) =>
        `| ${entry.id} | ${entry.checkId} | ${entry.expectedCount} | ${entry.owner} | ${entry.expiresAt} |`
    ),
    '',
    '## Country drill-down',
    '',
    '| Country | States | Cities | Coverage gaps | State coordinate exceptions | Low-confidence QIDs |',
    '| --- | ---: | ---: | ---: | ---: | ---: |',
    ...value.countryDrilldown.map(
      (entry) =>
        `| ${entry.countryCode} — ${entry.countryName} | ${entry.states} | ${entry.cities} | ${entry.coverageGaps} | ${entry.stateCoordinateExceptions} | ${entry.lowConfidenceQids} |`
    ),
    '',
  ];
  return `${lines.join('\n')}\n`;
}
