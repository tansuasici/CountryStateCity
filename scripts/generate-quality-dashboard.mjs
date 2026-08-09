import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { buildQualityDashboard, qualityDashboardCsv } from './lib/quality-dashboard.mjs';

const root = path.resolve(import.meta.dirname, '..');
const checkOnly = process.argv.includes('--check');
const readJson = async (file) => JSON.parse(await readFile(path.join(root, file), 'utf8'));

const [
  countries,
  states,
  cities,
  coverageReport,
  qualityReport,
  qualityPolicy,
  qualityExceptions,
  productionManifest,
  sourceManifest,
  versionIndex,
] = await Promise.all([
  readJson('data/country.json'),
  readJson('data/state.json'),
  readJson('data/city.json'),
  readJson('data/coverage-report.json'),
  readJson('data/quality-report.json'),
  readJson('data/quality-policy.json'),
  readJson('data/quality-exceptions.json'),
  readJson('data/production-manifest.json'),
  readJson('data/sources/dr5hn-v3.2-export.7.json'),
  readJson('data/versions/index.json'),
]);

const dashboard = buildQualityDashboard({
  countries,
  states,
  cities,
  coverageReport,
  qualityReport,
  qualityPolicy,
  qualityExceptions,
  productionManifest,
  sourceManifest,
  versionIndex,
});
if (dashboard.gate.deploymentBlocked) {
  const message = dashboard.gate.regressions.map((item) => item.message).join(' ');
  throw new Error(`Quality dashboard detected a blocking regression. ${message}`);
}

const json = `${JSON.stringify(dashboard, null, 2)}\n`;
const csv = qualityDashboardCsv(dashboard);
const targets = [
  ['data/quality-dashboard.json', json],
  ['data/quality-dashboard.csv', csv],
  ['public/data/quality/dashboard.json', json],
  ['public/data/quality/dashboard.csv', csv],
];

if (checkOnly) {
  for (const [file, expected] of targets) {
    const current = await readFile(path.join(root, file), 'utf8');
    if (current !== expected) {
      throw new Error(`Quality dashboard artifact is stale: ${file}`);
    }
  }
  console.log('Quality dashboard JSON/CSV artifacts are current and deploy-safe.');
} else {
  for (const [file, contents] of targets) {
    const destination = path.join(root, file);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, contents);
  }
  console.log('Generated source-backed quality dashboard JSON/CSV artifacts.');
}
