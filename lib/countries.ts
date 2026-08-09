import countriesData from '@/data/country.json';
import statesData from '@/data/state.json';
import { deriveCityEntityClassification } from '@/countrystatecity-npm/src/entity-levels';
import type { Country, State, City } from '@/types';
import { STATS } from '@/lib/stats';

interface CompactCity {
  i: number;
  n: string;
  s: number;
  la: number;
  lo: number;
  w?: string;
}

export interface CityShardLoadOptions {
  signal?: AbortSignal;
}

const countries = countriesData as Country[];
const states = statesData as State[];
const countryById = new Map(countries.map((country) => [country.id, country]));
const stateById = new Map(states.map((state) => [state.id, state]));
const cityShardCache = new Map<number, City[]>();

export const getCountries = (limit?: number): Country[] =>
  limit ? countries.slice(0, limit) : countries;

export const getCountryById = (id: number): Country | undefined => countryById.get(id);

export const getCountryByCode = (code: string): Country | undefined => {
  const normalized = code.toUpperCase();
  return countries.find((country) => country.iso2 === normalized || country.iso3 === normalized);
};

export const getStatesByCountryId = (countryId: number): State[] =>
  states.filter((state) => state.countryId === countryId);

export const getStateById = (id: number): State | undefined => stateById.get(id);

export async function getCitiesByCountryId(
  countryId: number,
  options: CityShardLoadOptions = {}
): Promise<City[]> {
  const cached = cityShardCache.get(countryId);
  if (cached) return cached;
  const country = countryById.get(countryId);
  if (!country) throw new Error(`Unknown country ID: ${countryId}`);
  const response = await fetch(`/data/cities/${country.iso2.toLowerCase()}.json`, {
    signal: options.signal,
    cache: 'force-cache',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok)
    throw new Error(`City shard request failed for ${country.iso2}: HTTP ${response.status}`);
  const compactRows = (await response.json()) as CompactCity[];
  const cities = compactRows.map((row) => inflateCity(row, country));
  cityShardCache.set(countryId, cities);
  return cities;
}

export async function getCitiesByStateId(
  stateId: number,
  options: CityShardLoadOptions = {}
): Promise<City[]> {
  const state = stateById.get(stateId);
  if (!state) throw new Error(`Unknown state ID: ${stateId}`);
  const cities = await getCitiesByCountryId(state.countryId, options);
  return cities.filter((city) => city.stateId === stateId);
}

export async function searchCities(
  query: string,
  stateId?: number,
  countryId?: number,
  options: CityShardLoadOptions = {}
): Promise<City[]> {
  const resolvedCountryId = countryId ?? (stateId ? stateById.get(stateId)?.countryId : undefined);
  if (!resolvedCountryId) return [];
  const searchTerm = query.trim().toLocaleLowerCase();
  if (!searchTerm) return [];
  const cities = await getCitiesByCountryId(resolvedCountryId, options);
  return cities.filter(
    (city) =>
      (!stateId || city.stateId === stateId) &&
      [city.name, city.stateName, city.wikiDataId].some((value) =>
        value.toLocaleLowerCase().includes(searchTerm)
      )
  );
}

export const searchCountries = (query: string): Country[] => {
  const searchTerm = query.toLocaleLowerCase();
  return countries.filter((country) =>
    [country.name, country.native, country.iso2, country.iso3].some((value) =>
      value.toLocaleLowerCase().includes(searchTerm)
    )
  );
};

export const searchStates = (query: string, countryId?: number): State[] => {
  const searchTerm = query.toLocaleLowerCase();
  return states.filter(
    (state) =>
      (!countryId || state.countryId === countryId) &&
      [state.name, state.stateCode].some((value) => value.toLocaleLowerCase().includes(searchTerm))
  );
};

export const getStats = () => ({
  countries: countries.length,
  states: states.length,
  cities: STATS.cities,
});

export function clearCityShardCache(): void {
  cityShardCache.clear();
}

function inflateCity(row: CompactCity, country: Country): City {
  const state = stateById.get(row.s);
  const base = {
    id: row.i,
    name: row.n,
    stateId: row.s,
    stateCode: state?.stateCode ?? '',
    stateName: state?.name ?? '',
    countryId: country.id,
    countryCode: country.iso2,
    countryName: country.name,
    latitude: String(row.la),
    longitude: String(row.lo),
    wikiDataId: row.w ?? '',
  };
  return { ...base, ...deriveCityEntityClassification(base, state) };
}

export { countries, states };
