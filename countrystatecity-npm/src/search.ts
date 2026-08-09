export type LocationSearchEntityType = 'country' | 'state' | 'city' | 'district';

export type LocationAliasType =
  | 'official'
  | 'local'
  | 'common'
  | 'exonym'
  | 'historical'
  | 'transliteration'
  | 'common-misspelling';

export interface LocationAliasSource {
  id: string;
  url: string | null;
  retrievedAt: string;
}

export interface LocationNameAlias {
  name: string;
  languageTag: string;
  type: LocationAliasType;
  validFrom: string | null;
  validTo: string | null;
  source: LocationAliasSource;
}

export interface LocationAliasRecord extends LocationNameAlias {
  publicId: string;
}

export interface LocationAliasPolicy {
  schemaVersion: number;
  generatedAt: string;
  aliases: LocationAliasRecord[];
}

export interface SearchableLocationEntity {
  publicId: string;
  entityType: LocationSearchEntityType;
  id: number;
  name: string;
  languageTag?: string;
  countryCode: string;
  countryName: string;
  stateId?: number | null;
  stateCode?: string | null;
  stateName?: string | null;
  aliases?: LocationNameAlias[];
  record?: Record<string, unknown>;
}

export interface LocationSearchOptions {
  countryCode?: string;
  stateId?: number;
  stateCode?: string;
  entityTypes?: LocationSearchEntityType[];
  limit?: number;
  typoTolerance?: boolean;
}

export type LocationMatchReason =
  | 'canonical-exact'
  | 'alias-exact'
  | 'canonical-prefix'
  | 'alias-prefix'
  | 'canonical-contains'
  | 'alias-contains'
  | 'canonical-typo'
  | 'alias-typo';

export interface LocationSearchMatch {
  canonicalId: string;
  entityType: LocationSearchEntityType;
  name: string;
  countryCode: string;
  countryName: string;
  stateId: number | null;
  stateCode: string | null;
  stateName: string | null;
  score: number;
  matchReason: LocationMatchReason;
  matchedName: string;
  matchedLanguageTag: string;
  matchedAliasType: LocationAliasType | null;
  matchedAliasSource: LocationAliasSource | null;
  matchedAliasValidFrom: string | null;
  matchedAliasValidTo: string | null;
  record: Record<string, unknown>;
}

export interface LocationSearchData {
  countries: Array<{
    id: number;
    name: string;
    iso2: string;
    translations?: Record<string, string | null>;
    translationSource?: string;
  }>;
  states: Array<{
    id: number;
    name: string;
    countryCode: string;
    countryName: string;
    stateCode: string;
  }>;
  cities: Array<{
    id: number;
    name: string;
    countryCode: string;
    countryName: string;
    stateId: number;
    stateCode: string;
    stateName: string;
  }>;
  districts?: Array<{
    id: number;
    publicId?: string;
    name: string;
    aliases?: string[];
    countryCode: string;
    countryName: string;
    stateId: number;
    stateCode: string;
    stateName: string;
  }>;
}

type IndexedName = LocationNameAlias & {
  canonical: boolean;
  normalized: string;
};

type IndexedEntity = SearchableLocationEntity & {
  names: IndexedName[];
};

const COMPATIBILITY_CHARACTERS: Record<string, string> = {
  ı: 'i',
  ł: 'l',
  đ: 'd',
  ð: 'd',
  þ: 'th',
  æ: 'ae',
  œ: 'oe',
  ø: 'o',
  ß: 'ss',
};

const ALIAS_PENALTY: Record<LocationAliasType, number> = {
  official: 0,
  local: 0,
  common: 0.01,
  exonym: 0.01,
  transliteration: 0.02,
  historical: 0.06,
  'common-misspelling': 0.08,
};

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{Mark}/gu, '')
    .toLocaleLowerCase('und')
    .replace(/[ıłđðþæœøß]/gu, (character) => COMPATIBILITY_CHARACTERS[character] || character)
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .replace(/\s+/gu, ' ');
}

export function createLocationSearchEntities(data: LocationSearchData): SearchableLocationEntity[] {
  const countryAliases = (country: LocationSearchData['countries'][number]) =>
    Object.entries(country.translations || {}).flatMap(([languageTag, name]) =>
      name && normalizeSearchText(name) !== normalizeSearchText(country.name)
        ? [
            {
              name,
              languageTag,
              type: 'official' as const,
              validFrom: null,
              validTo: null,
              source: {
                id: country.translationSource || 'canonical-country-translations',
                url: null,
                retrievedAt: '2026-08-08',
              },
            },
          ]
        : []
    );
  const districtAliases = (district: NonNullable<LocationSearchData['districts']>[number]) =>
    (district.aliases || []).map((name) => ({
      name,
      languageTag: 'tr',
      type: 'common' as const,
      validFrom: null,
      validTo: null,
      source: { id: 'turkiye-admin-district-source', url: null, retrievedAt: '2026-08-08' },
    }));

  return [
    ...data.countries.map((country) => ({
      publicId: `csc:country:${country.id}`,
      entityType: 'country' as const,
      id: country.id,
      name: country.name,
      languageTag: 'und',
      countryCode: country.iso2,
      countryName: country.name,
      aliases: countryAliases(country),
      record: country as unknown as Record<string, unknown>,
    })),
    ...data.states.map((state) => ({
      publicId: `csc:state:${state.id}`,
      entityType: 'state' as const,
      id: state.id,
      name: state.name,
      countryCode: state.countryCode,
      countryName: state.countryName,
      stateId: state.id,
      stateCode: state.stateCode,
      stateName: state.name,
      record: state as unknown as Record<string, unknown>,
    })),
    ...data.cities.map((city) => ({
      publicId: `csc:city:${city.id}`,
      entityType: 'city' as const,
      id: city.id,
      name: city.name,
      countryCode: city.countryCode,
      countryName: city.countryName,
      stateId: city.stateId,
      stateCode: city.stateCode,
      stateName: city.stateName,
      record: city as unknown as Record<string, unknown>,
    })),
    ...(data.districts || []).map((district) => ({
      publicId: district.publicId || `csc:district:${district.id}`,
      entityType: 'district' as const,
      id: district.id,
      name: district.name,
      countryCode: district.countryCode,
      countryName: district.countryName,
      stateId: district.stateId,
      stateCode: district.stateCode,
      stateName: district.stateName,
      aliases: districtAliases(district),
      record: district as unknown as Record<string, unknown>,
    })),
  ];
}

export class LocationSearchIndex {
  private readonly entries: IndexedEntity[];
  private readonly exact = new Map<string, Set<number>>();
  private readonly prefixes = new Map<string, Set<number>>();
  private readonly trigrams = new Map<string, Set<number>>();

  constructor(entities: SearchableLocationEntity[], policy?: LocationAliasPolicy) {
    const policyAliases = new Map<string, LocationNameAlias[]>();
    for (const alias of policy?.aliases || []) {
      validateAlias(alias);
      const bucket = policyAliases.get(alias.publicId) || [];
      bucket.push(alias);
      policyAliases.set(alias.publicId, bucket);
    }

    this.entries = entities.map((entity, index) => {
      const canonical: LocationNameAlias = {
        name: entity.name,
        languageTag: entity.languageTag || 'und',
        type: 'official',
        validFrom: null,
        validTo: null,
        source: { id: 'canonical-dataset', url: null, retrievedAt: '2026-08-08' },
      };
      const names = [
        canonical,
        ...(entity.aliases || []),
        ...(policyAliases.get(entity.publicId) || []),
      ]
        .filter(
          (name, nameIndex, all) =>
            all.findIndex(
              (candidate) =>
                normalizeSearchText(candidate.name) === normalizeSearchText(name.name) &&
                candidate.languageTag === name.languageTag
            ) === nameIndex
        )
        .map((name, nameIndex) => ({
          ...name,
          canonical: nameIndex === 0,
          normalized: normalizeSearchText(name.name),
        }));

      for (const name of names) this.indexName(index, name.normalized);
      return { ...entity, names };
    });
  }

  search(query: string, options: LocationSearchOptions = {}): LocationSearchMatch[] {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return [];
    const requestedTypes = new Set(options.entityTypes || []);
    const countryCode = options.countryCode?.trim().toUpperCase();
    const stateCode = options.stateCode?.trim().toUpperCase();
    const limit = Math.min(Math.max(options.limit || 25, 1), 100);
    const candidates = this.candidates(normalizedQuery);
    const matches: LocationSearchMatch[] = [];

    for (const index of candidates) {
      const entity = this.entries[index];
      if (requestedTypes.size && !requestedTypes.has(entity.entityType)) continue;
      if (countryCode && entity.countryCode.toUpperCase() !== countryCode) continue;
      if (options.stateId && entity.stateId !== options.stateId) continue;
      if (stateCode && entity.stateCode?.toUpperCase() !== stateCode) continue;

      let best: { name: IndexedName; reason: LocationMatchReason; score: number } | null = null;
      for (const name of entity.names) {
        const scored = scoreName(name, normalizedQuery, options.typoTolerance !== false);
        if (scored && (!best || scored.score > best.score)) best = { name, ...scored };
      }
      if (!best) continue;

      let score = best.score;
      if (countryCode) score += 0.03;
      if (stateCode || options.stateId) score += 0.04;
      matches.push({
        canonicalId: entity.publicId,
        entityType: entity.entityType,
        name: entity.name,
        countryCode: entity.countryCode,
        countryName: entity.countryName,
        stateId: entity.stateId ?? null,
        stateCode: entity.stateCode ?? null,
        stateName: entity.stateName ?? null,
        score: Number(Math.min(score, 1).toFixed(4)),
        matchReason: best.reason,
        matchedName: best.name.name,
        matchedLanguageTag: best.name.languageTag,
        matchedAliasType: best.name.canonical ? null : best.name.type,
        matchedAliasSource: best.name.canonical ? null : best.name.source,
        matchedAliasValidFrom: best.name.canonical ? null : best.name.validFrom,
        matchedAliasValidTo: best.name.canonical ? null : best.name.validTo,
        record: entity.record || {},
      });
    }

    return matches
      .sort(
        (a, b) =>
          b.score - a.score ||
          a.name.localeCompare(b.name) ||
          a.countryCode.localeCompare(b.countryCode) ||
          (a.stateCode || '').localeCompare(b.stateCode || '') ||
          a.canonicalId.localeCompare(b.canonicalId)
      )
      .slice(0, limit);
  }

  private indexName(index: number, value: string) {
    if (!value) return;
    addToBucket(this.exact, value, index);
    addToBucket(this.prefixes, value.slice(0, Math.min(2, value.length)), index);
    for (const trigram of grams(value)) addToBucket(this.trigrams, trigram, index);
  }

  private candidates(query: string): Set<number> {
    const candidates = new Set(this.exact.get(query) || []);
    const prefix = query.slice(0, Math.min(2, query.length));
    for (const index of this.prefixes.get(prefix) || []) candidates.add(index);

    const queryGrams = grams(query);
    const hits = new Map<number, number>();
    for (const trigram of queryGrams) {
      for (const index of this.trigrams.get(trigram) || []) {
        hits.set(index, (hits.get(index) || 0) + 1);
      }
    }
    const minimumHits = Math.max(1, queryGrams.size - 3);
    for (const [index, count] of hits) if (count >= minimumHits) candidates.add(index);
    return candidates;
  }
}

function scoreName(
  name: IndexedName,
  query: string,
  typoTolerance: boolean
): { reason: LocationMatchReason; score: number } | null {
  const prefix = name.canonical ? 'canonical' : 'alias';
  const penalty = name.canonical ? 0 : ALIAS_PENALTY[name.type];
  if (name.normalized === query)
    return { reason: `${prefix}-exact` as LocationMatchReason, score: 1 - penalty };
  if (name.normalized.startsWith(query))
    return { reason: `${prefix}-prefix` as LocationMatchReason, score: 0.9 - penalty };
  if (name.normalized.includes(query))
    return { reason: `${prefix}-contains` as LocationMatchReason, score: 0.78 - penalty };
  if (!typoTolerance || query.length < 4) return null;

  const maximum = query.length <= 5 ? 1 : 2;
  const distance = boundedLevenshtein(name.normalized, query, maximum);
  if (distance > maximum) return null;
  const similarity = 1 - distance / Math.max(name.normalized.length, query.length);
  if (similarity < 0.72) return null;
  return {
    reason: `${prefix}-typo` as LocationMatchReason,
    score: 0.65 + similarity * 0.2 - penalty,
  };
}

function boundedLevenshtein(a: string, b: string, maximum: number): number {
  if (Math.abs(a.length - b.length) > maximum) return maximum + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let row = 1; row <= a.length; row += 1) {
    const current = [row];
    let rowMinimum = row;
    for (let column = 1; column <= b.length; column += 1) {
      const value = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + (a[row - 1] === b[column - 1] ? 0 : 1)
      );
      current[column] = value;
      rowMinimum = Math.min(rowMinimum, value);
    }
    if (rowMinimum > maximum) return maximum + 1;
    previous = current;
  }
  return previous[b.length];
}

function grams(value: string): Set<string> {
  if (value.length < 3) return new Set([value]);
  const result = new Set<string>();
  for (let index = 0; index <= value.length - 3; index += 1)
    result.add(value.slice(index, index + 3));
  return result;
}

function addToBucket(map: Map<string, Set<number>>, key: string, value: number) {
  const bucket = map.get(key) || new Set<number>();
  bucket.add(value);
  map.set(key, bucket);
}

function validateAlias(alias: LocationAliasRecord) {
  if (!alias.publicId || !normalizeSearchText(alias.name))
    throw new Error('Alias identity and name are required.');
  try {
    Intl.getCanonicalLocales(alias.languageTag);
  } catch {
    throw new Error(`Alias ${alias.publicId} has invalid BCP 47 tag ${alias.languageTag}.`);
  }
  if (!alias.source.id || !alias.source.retrievedAt) {
    throw new Error(`Alias ${alias.publicId} must have source id and retrieval date.`);
  }
  if (alias.type === 'historical' && !alias.validTo) {
    throw new Error(`Historical alias ${alias.publicId} must have validTo.`);
  }
}
