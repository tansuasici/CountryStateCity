#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const SOURCE_URL = 'https://www.icisleri.gov.tr/valilikler';
const DETAIL_URL = 'https://www.icisleri.gov.tr/ISAYWebPart/Valilikler/ValilikDetay';
const EXPECTED_PROVINCES = 81;
const EXPECTED_DISTRICTS = 922;

const options = parseArguments(process.argv.slice(2));
const listHtml = await request(SOURCE_URL);
const provinceIndex = parseProvinceIndex(listHtml);

if (provinceIndex.length !== EXPECTED_PROVINCES) {
  throw new Error(`Expected ${EXPECTED_PROVINCES} provinces; received ${provinceIndex.length}`);
}

const provinceDetails = await mapWithConcurrency(provinceIndex, 6, async (province) => {
  const detailHtml = await request(DETAIL_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ cKey: province.sourceKey }),
  });
  return parseProvinceDetail(province, detailHtml);
});

const districts = provinceDetails.flatMap((province) => province.districts);
assertSnapshot(provinceDetails, districts);

const snapshot = {
  schemaVersion: 1,
  snapshotDate: options.snapshotDate,
  source: {
    producer: 'T.C. İçişleri Bakanlığı',
    title: 'Valilikler ve Kaymakamlıklar',
    url: SOURCE_URL,
    detailEndpoint: DETAIL_URL,
    retrievedAt: `${options.snapshotDate}T00:00:00Z`,
    listContentSha256: sha256(listHtml),
  },
  identityPolicy: {
    provinceCode: 'Two-digit province/vehicle-registration code exposed by the source UI key.',
    districtCode: null,
    districtCodeStatus:
      'The public source exposes no authoritative district code. sourceId is a snapshot identity, not an official government code.',
    sourceIdFormat: 'icisleri:{provinceCode}:{normalizedDistrictName}',
  },
  counts: {
    provinces: provinceDetails.length,
    districts: districts.length,
    districtsWithMissingCoordinates: districts.filter(
      (district) => district.coordinateStatus === 'missing'
    ).length,
    districtsWithOutOfRangeCoordinates: districts.filter(
      (district) => district.coordinateStatus === 'out-of-range'
    ).length,
  },
  provinces: provinceDetails.map((province) => ({
    sourceKey: province.sourceKey,
    provinceCode: province.provinceCode,
    name: province.name,
    latitude: province.latitude,
    longitude: province.longitude,
    districtCount: province.districtCount,
    detailContentSha256: province.detailContentSha256,
  })),
  districts,
};

await writeFile(resolve(options.output), `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');

console.log(
  `Pinned ${snapshot.counts.provinces} provinces and ${snapshot.counts.districts} districts to ${options.output}.`
);

function parseProvinceIndex(html) {
  const cardPattern =
    /onclick="ModalGetir\((\d+)\)"[\s\S]*?<h3 class="cityname">([^<]+)<\/h3>[\s\S]*?<span class="d-none ilcesayi">(\d+)<\/span>/g;
  return [...html.matchAll(cardPattern)].map((match) => ({
    sourceKey: Number(match[1]),
    provinceCode: String(match[1]).padStart(2, '0'),
    name: decodeHtml(match[2]).trim(),
    expectedDistricts: Number(match[3]),
  }));
}

function parseProvinceDetail(province, html) {
  const heading = html.match(/<h1>([^<]+)<\/h1>/);
  if (!heading) throw new Error(`Province heading missing for source key ${province.sourceKey}`);
  const detailName = decodeHtml(heading[1]).trim();
  if (normalize(detailName) !== normalize(province.name)) {
    throw new Error(`Province mismatch for ${province.name}: received ${detailName}`);
  }

  const provinceCoordinates = html.match(
    /var enlem = '(-?\d+(?:\.\d+)?)';\s*var boylam = '(-?\d+(?:\.\d+)?)'/
  );
  if (!provinceCoordinates) throw new Error(`Province coordinates missing for ${province.name}`);

  const districtPattern =
    /governorship-contact-cart" data-lat="(-?\d+(?:\.\d+)?)" data-lng="(-?\d+(?:\.\d+)?)"[\s\S]*?<h5>([^<]+)<\/h5>/g;
  const districts = [...html.matchAll(districtPattern)].map((match) => {
    const name = decodeHtml(match[3]).trim();
    const latitude = Number(match[1]);
    const longitude = Number(match[2]);
    const inTurkey = latitude >= 35 && latitude <= 43 && longitude >= 25 && longitude <= 46;
    const coordinateStatus =
      latitude === 0 && longitude === 0 ? 'missing' : inTurkey ? 'source' : 'out-of-range';
    return {
      sourceId: `icisleri:${province.provinceCode}:${normalize(name)}`,
      name,
      provinceCode: province.provinceCode,
      provinceName: province.name,
      latitude: coordinateStatus === 'source' ? latitude : null,
      longitude: coordinateStatus === 'source' ? longitude : null,
      coordinateStatus,
      ...(coordinateStatus === 'out-of-range'
        ? { sourceLatitude: latitude, sourceLongitude: longitude }
        : {}),
    };
  });

  if (districts.length !== province.expectedDistricts) {
    throw new Error(
      `${province.name}: expected ${province.expectedDistricts} districts; received ${districts.length}`
    );
  }

  return {
    sourceKey: province.sourceKey,
    provinceCode: province.provinceCode,
    name: province.name,
    latitude: Number(provinceCoordinates[1]),
    longitude: Number(provinceCoordinates[2]),
    districtCount: districts.length,
    detailContentSha256: sha256(html),
    districts,
  };
}

function assertSnapshot(provinces, districts) {
  if (districts.length !== EXPECTED_DISTRICTS) {
    throw new Error(`Expected ${EXPECTED_DISTRICTS} districts; received ${districts.length}`);
  }
  const provinceCodes = new Set(provinces.map((item) => item.provinceCode));
  if (provinceCodes.size !== EXPECTED_PROVINCES) throw new Error('Duplicate province code');

  const sourceIds = new Set();
  for (const district of districts) {
    if (sourceIds.has(district.sourceId)) {
      throw new Error(`Duplicate district sourceId: ${district.sourceId}`);
    }
    sourceIds.add(district.sourceId);
    if (district.coordinateStatus === 'source' && district.latitude === null) {
      throw new Error(`Valid district coordinates were discarded: ${district.sourceId}`);
    }
  }
}

async function request(url, init = {}) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          'user-agent':
            'CountryStateCity data quality audit/2.0 (+https://countrystatecity.tansuasici.com)',
          ...init.headers,
        },
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolveDelay) => setTimeout(resolveDelay, 500 * attempt));
    }
  }
  throw new Error(`Request failed for ${url}: ${lastError}`);
}

async function mapWithConcurrency(values, concurrency, mapper) {
  const result = new Array(values.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      result[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return result;
}

function normalize(value) {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('tr-TR')
    .replaceAll('ı', 'i')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function decodeHtml(value) {
  return value
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function parseArguments(arguments_) {
  const result = { output: null, snapshotDate: null };
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === '--output') result.output = arguments_[index + 1];
    if (argument === '--snapshot-date') result.snapshotDate = arguments_[index + 1];
  }
  if (!result.output || !result.snapshotDate) {
    throw new Error(
      'Usage: sync-turkey-admin-source.mjs --output <file> --snapshot-date YYYY-MM-DD'
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result.snapshotDate)) {
    throw new Error('snapshot date must use YYYY-MM-DD');
  }
  return result;
}
