const ENTITY_NAMES = {
  countries: 'country',
  states: 'state',
  cities: 'city',
};

const ADMIN_SUFFIXES = new RegExp(
  String.raw`\b(city|county|district|municipality|province|region|department|prefecture|oblast|raion|shahrestan|zizhizhou|diqu)\b`,
  'gu'
);

export function toPublicId(entity, numericId) {
  const singular = ENTITY_NAMES[entity] ?? entity;
  if (!['country', 'state', 'city'].includes(singular)) {
    throw new Error(`Unsupported public ID entity: ${entity}`);
  }
  if (!Number.isInteger(numericId) || numericId < 0) {
    throw new Error(`Invalid public ID number: ${numericId}`);
  }
  return `csc:${singular}:${numericId}`;
}

export function buildIdentityReport(current, staged, metadata) {
  const entities = {};
  for (const collection of ['countries', 'states', 'cities']) {
    entities[collection] = compareEntity(collection, current[collection], staged[collection]);
  }

  const collisionCount = Object.values(entities).reduce(
    (sum, report) => sum + report.sameSourceIdCollisions.length,
    0
  );
  const unresolvedRemovalCount = Object.values(entities).reduce(
    (sum, report) => sum + report.unresolvedRemovals.length,
    0
  );

  return {
    schemaVersion: 1,
    fromDataVersion: metadata.fromDataVersion,
    toSource: metadata.toSource,
    publicIdNamespace: 'csc',
    entities,
    gate: {
      passed: collisionCount === 0 && unresolvedRemovalCount === 0,
      sameSourceIdCollisions: collisionCount,
      unresolvedRemovals: unresolvedRemovalCount,
      message:
        collisionCount === 0 && unresolvedRemovalCount === 0
          ? 'Identity migration review passed.'
          : 'Apply blocked: publish reviewed migration events before assigning source rows to immutable public IDs.',
    },
  };
}

function compareEntity(collection, beforeRows, afterRows) {
  const beforeById = new Map(beforeRows.map((row) => [row.id, row]));
  const afterById = new Map(afterRows.map((row) => [row.id, row]));
  const sameSourceIdCollisions = [];

  for (const [sourceId, before] of beforeById) {
    const after = afterById.get(sourceId);
    if (!after) continue;
    const verdict = compareIdentity(collection, before, after);
    if (verdict.stable) continue;
    sameSourceIdCollisions.push({
      publicId: toPublicId(collection, before.id),
      sourceId,
      before: identitySummary(collection, before),
      candidate: identitySummary(collection, after),
      signals: verdict.signals,
    });
  }

  const removed = beforeRows.filter((row) => !afterById.has(row.id));
  const added = afterRows.filter((row) => !beforeById.has(row.id));
  const addedByIdentityKey = uniqueRowsByIdentityKey(collection, added);
  const sourceIdChanges = [];
  const unresolvedRemovals = [];

  for (const before of removed) {
    const key = primaryIdentityKey(collection, before);
    const candidate = key ? addedByIdentityKey.get(key) : null;
    if (candidate && compareIdentity(collection, before, candidate).stable) {
      sourceIdChanges.push({
        publicId: toPublicId(collection, before.id),
        previousSourceId: before.id,
        nextSourceId: candidate.id,
        identity: identitySummary(collection, before),
      });
    } else {
      unresolvedRemovals.push({
        publicId: toPublicId(collection, before.id),
        previousSourceId: before.id,
        identity: identitySummary(collection, before),
      });
    }
  }

  return {
    counts: {
      before: beforeRows.length,
      candidate: afterRows.length,
      addedSourceIds: added.length,
      removedSourceIds: removed.length,
      sourceIdChanges: sourceIdChanges.length,
      sameSourceIdCollisions: sameSourceIdCollisions.length,
      unresolvedRemovals: unresolvedRemovals.length,
    },
    sameSourceIdCollisions,
    sourceIdChanges,
    unresolvedRemovals,
  };
}

function compareIdentity(collection, before, after) {
  if (collection === 'countries') {
    const sameIso2 = normalize(before.iso2) === normalize(after.iso2);
    return { stable: sameIso2, signals: { sameIso2 } };
  }

  const sameCountry = normalize(before.countryCode) === normalize(after.countryCode);
  const beforeNames = identityNames(before);
  const afterNames = identityNames(after);
  const sameName = beforeNames.some((name) => afterNames.includes(name));
  const distanceKm = geographicDistanceKm(before, after);
  const nearby = Number.isFinite(distanceKm) && distanceKm <= (collection === 'states' ? 25 : 10);

  if (collection === 'states') {
    const sameCode =
      Boolean(normalize(before.stateCode)) &&
      normalize(before.stateCode) === normalize(after.stateCode);
    return {
      stable: sameCountry && (sameCode || sameName || nearby),
      signals: { sameCountry, sameCode, sameName, nearby, distanceKm: finiteDistance(distanceKm) },
    };
  }

  const sameExternalId =
    Boolean(normalize(before.wikiDataId)) &&
    normalize(before.wikiDataId) === normalize(after.wikiDataId) &&
    Number.isFinite(distanceKm) &&
    distanceKm <= 50;
  return {
    stable: sameCountry && (sameName || nearby || sameExternalId),
    signals: {
      sameCountry,
      sameName,
      nearby,
      sameExternalId,
      distanceKm: finiteDistance(distanceKm),
    },
  };
}

function uniqueRowsByIdentityKey(collection, rows) {
  const grouped = new Map();
  for (const row of rows) {
    const key = primaryIdentityKey(collection, row);
    if (!key) continue;
    const matches = grouped.get(key) ?? [];
    matches.push(row);
    grouped.set(key, matches);
  }
  return new Map(
    [...grouped.entries()]
      .filter(([, matches]) => matches.length === 1)
      .map(([key, [row]]) => [key, row])
  );
}

function primaryIdentityKey(collection, row) {
  if (collection === 'countries') return normalize(row.iso2) || null;
  const country = normalize(row.countryCode);
  if (!country) return null;
  if (collection === 'states') {
    const code = normalize(row.stateCode);
    return code ? `${country}|code:${code}` : `${country}|name:${normalizeName(row.name)}`;
  }
  const name = normalizeName(row.name);
  return name ? `${country}|name:${name}` : null;
}

function identitySummary(collection, row) {
  return {
    name: row.name,
    ...(collection !== 'countries' ? { countryCode: row.countryCode } : { iso2: row.iso2 }),
    ...(collection === 'states' ? { stateCode: row.stateCode } : {}),
    ...(collection === 'cities' ? { stateCode: row.stateCode, wikiDataId: row.wikiDataId } : {}),
    latitude: row.latitude,
    longitude: row.longitude,
  };
}

function normalize(value = '') {
  return String(value).normalize('NFKC').trim().toLowerCase();
}

function normalizeName(value = '') {
  return String(value)
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(ADMIN_SUFFIXES, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function identityNames(row) {
  return [
    ...new Set([row.name, ...(Array.isArray(row.aliases) ? row.aliases : [])].map(normalizeName)),
  ].filter(Boolean);
}

function geographicDistanceKm(before, after) {
  const coordinates = [before.latitude, before.longitude, after.latitude, after.longitude].map(
    Number
  );
  if (!coordinates.every(Number.isFinite)) return Infinity;
  const [lat1, lon1, lat2, lon2] = coordinates;
  const radians = Math.PI / 180;
  const latitudeDelta = (lat2 - lat1) * radians;
  const longitudeDelta = (lon2 - lon1) * radians;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(lat1 * radians) * Math.cos(lat2 * radians) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(haversine));
}

function finiteDistance(value) {
  return Number.isFinite(value) ? Number(value.toFixed(3)) : null;
}
