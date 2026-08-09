#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'data', 'sources', 'dr5hn-v3.2-export.7.json');
const outputPath = path.join(root, 'data', 'location-display.json');
const cacheDir = path.join(root, '.data-sync', 'cache');

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const countries = JSON.parse((await loadPinnedAsset('countries')).toString('utf8'));
const states = JSON.parse((await loadPinnedAsset('states')).toString('utf8'));
const countryCodeById = new Map(countries.map((country) => [country.id, country.iso2]));
const englishRegionNames = new Intl.DisplayNames(['en'], { type: 'region' });

const countryNames = Object.fromEntries(
  countries.map((country) => [
    country.iso2,
    { name: normalizeText(englishRegionNames.of(country.iso2) ?? country.name) },
  ])
);

const subdivisions = {};
for (const state of states) {
  const countryCode = countryCodeById.get(state.country_id) ?? state.country_code;
  const subdivisionCode = state.iso2;
  if (!countryCode || !subdivisionCode) {
    throw new Error(`Subdivision ${state.id} has no country/subdivision code`);
  }

  const key = `${countryCode}-${subdivisionCode}`;
  if (subdivisions[key]) throw new Error(`Duplicate subdivision code: ${key}`);
  subdivisions[key] = {
    name: normalizeText(state.name),
    type: state.type ? normalizeText(state.type).toLocaleLowerCase('en-US') : null,
  };
}

const output = {
  schemaVersion: 1,
  source: {
    id: manifest.source.id,
    release: manifest.source.release,
    revision: manifest.source.revision,
    publishedAt: manifest.source.publishedAt,
    license: manifest.source.license,
  },
  countryNameStandard: {
    api: 'ECMA-402 Intl.DisplayNames',
    locale: 'en',
    data: 'Unicode CLDR supplied by the generation runtime',
  },
  counts: {
    countries: Object.keys(countryNames).length,
    subdivisions: Object.keys(subdivisions).length,
  },
  countries: countryNames,
  subdivisions,
};

await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(
  `Wrote ${output.counts.countries} country and ${output.counts.subdivisions} subdivision display records to ${outputPath}`
);

async function loadPinnedAsset(name) {
  const asset = manifest.assets[name];
  if (!asset || asset.compression !== 'none') throw new Error(`Unsupported source asset: ${name}`);
  const cachePath = path.join(cacheDir, `${name}-${asset.sha256}.asset`);
  let bytes;

  try {
    await access(cachePath);
    bytes = await readFile(cachePath);
  } catch {
    const response = await fetch(asset.url);
    if (!response.ok) throw new Error(`Unable to download ${name}: HTTP ${response.status}`);
    bytes = Buffer.from(await response.arrayBuffer());
    await mkdir(cacheDir, { recursive: true });
    await writeFile(cachePath, bytes);
  }

  if (bytes.length !== asset.bytes) {
    throw new Error(`${name} byte-size mismatch: ${bytes.length} != ${asset.bytes}`);
  }
  const digest = createHash('sha256').update(bytes).digest('hex');
  if (digest !== asset.sha256) throw new Error(`${name} SHA-256 mismatch`);
  return bytes;
}

function normalizeText(value) {
  return String(value).normalize('NFC').replace(/\s+/gu, ' ').trim();
}
