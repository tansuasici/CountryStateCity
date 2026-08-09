import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const sourceDir = path.join(root, 'data/boundaries/tr');
const publicRoot = path.join(root, 'public/data/boundaries');
const canonicalManifestPath = path.join(root, 'data/boundaries/manifest.json');
const packageOverviewPath = path.join(root, 'data/boundaries/tr/turkey-admin-z0-4.json');
const sourceManifest = await readJson('data/sources/osm-tr-admin-boundaries-2026-08-06.json');
const report = await readJson('analysis/turkey_osm_boundary_etl_report.json');
const checkOnly = process.argv.includes('--check');
const snapshotDay = sourceManifest.source.snapshotDate.slice(0, 10);
const datasetVersion = `${snapshotDay}.1`;

const definitions = {
  overview: {
    filename: 'turkey-admin-z0-4.topojson',
    format: 'topojson',
    mediaType: 'application/topo+json',
    zoom: [0, 4],
    toleranceMeters: 5000,
    maxBytes: 1_100_000,
    npmExport: '@tansuasici/country-state-city/data/boundaries/tr/overview.json',
  },
  regional: {
    filename: 'turkey-admin-z5-7.topojson',
    format: 'topojson',
    mediaType: 'application/topo+json',
    zoom: [5, 7],
    toleranceMeters: 1000,
    maxBytes: 2_500_000,
  },
  detailed: {
    filename: 'turkey-admin-z8-plus.topojson',
    format: 'topojson',
    mediaType: 'application/topo+json',
    zoom: [8, 16],
    toleranceMeters: 100,
    maxBytes: 12_000_000,
  },
};

const downloadDefinitions = {
  admin1: {
    filename: 'turkey-provinces.geojson',
    format: 'geojson',
    mediaType: 'application/geo+json',
    administrativeLevel: 1,
    features: 81,
    maxBytes: 13_000_000,
  },
  admin2: {
    filename: 'turkey-districts.geojson',
    format: 'geojson',
    mediaType: 'application/geo+json',
    administrativeLevel: 2,
    features: 922,
    maxBytes: 24_000_000,
  },
};

const publicVersionRoot = `/data/boundaries/${datasetVersion}/tr`;
const profiles = await describeFiles(definitions);
const downloads = await describeFiles(downloadDefinitions);
const manifest = {
  schemaVersion: 1,
  datasetVersion,
  generatedAt: sourceManifest.source.snapshotDate,
  countries: {
    TR: {
      countryCode: 'TR',
      countryName: 'Türkiye',
      pilot: true,
      administrativeLevels: [1, 2],
      geometryModel: report.geometryModel.name,
      source: sourceManifest.source,
      usage: 'Administrative visualization and spatial lookup; not cadastral or legal use.',
      identity: {
        province: { id: 'csc:state:*', codeField: 'officialCode', fallbackCodeField: 'stateCode' },
        district: {
          id: 'csc:district:*',
          codeField: 'officialCode',
          missingCodeStatus: 'not-published-by-validation-source',
        },
      },
      profiles,
      downloads,
    },
  },
};
const manifestContent = `${JSON.stringify(manifest, null, 2)}\n`;

if (checkOnly) {
  assert(
    (await readFile(canonicalManifestPath, 'utf8').catch(() => null)) === manifestContent,
    'Canonical boundary manifest is missing or stale'
  );
  assert(
    (await readFile(path.join(publicRoot, 'manifest.json'), 'utf8').catch(() => null)) ===
      manifestContent,
    'Public boundary manifest is missing or stale'
  );
  assert(
    (await readFile(packageOverviewPath, 'utf8').catch(() => null)) ===
      (await readFile(path.join(sourceDir, definitions.overview.filename), 'utf8')),
    'NPM overview boundary asset is missing or stale'
  );
  const expectedNames = [...Object.values(definitions), ...Object.values(downloadDefinitions)].map(
    (entry) => entry.filename
  );
  const publishedDir = path.join(publicRoot, datasetVersion, 'tr');
  const actualNames = (await readdir(publishedDir)).filter((name) => name.endsWith('json')).sort();
  assert(
    JSON.stringify(actualNames) === JSON.stringify(expectedNames.sort()),
    'Unexpected public boundary file set'
  );
  for (const name of expectedNames) {
    assert(
      (await readFile(path.join(publishedDir, name), 'utf8')) ===
        (await readFile(path.join(sourceDir, name), 'utf8')),
      `Public boundary file is stale: ${name}`
    );
  }
} else {
  await mkdir(path.join(publicRoot, datasetVersion, 'tr'), { recursive: true });
  await writeAtomic(canonicalManifestPath, manifestContent);
  await writeAtomic(
    packageOverviewPath,
    await readFile(path.join(sourceDir, definitions.overview.filename), 'utf8')
  );
  await writeAtomic(path.join(publicRoot, 'manifest.json'), manifestContent);
  for (const entry of [...Object.values(definitions), ...Object.values(downloadDefinitions)]) {
    await writeAtomic(
      path.join(publicRoot, datasetVersion, 'tr', entry.filename),
      await readFile(path.join(sourceDir, entry.filename), 'utf8')
    );
  }
}

assert(report.qualityGate.passes, 'Boundary quality gate must pass before publication');
assert(report.counts.provinces === 81, 'Unexpected province count');
assert(report.counts.districts === 922, 'Unexpected district count');
console.log(
  `Web boundaries ${checkOnly ? 'verified' : 'generated'}: ${datasetVersion}, Türkiye admin-1/admin-2, ${Object.keys(profiles).length} map profiles.`
);

async function describeFiles(entries) {
  const result = {};
  for (const [key, definition] of Object.entries(entries)) {
    const content = await readFile(path.join(sourceDir, definition.filename));
    assert(content.byteLength <= definition.maxBytes, `${definition.filename} exceeds size budget`);
    result[key] = {
      ...definition,
      bytes: content.byteLength,
      sha256: createHash('sha256').update(content).digest('hex'),
      url: `${publicVersionRoot}/${definition.filename}`,
    };
    delete result[key].maxBytes;
  }
  return result;
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), 'utf8'));
}

async function writeAtomic(destination, content) {
  await mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.generate-${process.pid}`;
  await writeFile(temporary, content);
  await rename(temporary, destination);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
