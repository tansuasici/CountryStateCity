import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'csc-packed-entrypoints-'));

try {
  const packResult = run(
    'npm',
    ['pack', '--json', '--ignore-scripts', '--pack-destination', temporaryRoot],
    root
  );
  const tarball = path.join(temporaryRoot, JSON.parse(packResult.stdout)[0].filename);
  await writeFile(
    path.join(temporaryRoot, 'package.json'),
    `${JSON.stringify({ private: true, type: 'module' }, null, 2)}\n`
  );
  run(
    'npm',
    ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--no-package-lock', tarball],
    temporaryRoot
  );
  await writeFile(
    path.join(temporaryRoot, 'entrypoints.mjs'),
    `
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { CountryStateCity as rootApi } from '@tansuasici/country-state-city';
import { CountryStateCity as nodeApi } from '@tansuasici/country-state-city/node';
import { CountryStateCity as browserApi } from '@tansuasici/country-state-city/browser';
import compactCities from '@tansuasici/country-state-city/data/cities.optimized.json' with { type: 'json' };

for (const api of [rootApi, nodeApi, browserApi]) {
  assert.deepEqual(api.getStats(), { countries: 250, states: 4963, cities: 147739, districts: 922 });
  assert.equal(api.getCityById(107863)?.name, 'Kadıköy');
}
assert.equal(compactCities.length, 147739);
assert.deepEqual(Object.keys(compactCities[0]).slice(0, 4), ['i', 'n', 's', 'c']);
const boundaryManifest = (await import(
  '@tansuasici/country-state-city/data/boundaries/manifest.json',
  { with: { type: 'json' } }
)).default;
const turkeyOverview = (await import(
  '@tansuasici/country-state-city/data/boundaries/tr/overview.json',
  { with: { type: 'json' } }
)).default;
assert.deepEqual(boundaryManifest.countries.TR.administrativeLevels, [1, 2]);
assert.equal(turkeyOverview.objects.provinces.geometries.length, 81);
assert.equal(turkeyOverview.objects.districts.geometries.length, 922);
const require = createRequire(import.meta.url);
assert.equal(require('@tansuasici/country-state-city').CountryStateCity.getAllCountries().length, 250);
const mcpPath = fileURLToPath(import.meta.resolve('@tansuasici/country-state-city/mcp'));
console.log(JSON.stringify({ mcpPath }));
`
  );
  const entrypoints = run('node', ['entrypoints.mjs'], temporaryRoot);
  const { mcpPath } = JSON.parse(entrypoints.stdout.trim().split('\n').at(-1));
  assert((await readFile(mcpPath, 'utf8')).startsWith('#!/usr/bin/env node'));
  run('node', ['--check', mcpPath], temporaryRoot);
  console.log(
    'Packed entrypoints passed: root ESM, Node ESM/CJS, browser ESM, compact JSON, lazy boundary assets, and MCP.'
  );
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, npm_config_loglevel: 'silent' },
  });
  if (result.status !== 0)
    throw new Error(`${command} ${args.join(' ')} failed:\n${result.stdout}\n${result.stderr}`);
  return result;
}
