import { createHash } from 'node:crypto';

export const COORDINATE_DECIMAL_PLACES = 4;

export function buildDistributionArtifacts(canonical, options = {}) {
  const { countries, states, cities } = canonical;
  assert(Array.isArray(countries), 'Canonical countries must be an array');
  assert(Array.isArray(states), 'Canonical states must be an array');
  assert(Array.isArray(cities), 'Canonical cities must be an array');

  const artifacts = new Map();
  const countryJson = prettyJson(countries);
  const stateJson = prettyJson(states);
  const cityJson = prettyJson(cities);
  const compact = buildCompactCities(cities);
  const compactJson = JSON.stringify(compact);

  if (options.includeCanonical) {
    artifacts.set('data/country.json', countryJson);
    artifacts.set('data/state.json', stateJson);
    artifacts.set('data/city.json', cityJson);
  }

  artifacts.set('data/city-optimized.json', compactJson);
  artifacts.set('countrystatecity-npm/data/country.json', countryJson);
  artifacts.set('countrystatecity-npm/data/state.json', stateJson);
  artifacts.set('countrystatecity-npm/data/city.json', compactJson);

  const countriesById = new Map(countries.map((country) => [country.id, country]));
  const grouped = new Map();
  for (const city of compact) {
    const shard = grouped.get(city.c) ?? [];
    const shardCity = { ...city };
    delete shardCity.c;
    shard.push(shardCity);
    grouped.set(city.c, shard);
  }

  const index = {};
  for (const countryId of [...grouped.keys()].sort((a, b) => a - b)) {
    const country = countriesById.get(countryId);
    assert(country, `Country is missing for shard ${countryId}`);
    const code = country.iso2.toLowerCase();
    const rows = grouped.get(countryId);
    const shardJson = JSON.stringify(rows);
    artifacts.set(`countrystatecity-npm/data/cities/${code}.json`, shardJson);
    index[countryId] = {
      code,
      count: rows.length,
      size: Buffer.byteLength(shardJson),
    };
  }
  artifacts.set('countrystatecity-npm/data/cities/index.json', JSON.stringify(index));

  return artifacts;
}

export function buildCompactCities(cities) {
  return cities.map((city) => ({
    i: city.id,
    n: city.name,
    s: city.stateId,
    c: city.countryId,
    la: roundCoordinate(city.latitude),
    lo: roundCoordinate(city.longitude),
    ...(city.wikiDataId ? { w: city.wikiDataId } : {}),
  }));
}

export function buildArtifactManifest(artifacts, options = {}) {
  const files = [...artifacts.entries()]
    .map(([file, content]) => ({
      file,
      bytes: Buffer.byteLength(content),
      sha256: sha256(content),
    }))
    .sort((a, b) => compareText(a.file, b.file));

  return {
    sourceRelease: options.sourceRelease ?? null,
    files,
    digest: digestFiles(files),
  };
}

export function buildDistributionManifest(canonical, artifacts, options) {
  const canonicalFiles = [
    ['data/country.json', prettyJson(canonical.countries)],
    ['data/state.json', prettyJson(canonical.states)],
    ['data/city.json', prettyJson(canonical.cities)],
  ]
    .map(([file, content]) => ({
      file,
      bytes: Buffer.byteLength(content),
      sha256: sha256(content),
    }))
    .sort((a, b) => compareText(a.file, b.file));
  const artifactManifest = buildArtifactManifest(artifacts, {
    sourceRelease: options.sourceRelease,
  });
  const precision = measureCoordinatePrecision(canonical.cities);
  const canonicalDigest = digestFiles(canonicalFiles);

  return {
    schemaVersion: 1,
    packageVersion: options.packageVersion,
    dataVersion: `sha256:${canonicalDigest}`,
    canonicalSource: {
      files: canonicalFiles,
      digest: canonicalDigest,
      upstreamRelease: options.sourceRelease,
      upstreamRevision: options.sourceRevision,
    },
    generatedArtifacts: {
      count: artifactManifest.files.length,
      digest: artifactManifest.digest,
      files: artifactManifest.files,
    },
    coordinatePrecision: {
      decimalPlaces: COORDINATE_DECIMAL_PLACES,
      operation: `Number(Number(value).toFixed(${COORDINATE_DECIMAL_PLACES}))`,
      maximumAxisErrorDegrees: Number(
        (0.5 * 10 ** -COORDINATE_DECIMAL_PLACES).toFixed(COORDINATE_DECIMAL_PLACES + 1)
      ),
      observedMaximumCenterErrorMeters: precision.maximumErrorMeters,
      observedAtCityId: precision.cityId,
    },
    generatedFilePolicy: {
      canonicalFiles: ['data/country.json', 'data/state.json', 'data/city.json'],
      command: 'npm run data:artifacts',
      verificationCommand: 'npm run test:data-artifacts',
      manualEditsAllowed: false,
    },
  };
}

export function prettyJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function measureCoordinatePrecision(cities) {
  let maximumErrorMeters = 0;
  let cityId = null;
  for (const city of cities) {
    const latitude = Number(city.latitude);
    const longitude = Number(city.longitude);
    const compactLatitude = roundCoordinate(latitude);
    const compactLongitude = roundCoordinate(longitude);
    const error = distanceMeters(latitude, longitude, compactLatitude, compactLongitude);
    if (error > maximumErrorMeters) {
      maximumErrorMeters = error;
      cityId = city.id;
    }
  }
  return {
    maximumErrorMeters: Number(maximumErrorMeters.toFixed(3)),
    cityId,
  };
}

function roundCoordinate(value) {
  const coordinate = Number(value);
  assert(Number.isFinite(coordinate), `Invalid coordinate: ${value}`);
  return Number(coordinate.toFixed(COORDINATE_DECIMAL_PLACES));
}

function distanceMeters(latitudeA, longitudeA, latitudeB, longitudeB) {
  const radius = 6_371_008.8;
  const toRadians = (value) => (value * Math.PI) / 180;
  const deltaLatitude = toRadians(latitudeB - latitudeA);
  const deltaLongitude = toRadians(longitudeB - longitudeA);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(latitudeA)) *
      Math.cos(toRadians(latitudeB)) *
      Math.sin(deltaLongitude / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(a));
}

function digestFiles(files) {
  return sha256(files.map(({ file, sha256: fileHash }) => `${file}\0${fileHash}\n`).join(''));
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function compareText(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
