import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const update = process.argv.includes('--update');
const [policy, packageJson] = await Promise.all([
  readJson('data/package-budget.json'),
  readJson('package.json'),
]);

const result = spawnSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
  cwd: root,
  encoding: 'utf8',
  env: { ...process.env, npm_config_loglevel: 'silent' },
});
if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'npm pack failed');
const pack = JSON.parse(result.stdout)[0];
const files = new Map(pack.files.map((file) => [file.path, file.size]));
const violations = [];

for (const [metric, actual, maximum] of [
  ['packed bytes', pack.size, policy.budgets.maximumPackedBytes],
  ['unpacked bytes', pack.unpackedSize, policy.budgets.maximumUnpackedBytes],
  ['file count', pack.files.length, policy.budgets.maximumFiles],
  [
    'browser entrypoint bytes',
    files.get('countrystatecity-npm/dist/index.browser.js') ?? Number.POSITIVE_INFINITY,
    policy.budgets.maximumBrowserEntrypointBytes,
  ],
]) {
  if (actual > maximum) violations.push(`${metric}: ${actual} > ${maximum}`);
}
for (const file of policy.requiredFiles) {
  if (!files.has(file)) violations.push(`required package file is missing: ${file}`);
}
for (const file of policy.forbiddenFiles) {
  if (files.has(file)) violations.push(`forbidden duplicate/evidence file is published: ${file}`);
}
for (const [dataset, expectedFiles] of Object.entries(policy.singleCopyDatasets)) {
  const published = expectedFiles.filter((file) => files.has(file));
  if (published.length !== 1)
    violations.push(
      `${dataset} must have exactly one runtime data copy; found ${published.length}`
    );
}

const report = {
  schemaVersion: 1,
  policyVersion: policy.policyVersion,
  packageVersion: packageJson.version,
  measuredAt: `${policy.reviewedAt}T00:00:00.000Z`,
  passed: violations.length === 0,
  measurement: {
    packedBytes: pack.size,
    unpackedBytes: pack.unpackedSize,
    files: pack.files.length,
    browserEntrypointBytes: files.get('countrystatecity-npm/dist/index.browser.js'),
  },
  budgets: policy.budgets,
  reductionBaseline: {
    previousUnpackedBytes: 165785789,
    currentUnpackedBytes: pack.unpackedSize,
    bytesRemoved: 165785789 - pack.unpackedSize,
    reductionPercent: Number((((165785789 - pack.unpackedSize) / 165785789) * 100).toFixed(2)),
  },
  largestFiles: [...pack.files]
    .sort((a, b) => b.size - a.size)
    .slice(0, 15)
    .map(({ path: file, size }) => ({ file, bytes: size })),
  violations,
  decisions: policy.distributionDecisions,
};

if (update)
  await writeFile(
    path.join(root, 'data/package-size-report.json'),
    `${JSON.stringify(report, null, 2)}\n`
  );
if (violations.length > 0) throw new Error(`Package budget failed:\n- ${violations.join('\n- ')}`);
console.log(
  `Package budget passed: ${(pack.size / 1_000_000).toFixed(2)} MB packed, ${(pack.unpackedSize / 1_000_000).toFixed(2)} MB unpacked, ${pack.files.length} files, browser entry ${(report.measurement.browserEntrypointBytes / 1000).toFixed(1)} kB.`
);

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), 'utf8'));
}
