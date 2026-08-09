import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const sourceDir = path.join(root, 'countrystatecity-npm/data/cities');
const outputDir = path.join(root, 'public/data/cities');
const checkOnly = process.argv.includes('--check');
const [countries, sourceIndex] = await Promise.all([
  readJson('data/country.json'),
  readJson('countrystatecity-npm/data/cities/index.json'),
]);

const expected = new Map();
const webIndex = {};
let totalCities = 0;
for (const country of countries) {
  const code = country.iso2.toLowerCase();
  const source = sourceIndex[country.id];
  const content = source
    ? await readFile(path.join(sourceDir, `${source.code}.json`), 'utf8')
    : '[]';
  const rows = JSON.parse(content);
  const normalized = JSON.stringify(rows);
  const bytes = Buffer.byteLength(normalized);
  expected.set(`${code}.json`, normalized);
  webIndex[country.id] = {
    code,
    count: rows.length,
    size: bytes,
    sha256: createHash('sha256').update(normalized).digest('hex'),
  };
  totalCities += rows.length;
}
expected.set(
  'index.json',
  JSON.stringify({
    schemaVersion: 1,
    countries: countries.length,
    cities: totalCities,
    shards: webIndex,
  })
);

if (checkOnly) {
  for (const [name, content] of expected) {
    const actual = await readFile(path.join(outputDir, name), 'utf8').catch(() => null);
    assert(actual === content, `Web city shard is missing or stale: ${name}`);
  }
  const actualFiles = (await readdir(outputDir)).filter((name) => name.endsWith('.json'));
  assert(actualFiles.length === expected.size, 'Unexpected web city shard count');
} else {
  await mkdir(outputDir, { recursive: true });
  for (const [name, content] of expected) await writeAtomic(path.join(outputDir, name), content);
}

assert(countries.length === 250, 'Unexpected country count');
assert(totalCities === 147739, 'Unexpected web city total');
console.log(
  `Web city shards ${checkOnly ? 'verified' : 'generated'}: 250 countries, ${totalCities} cities, ${expected.size} files.`
);

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), 'utf8'));
}

async function writeAtomic(destination, content) {
  const temporary = `${destination}.generate-${process.pid}`;
  await writeFile(temporary, content);
  await rename(temporary, destination);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
