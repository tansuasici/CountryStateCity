import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = path.join(repoRoot, 'out');

async function isNonEmptyFile(filePath) {
  try {
    return (await stat(filePath)).isFile() && (await stat(filePath)).size > 0;
  } catch {
    return false;
  }
}

async function resolveExportedRoute(routePath) {
  const decodedPath = decodeURIComponent(routePath).replace(/\/+$/, '') || '/';
  const relativePath = decodedPath === '/' ? 'index' : decodedPath.slice(1);
  const candidates = [
    path.join(outputRoot, `${relativePath}.html`),
    path.join(outputRoot, relativePath, 'index.html'),
  ];

  for (const candidate of candidates) {
    if (await isNonEmptyFile(candidate)) return candidate;
  }

  return null;
}

const sitemap = await readFile(path.join(outputRoot, 'sitemap.xml'), 'utf8');
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
assert.ok(sitemapUrls.length > 0, 'The generated sitemap must contain at least one URL.');
assert.ok(
  sitemapUrls.every((rawUrl) => new URL(rawUrl).pathname !== '/status'),
  'The removed status route must not remain in the sitemap.'
);

const checkedRoutes = new Set();
for (const rawUrl of sitemapUrls) {
  const url = new URL(rawUrl);
  assert.equal(
    url.origin,
    'https://countrystatecity.tansuasici.com',
    `Unexpected sitemap origin: ${url.origin}`
  );
  assert.ok(
    await resolveExportedRoute(url.pathname),
    `Sitemap route has no exported HTML file: ${url.pathname}`
  );
  checkedRoutes.add(url.pathname);
}

const entryFiles = ['index.html', 'docs.html', 'map.html'];
for (const entryFile of entryFiles) {
  const html = await readFile(path.join(outputRoot, entryFile), 'utf8');
  const internalLinks = [...html.matchAll(/href=["'](\/[^"]*?)["']/g)].map((match) => match[1]);

  for (const href of internalLinks) {
    const url = new URL(href, 'https://countrystatecity.tansuasici.com');
    const extension = path.posix.extname(url.pathname);
    if (url.pathname.startsWith('/_next/') || extension || url.pathname === '/') continue;

    assert.ok(
      await resolveExportedRoute(url.pathname),
      `${entryFile} links to a route with no exported HTML file: ${url.pathname}`
    );
    checkedRoutes.add(url.pathname);
  }
}

const cityShardIndex = JSON.parse(
  await readFile(path.join(outputRoot, 'data/cities/index.json'), 'utf8')
);
assert.equal(cityShardIndex.schemaVersion, 1, 'Unsupported web city shard index');
assert.equal(cityShardIndex.countries, 250, 'Web city shard country coverage regressed');
assert.equal(cityShardIndex.cities, 147739, 'Web city shard city total regressed');
assert.equal(Object.keys(cityShardIndex.shards).length, 250, 'Every country needs a web shard');
for (const shard of Object.values(cityShardIndex.shards)) {
  const shardPath = path.join(outputRoot, 'data/cities', `${shard.code}.json`);
  assert.ok(await isNonEmptyFile(shardPath), `Missing exported city shard: ${shard.code}`);
  assert.equal((await stat(shardPath)).size, shard.size, `City shard size drift: ${shard.code}`);
}

const boundaryManifest = JSON.parse(
  await readFile(path.join(outputRoot, 'data/boundaries/manifest.json'), 'utf8')
);
assert.equal(boundaryManifest.schemaVersion, 1, 'Unsupported boundary manifest');
const turkeyBoundaries = boundaryManifest.countries.TR;
assert.deepEqual(turkeyBoundaries.administrativeLevels, [1, 2]);
assert.equal(turkeyBoundaries.source.license, 'ODbL-1.0');
const boundaryFiles = [
  ...Object.values(turkeyBoundaries.profiles),
  ...Object.values(turkeyBoundaries.downloads),
];
for (const boundaryFile of boundaryFiles) {
  const boundaryPath = path.join(outputRoot, boundaryFile.url);
  assert.ok(await isNonEmptyFile(boundaryPath), `Missing exported boundary: ${boundaryFile.url}`);
  const content = await readFile(boundaryPath);
  assert.equal(content.byteLength, boundaryFile.bytes, `Boundary size drift: ${boundaryFile.url}`);
  assert.equal(
    createHash('sha256').update(content).digest('hex'),
    boundaryFile.sha256,
    `Boundary hash drift: ${boundaryFile.url}`
  );
}
for (const workerFile of ['maplibre-gl-worker.js', 'maplibre-gl-shared.js']) {
  assert.ok(
    await isNonEmptyFile(path.join(outputRoot, 'vendor/maplibre', workerFile)),
    `Missing MapLibre module worker asset: ${workerFile}`
  );
}
const maplibreWorker = await readFile(
  path.join(outputRoot, 'vendor/maplibre/maplibre-gl-worker.js'),
  'utf8'
);
assert.ok(
  maplibreWorker.includes('from"./maplibre-gl-shared.js"'),
  'MapLibre worker must import the JavaScript MIME-safe shared asset'
);

const countries = JSON.parse(await readFile(path.join(repoRoot, 'data/country.json'), 'utf8'));
assert.equal(countries.length, 250, 'Country flag coverage must match the published countries');
for (const country of countries) {
  const code = country.iso2.toLowerCase();
  assert.ok(
    await isNonEmptyFile(path.join(outputRoot, 'vendor/flags', `${code}.svg`)),
    `Missing exported country flag: ${code}.svg`
  );
}

const nextStaticRoot = path.join(outputRoot, '_next/static');
const staticFiles = await recursiveFiles(nextStaticRoot);
for (const file of staticFiles.filter((item) => item.endsWith('.js'))) {
  const content = await readFile(file, 'utf8');
  assert.ok(
    !content.includes('Ashkāsham'),
    `Canonical city dataset leaked into initial JavaScript: ${path.relative(outputRoot, file)}`
  );
  assert.ok(
    !content.includes('csc:district:107120'),
    `Boundary geometry leaked into initial JavaScript: ${path.relative(outputRoot, file)}`
  );
}

console.log(
  `Verified ${checkedRoutes.size} static routes, 250 lazy city shards, ${boundaryFiles.length} versioned Türkiye boundary files, the CSP-safe MapLibre worker, and no city/boundary dataset in JavaScript chunks.`
);

async function recursiveFiles(directory) {
  const entries = await import('node:fs/promises').then(({ readdir }) =>
    readdir(directory, { withFileTypes: true })
  );
  return (
    await Promise.all(
      entries.map((entry) => {
        const resolved = path.join(directory, entry.name);
        return entry.isDirectory() ? recursiveFiles(resolved) : [resolved];
      })
    )
  ).flat();
}
