import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { evaluateQualityGate } from './lib/quality-gate.mjs';

const root = path.resolve(import.meta.dirname, '..');
const [report, policy] = await Promise.all([
  readJson('data/quality-report.json'),
  readJson('data/quality-policy.json'),
]);

const requiredRegressionClasses = [
  'schema-required-fields',
  'unique-identities',
  'referential-integrity',
  'parent-denormalization',
  'normalized-duplicates',
  'coordinate-ranges',
  'coverage-contract',
  'wikidata-qids',
  'iana-timezones',
  'country-polygon-outliers',
  'state-coordinate-outliers',
  'artifact-parity',
  'exception-governance',
];

assert.equal(evaluateQualityGate(report.checks, policy).passed, true);
assert.deepEqual(
  report.checks.map((check) => check.id),
  requiredRegressionClasses,
  'Quality regression class list changed without an explicit test update'
);

for (const checkId of requiredRegressionClasses) {
  const injected = structuredClone(report.checks);
  const check = injected.find((item) => item.id === checkId);
  assert(check, `Missing check: ${checkId}`);
  check.status = 'failed';
  check.unresolved += 1;
  const gate = evaluateQualityGate(injected, policy);
  assert.equal(gate.passed, false, `${checkId} regression did not block the release gate`);
  assert.equal(gate.unresolvedBlockingFindings, 1, `${checkId} was not counted once`);
}

console.log(
  `Data quality regression tests passed: ${requiredRegressionClasses.length} blocking classes.`
);

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), 'utf8'));
}
