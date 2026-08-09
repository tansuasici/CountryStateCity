export function clearedWikidataCityIds(report) {
  return new Set([
    ...report.duplicateGroups.flatMap((group) => group.cityIds),
    ...report.uniqueRejected.map((entry) => entry.cityId),
  ]);
}

export function applyWikidataQidCleanup(cities, report) {
  const clearedIds = clearedWikidataCityIds(report);
  const rowsByQid = new Map();
  for (const city of cities) {
    if (!city.wikiDataId) continue;
    if (!/^Q[1-9]\d*$/u.test(city.wikiDataId)) {
      clearedIds.add(city.id);
      continue;
    }
    const rows = rowsByQid.get(city.wikiDataId) ?? [];
    rows.push(city);
    rowsByQid.set(city.wikiDataId, rows);
  }
  for (const rows of rowsByQid.values()) {
    if (rows.length > 1) rows.forEach((city) => clearedIds.add(city.id));
  }
  let cleared = 0;
  for (const city of cities) {
    if (clearedIds.has(city.id) && city.wikiDataId) {
      city.wikiDataId = '';
      cleared += 1;
    }
  }
  assertUniqueWikidataQids(cities);
  return cleared;
}

export function assertUniqueWikidataQids(cities) {
  const qids = new Map();
  for (const city of cities) {
    if (!city.wikiDataId) continue;
    if (!/^Q[1-9]\d*$/u.test(city.wikiDataId)) {
      throw new Error(`Malformed Wikidata QID: ${city.id}/${city.wikiDataId}`);
    }
    const previousCityId = qids.get(city.wikiDataId);
    if (previousCityId !== undefined) {
      throw new Error(`Duplicate Wikidata QID: ${city.wikiDataId}/${previousCityId}/${city.id}`);
    }
    qids.set(city.wikiDataId, city.id);
  }
}
