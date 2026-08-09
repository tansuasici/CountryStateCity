import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildCoverageReport } from './lib/coverage.mjs';

const root = path.resolve(import.meta.dirname, '..');
const readJson = (relativePath) =>
  readFile(path.join(root, relativePath), 'utf8').then((contents) => JSON.parse(contents));

const [countries, states, cities, policy] = await Promise.all([
  readJson('data/country.json'),
  readJson('data/state.json'),
  readJson('data/city.json'),
  readJson('data/coverage-policy.json'),
]);
const report = buildCoverageReport({ countries, states, cities, policy });

await writeFile(
  path.join(root, 'data/coverage-report.json'),
  `${JSON.stringify(report, null, 2)}\n`,
  'utf8'
);

console.log(
  `Coverage report: ${report.summary.countriesWithoutStates} countries without states, ${report.summary.countriesWithoutCities} without cities, ${report.summary.statesWithoutCities} states without cities, contract ${report.summary.contract.passed ? 'passed' : 'failed'}.`
);
