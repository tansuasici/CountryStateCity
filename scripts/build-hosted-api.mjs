import { build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const serverRoot = path.join(root, 'server');
const outputDir = path.join(serverRoot, 'dist');
const dataDir = path.join(serverRoot, 'data');

await rm(outputDir, { recursive: true, force: true });
await rm(dataDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await mkdir(dataDir, { recursive: true });

await build({
  entryPoints: [path.join(root, 'countrystatecity-api/src/server.ts')],
  outfile: path.join(outputDir, 'server.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: true,
});

for (const filename of [
  'country.json',
  'state.json',
  'city-optimized.json',
  'production-manifest.json',
  'provenance.json',
]) {
  await cp(path.join(root, 'data', filename), path.join(dataDir, filename));
}
await cp(path.join(root, 'data/api'), path.join(dataDir, 'api'), { recursive: true });
await cp(path.join(root, 'data/subscriptions'), path.join(dataDir, 'subscriptions'), {
  recursive: true,
});
await cp(path.join(root, 'data/search'), path.join(dataDir, 'search'), { recursive: true });
await mkdir(path.join(dataDir, 'admin', 'districts'), { recursive: true });
await cp(
  path.join(root, 'data', 'admin', 'districts', 'tr.json'),
  path.join(dataDir, 'admin', 'districts', 'tr.json')
);
await mkdir(path.join(dataDir, 'boundaries', 'tr'), { recursive: true });
for (const filename of ['turkey-provinces.geojson', 'turkey-districts.geojson']) {
  await cp(
    path.join(root, 'data', 'boundaries', 'tr', filename),
    path.join(dataDir, 'boundaries', 'tr', filename)
  );
}
await mkdir(path.join(dataDir, 'geography'), { recursive: true });
for (const filename of ['reverse-geocoding-policy.json', 'reverse-geocoding-benchmark.json']) {
  await cp(
    path.join(root, 'data', 'geography', filename),
    path.join(dataDir, 'geography', filename)
  );
}

console.log('Standalone Node API built with versioned country/state/city data.');
