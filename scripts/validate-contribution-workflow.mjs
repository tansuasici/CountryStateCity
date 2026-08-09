import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { calculateContributionMetrics, validateReviewedProposal } from './lib/contributions.mjs';

const root = path.resolve(import.meta.dirname, '..');
const [policy, ledger, metrics, patches, issueForm, workflow] = await Promise.all([
  json('data/contributions/policy.json'),
  json('data/contributions/ledger.json'),
  json('data/contributions/metrics.json'),
  json('data/patches/overrides.json'),
  text('.github/ISSUE_TEMPLATE/data_correction.yml'),
  text('.github/workflows/data-correction-intake.yml'),
]);

const errors = [];
const ids = new Set();
for (const entry of ledger.entries) {
  if (ids.has(entry.contributionId)) errors.push(`Duplicate ledger id ${entry.contributionId}.`);
  ids.add(entry.contributionId);
  if (entry.decision === 'accepted') errors.push(...validateReviewedProposal(entry));
  if (['accepted', 'rejected'].includes(entry.decision) && !entry.reviewer) {
    errors.push(`${entry.contributionId} has a decision without reviewer.`);
  }
}

for (const patch of patches.patches.filter((item) => item.contributionId)) {
  const entry = ledger.entries.find((item) => item.contributionId === patch.contributionId);
  if (!entry || entry.decision !== 'accepted') {
    errors.push(`Patch ${patch.contributionId} has no accepted ledger entry.`);
  }
  for (const field of policy.auditTrail.required) {
    const value = field in patch ? patch[field] : patch.auditTrail?.[field];
    if (!value) errors.push(`Patch ${patch.contributionId} is missing audit field ${field}.`);
  }
}

for (const heading of [
  'Entity type',
  'Public ID',
  'Field',
  'Current value',
  'Proposed value',
  'Source URL',
  'Source license',
  'Explanation and evidence',
  'Contributor attestation',
]) {
  if (!issueForm.includes(`label: ${heading}`)) errors.push(`Issue form is missing ${heading}.`);
}
for (const token of [
  'fingerprint',
  'maximumOpenSubmissionsPerAuthorPer24Hours',
  'data-correction:review',
]) {
  if (!workflow.includes(token)) errors.push(`Intake workflow is missing ${token}.`);
}

const expectedMetrics = calculateContributionMetrics(ledger.entries);
if (JSON.stringify(metrics) !== JSON.stringify(expectedMetrics))
  errors.push('Metrics do not match ledger.');
if (errors.length) throw new Error(errors.join('\n'));
console.log(
  `Contribution workflow passed: ${ledger.entries.length} ledger entries, ${patches.patches.filter((item) => item.contributionId).length} community patches.`
);

async function json(relative) {
  return JSON.parse(await text(relative));
}

async function text(relative) {
  return readFile(path.join(root, relative), 'utf8');
}
