import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { calculateContributionMetrics } from './lib/contributions.mjs';

const root = path.resolve(import.meta.dirname, '..');
const ledger = JSON.parse(
  await readFile(path.join(root, 'data/contributions/ledger.json'), 'utf8')
);
const metricsPath = path.join(root, 'data/contributions/metrics.json');
const expected = calculateContributionMetrics(ledger.entries);
if (process.argv.includes('--check')) {
  const current = JSON.parse(await readFile(metricsPath, 'utf8'));
  if (JSON.stringify(current) !== JSON.stringify(expected)) {
    throw new Error('Contribution metrics are stale. Run npm run contribution:metrics.');
  }
  console.log('Contribution SLA and decision metrics are current.');
} else {
  await writeFile(metricsPath, `${JSON.stringify(expected, null, 2)}\n`);
  console.log('Contribution SLA and decision metrics generated.');
}
