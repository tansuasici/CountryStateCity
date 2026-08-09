import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const configPath = path.join(root, 'data/sources/dr5hn-v3.2-export.7.json');
const configBytes = await readFile(configPath);
const config = JSON.parse(configBytes);
const patches = JSON.parse(await readFile(path.join(root, config.patchFile), 'utf8'));
const identityPolicy = JSON.parse(await readFile(path.join(root, config.identityPolicy), 'utf8'));
const provenance = JSON.parse(await readFile(path.join(root, 'data/provenance.json'), 'utf8'));

assert(config.schemaVersion === 1, 'Unsupported source manifest schema');
assert(config.source?.id, 'Source ID is required');
assert(/^v\d/.test(config.source?.release), 'Pinned source release is required');
assert(/^[a-f0-9]{40}$/.test(config.source?.revision), 'A full 40-character revision is required');
assert(config.source?.publishedAt, 'Source publication date is required');
assert(config.source?.license?.id && config.source?.license?.url, 'Source license is required');

for (const name of ['countries', 'states', 'cities']) {
  const asset = config.assets?.[name];
  assert(asset?.url?.startsWith('https://'), `HTTPS URL is required for ${name}`);
  assert(['none', 'gzip'].includes(asset?.compression), `Invalid compression for ${name}`);
  assert(
    Number.isInteger(asset?.bytes) && asset.bytes > 0,
    `Pinned byte size is required for ${name}`
  );
  assert(/^[a-f0-9]{64}$/.test(asset?.sha256), `Pinned SHA-256 is required for ${name}`);
}

for (const limit of [
  'maximumDuplicateIds',
  'maximumOrphanReferences',
  'maximumExactDuplicateCities',
  'maximumInvalidCoordinates',
]) {
  assert(
    Number.isInteger(config.validation?.[limit]) && config.validation[limit] >= 0,
    `A non-negative validation limit is required: ${limit}`
  );
}

assert(
  config.apply?.enabled === false,
  'Production apply must remain disabled while identity fails'
);
assert(
  config.apply?.blockedBy?.includes(`identity-report:${config.source.release}`),
  'The failing identity report must block production apply'
);
assert(patches.schemaVersion === 1, 'Unsupported patch schema');
assert(patches.sourceRelease === config.source.release, 'Patch/source release mismatch');
assert(Array.isArray(patches.patches), 'Patch list must be an array');
assert(identityPolicy.namespace === 'csc', 'Identity policy namespace differs');
assert(identityPolicy.publicId?.immutable === true, 'Public IDs must be immutable');
assert(identityPolicy.publicId?.reuseAllowed === false, 'Public ID reuse must be forbidden');

for (const patch of patches.patches) {
  assert(['country', 'state', 'city'].includes(patch.entity), 'Patch entity is invalid');
  assert(['merge', 'upsert', 'delete'].includes(patch.operation), 'Patch operation is invalid');
  assert(Number.isInteger(patch.id), 'Patch ID is required');
  assert(
    patch.reason && patch.sourceUrl && patch.license,
    `Patch provenance is incomplete: ${patch.id}`
  );
  if (patch.operation === 'merge') assert(patch.changes, `Merge changes are required: ${patch.id}`);
  if (patch.operation === 'upsert') assert(patch.value, `Upsert value is required: ${patch.id}`);
}

const provenanceSource = provenance.sources?.find((source) => source.id === config.source.id);
assert(provenanceSource, 'Pinned source is missing from data/provenance.json');
assert(
  provenanceSource.syncPipeline?.manifest === path.relative(root, configPath),
  'Provenance sync manifest path differs'
);
assert(
  provenanceSource.syncPipeline?.revision === config.source.revision,
  'Provenance sync revision differs'
);
assert(
  provenanceSource.syncPipeline?.pinnedRelease === config.source.release,
  'Provenance sync release differs'
);

const recordedDir = path.join(root, 'data/sync-reports', config.source.release);
const [
  sourceReport,
  qualityReport,
  schemaReport,
  changeReport,
  changeSummary,
  identityReport,
  outputReport,
] = await Promise.all(
  [
    'source-manifest.json',
    'quality-report.json',
    'schema-diff.json',
    'change-report.json',
    'change-summary.json',
    'identity-report.json',
    'output-manifest.json',
  ].map(async (name) => JSON.parse(await readFile(path.join(recordedDir, name), 'utf8')))
);
assert(
  sourceReport.source?.revision === config.source.revision,
  'Recorded source revision differs'
);
assert(qualityReport.passed === true, 'Recorded data quality report failed');
for (const report of [qualityReport, schemaReport, changeReport, changeSummary, outputReport]) {
  assert(report.sourceRelease === config.source.release, 'Recorded report release differs');
}
assert(
  identityReport.toSource?.release === config.source.release,
  'Identity report release differs'
);
assert(identityReport.publicIdNamespace === identityPolicy.namespace, 'Identity namespace differs');
assert(
  identityReport.gate?.passed === false,
  'Known candidate identity collisions must block apply'
);
for (const entity of ['countries', 'states', 'cities']) {
  assert(
    JSON.stringify(changeSummary.entities[entity].counts) ===
      JSON.stringify(changeReport.entities[entity].counts),
    `Recorded change summary differs for ${entity}`
  );
}

await stat(path.join(root, '.github/workflows/data-sync.yml'));
console.log(
  `Data sync config passed: ${config.source.release}@${config.source.revision.slice(0, 7)}, ${patches.patches.length} overlay patches, manifest ${createHash('sha256').update(configBytes).digest('hex').slice(0, 12)}.`
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
