import { readFileSync } from 'node:fs';
import path from 'node:path';

import { CenterReverseGeocoder } from '../../countrystatecity-npm/src/reverse-geocoding';
import {
  createLocationSearchEntities,
  LocationSearchIndex,
  type LocationAliasPolicy,
  type LocationSearchData,
  type LocationSearchEntityType,
} from '../../countrystatecity-npm/src/search';
import type { CoordinatePoint, NearestCenterOptions } from '../../countrystatecity-npm/src/types';

export interface CountryRecord {
  id: number;
  name: string;
  iso2: string;
  iso3: string;
  numericCode: string;
  capital: string;
  region: string;
  subregion: string;
  latitude: string;
  longitude: string;
  emoji: string;
  [key: string]: unknown;
}

export interface SubdivisionRecord {
  id: number;
  name: string;
  countryId: number;
  countryCode: string;
  countryName: string;
  stateCode: string;
  type: string | null;
  latitude: string;
  longitude: string;
  [key: string]: unknown;
}

interface CompactPlace {
  i: number;
  n: string;
  s: number;
  c: number;
  la: number;
  lo: number;
  w?: string;
}

export interface PlaceRecord {
  id: number;
  name: string;
  subdivisionId: number;
  subdivisionCode: string;
  subdivisionName: string;
  countryId: number;
  countryCode: string;
  countryName: string;
  latitude: number;
  longitude: number;
  wikiDataId: string | null;
  [key: string]: unknown;
}

interface ProductionManifest {
  dataVersion: string;
  packageVersion: string;
  generatedAt: string;
  counts: Record<string, number>;
}

interface Provenance {
  database: {
    name: string;
    license: { id: string; name: string; url: string };
    attribution: string;
  };
}

function loadJson<T>(filename: string): T {
  const dataRoot = process.env.CSC_DATA_DIR || path.resolve(process.cwd(), 'data');
  return JSON.parse(readFileSync(path.join(dataRoot, filename), 'utf8')) as T;
}

const countries = loadJson<CountryRecord[]>('country.json');
const subdivisions = loadJson<SubdivisionRecord[]>('state.json');
const compactPlaces = loadJson<CompactPlace[]>('city-optimized.json');
const manifest = loadJson<ProductionManifest>('production-manifest.json');
const provenance = loadJson<Provenance>('provenance.json');
const aliasPolicy = loadJson<LocationAliasPolicy>('search/alias-policy.json');
const districtData = loadJson<{ districts: Array<Record<string, unknown>> }>(
  'admin/districts/tr.json'
);

const countryById = new Map(countries.map((country) => [country.id, country]));
const countryByCode = new Map<string, CountryRecord>();
for (const country of countries) {
  countryByCode.set(String(country.id), country);
  countryByCode.set(country.iso2.toUpperCase(), country);
  countryByCode.set(country.iso3.toUpperCase(), country);
}

const subdivisionById = new Map(subdivisions.map((subdivision) => [subdivision.id, subdivision]));
const subdivisionsByCountry = new Map<number, SubdivisionRecord[]>();
for (const subdivision of subdivisions) {
  const bucket = subdivisionsByCountry.get(subdivision.countryId) || [];
  bucket.push(subdivision);
  subdivisionsByCountry.set(subdivision.countryId, bucket);
}

const placesByCountry = new Map<number, CompactPlace[]>();
const placesBySubdivision = new Map<number, CompactPlace[]>();
for (const place of compactPlaces) {
  const countryBucket = placesByCountry.get(place.c) || [];
  countryBucket.push(place);
  placesByCountry.set(place.c, countryBucket);

  const subdivisionBucket = placesBySubdivision.get(place.s) || [];
  subdivisionBucket.push(place);
  placesBySubdivision.set(place.s, subdivisionBucket);
}

function normalize(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('en')
    .replaceAll('ı', 'i');
}

function includesQuery(record: Record<string, unknown>, query?: string): boolean {
  if (!query) return true;
  const needle = normalize(query);
  return Object.values(record).some((value) =>
    typeof value === 'string' || typeof value === 'number'
      ? normalize(value).includes(needle)
      : false
  );
}

function resolveSubdivision(country: CountryRecord, value?: string): SubdivisionRecord | undefined {
  if (!value) return undefined;
  const needle = value.toUpperCase();
  return (subdivisionsByCountry.get(country.id) || []).find(
    (subdivision) =>
      String(subdivision.id) === value ||
      subdivision.stateCode.toUpperCase() === needle ||
      normalize(subdivision.name) === normalize(value)
  );
}

function inflatePlace(place: CompactPlace): PlaceRecord {
  const country = countryById.get(place.c);
  const subdivision = subdivisionById.get(place.s);
  if (!country || !subdivision) {
    throw new Error(`Place ${place.i} has an unresolved parent.`);
  }
  return {
    id: place.i,
    name: place.n,
    subdivisionId: subdivision.id,
    subdivisionCode: subdivision.stateCode,
    subdivisionName: subdivision.name,
    countryId: country.id,
    countryCode: country.iso2,
    countryName: country.name,
    latitude: place.la,
    longitude: place.lo,
    wikiDataId: place.w || null,
  };
}

export const dataMetadata = Object.freeze({
  dataVersion: manifest.dataVersion,
  packageVersion: manifest.packageVersion,
  generatedAt: manifest.generatedAt,
  counts: manifest.counts,
  source: {
    name: provenance.database.name,
    license: provenance.database.license,
    attribution: provenance.database.attribution,
  },
});

let reverseGeocoder: CenterReverseGeocoder | null = null;
const locationSearchIndexes = new Map<string, LocationSearchIndex>();

function getReverseGeocoder() {
  if (!reverseGeocoder) {
    reverseGeocoder = new CenterReverseGeocoder(
      {
        country: countries,
        state: subdivisions,
        city: () => compactPlaces.map(inflatePlace),
        district: [],
      },
      manifest.dataVersion
    );
  }
  return reverseGeocoder;
}

function getLocationSearchIndex(options: {
  countryCode?: string;
  stateId?: number;
  entityTypes: LocationSearchEntityType[];
}) {
  const types = new Set(options.entityTypes);
  const countryCode = options.countryCode?.toUpperCase();
  const countryId = countryCode ? countryByCode.get(countryCode)?.id : undefined;
  const key = [countryCode || '*', options.stateId || '*', [...types].sort().join(',')].join(':');
  let index = locationSearchIndexes.get(key);
  if (!index) {
    const places = (types.has('city') ? compactPlaces : [])
      .filter(
        (place) =>
          (!countryId || place.c === countryId) && (!options.stateId || place.s === options.stateId)
      )
      .map((place) => {
        const inflated = inflatePlace(place);
        return {
          ...inflated,
          stateId: inflated.subdivisionId,
          stateCode: inflated.subdivisionCode,
          stateName: inflated.subdivisionName,
        };
      });
    index = new LocationSearchIndex(
      createLocationSearchEntities({
        countries: types.has('country')
          ? countries.filter((country) => !countryId || country.id === countryId)
          : [],
        states: types.has('state')
          ? subdivisions.filter(
              (state) =>
                (!countryId || state.countryId === countryId) &&
                (!options.stateId || state.id === options.stateId)
            )
          : [],
        cities: places,
        districts: types.has('district')
          ? (districtData.districts.filter(
              (district) =>
                (!countryCode || String(district.countryCode).toUpperCase() === countryCode) &&
                (!options.stateId || district.stateId === options.stateId)
            ) as unknown as NonNullable<LocationSearchData['districts']>)
          : [],
      }),
      aliasPolicy
    );
    locationSearchIndexes.set(key, index);
  }
  return index;
}

export const dataStore = {
  countries(query?: string): CountryRecord[] {
    return query ? countries.filter((country) => includesQuery(country, query)) : countries;
  },

  country(value: string): CountryRecord | undefined {
    return countryByCode.get(value.toUpperCase());
  },

  subdivisions(countryValue: string, query?: string): SubdivisionRecord[] {
    const country = this.country(countryValue);
    if (!country) return [];
    const records = subdivisionsByCountry.get(country.id) || [];
    return query ? records.filter((record) => includesQuery(record, query)) : records;
  },

  places(countryValue: string, subdivisionValue?: string, query?: string): PlaceRecord[] {
    const country = this.country(countryValue);
    if (!country) return [];
    const subdivision = resolveSubdivision(country, subdivisionValue);
    if (subdivisionValue && !subdivision) return [];
    const records = subdivision
      ? placesBySubdivision.get(subdivision.id) || []
      : placesByCountry.get(country.id) || [];
    return records
      .filter((place) => !query || includesQuery({ name: place.n, id: place.i }, query))
      .map(inflatePlace);
  },

  search(
    query: string,
    options: { country?: string; subdivision?: string; types?: string[] } = {}
  ): Array<Record<string, unknown>> {
    const typeMap: Record<string, LocationSearchEntityType> = {
      country: 'country',
      subdivision: 'state',
      place: 'city',
      district: 'district',
    };
    const country = options.country ? this.country(options.country) : undefined;
    const subdivision = country ? resolveSubdivision(country, options.subdivision) : undefined;
    const searchOptions = {
      countryCode: country?.iso2,
      stateId: subdivision?.id,
      entityTypes: (options.types || ['country', 'subdivision', 'place']).map(
        (type) => typeMap[type]
      ),
      limit: 100,
    };
    return getLocationSearchIndex(searchOptions)
      .search(query, {
        ...searchOptions,
        limit: 100,
      })
      .map((match) => ({ ...match }));
  },

  reverse(point: CoordinatePoint, options: NearestCenterOptions = {}) {
    return getReverseGeocoder().nearest(point, options);
  },

  reverseBatch(points: readonly CoordinatePoint[], options: NearestCenterOptions = {}) {
    return getReverseGeocoder().nearestBatch(points, options);
  },
};

export type DataStore = typeof dataStore;
