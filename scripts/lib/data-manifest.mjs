import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export async function buildProductionManifest(root, packageVersion, options = {}) {
  const shardDirectory = path.join(root, 'countrystatecity-npm/data/cities');
  const shardFiles = (await readdir(shardDirectory))
    .filter((name) => name.endsWith('.json') && name !== 'index.json')
    .sort(compareText)
    .map((name) => `countrystatecity-npm/data/cities/${name}`);
  const files = [
    'data/country.json',
    'data/country-metadata-policy.json',
    'data/schema-normalization-policy.json',
    'data/timezone-policy.json',
    'data/entity-level-policy.json',
    'data/entity-level-report.json',
    'data/state.json',
    'data/city.json',
    'data/city-optimized.json',
    'data/identity-policy.json',
    'data/identity/wikidata-qid-policy.json',
    'data/identity/wikidata-qid-verification.json',
    'data/coverage-policy.json',
    'data/coverage-report.json',
    'data/quality-policy.json',
    'data/quality-exceptions.json',
    'data/distribution-manifest.json',
    'data/location-display.json',
    'data/geography/city-coordinate-policy.json',
    'data/geography/state-coordinate-policy.json',
    'data/sources/natural-earth-admin1-5.1.1.json',
    'data/admin/districts/tr.json',
    'data/migrations/city-id-migrations.json',
    'data/migrations/tr-city-to-district.json',
    'data/migrations/index.json',
    'data/provenance.json',
    'countrystatecity-npm/data/country.json',
    'countrystatecity-npm/data/state.json',
    'countrystatecity-npm/data/city.json',
    'countrystatecity-npm/data/cities/index.json',
    ...shardFiles,
  ];
  const entries = await Promise.all(
    files.map(async (file) => {
      const bytes = await readFile(path.join(root, file));
      return { file, bytes: bytes.length, sha256: sha256(bytes) };
    })
  );
  entries.sort((a, b) => compareText(a.file, b.file));

  const [countries, states, cities, districtLayer, coverageReport] = await Promise.all(
    ['country.json', 'state.json', 'city.json']
      .map(async (name) => JSON.parse(await readFile(path.join(root, 'data', name), 'utf8')))
      .concat([
        JSON.parse(
          await readFile(path.join(root, 'data', 'admin', 'districts', 'tr.json'), 'utf8')
        ),
        JSON.parse(await readFile(path.join(root, 'data', 'coverage-report.json'), 'utf8')),
      ])
  );
  const stateCounts = countBy(states, (state) => state.countryId);
  const cityCounts = countBy(cities, (city) => city.countryId);
  const coverage = countries
    .map((country) => ({
      countryId: country.id,
      countryCode: country.iso2,
      countryName: country.name,
      states: stateCounts.get(country.id) ?? 0,
      cities: cityCounts.get(country.id) ?? 0,
    }))
    .sort((a, b) => compareText(a.countryName, b.countryName));

  const digest = sha256(
    entries.map(({ file, sha256: fileHash }) => `${file}\0${fileHash}\n`).join('')
  );

  return {
    schemaVersion: 2,
    dataVersion: `sha256:${digest}`,
    packageVersion,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    counts: {
      countries: countries.length,
      states: states.length,
      cities: cities.length,
      districts: districtLayer.districts.length,
    },
    coverage,
    coverageSummary: coverageReport.summary,
    digestAlgorithm: 'sha256(file-path + NUL + file-sha256 + LF)',
    digest,
    files: entries,
  };
}

function countBy(rows, keyForRow) {
  const counts = new Map();
  for (const row of rows) {
    const key = keyForRow(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function compareText(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}
