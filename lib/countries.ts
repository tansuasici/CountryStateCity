import { CountryStateCity } from '../countrystatecity-npm/src/index.browser';
import { Country, State, City } from '@/types';
import { STATS } from '@/lib/stats';

// Countries (~250) and states (~5k) are small and are read eagerly.
// Cities (~148k) are intentionally NOT loaded here — they are only
// decompressed on first city access, keeping the heavy dataset out of
// the initial page load.
const countries: Country[] = CountryStateCity.getAllCountries() as Country[];
const states: State[] = CountryStateCity.getAllStates() as State[];

// Helper functions for data access
export const getCountries = (limit?: number): Country[] => {
  return limit ? countries.slice(0, limit) : countries;
};

export const getCountryById = (id: number): Country | undefined => {
  return countries.find((country) => country.id === id);
};

export const getCountryByCode = (code: string): Country | undefined => {
  return countries.find(
    (country) => country.iso2 === code.toUpperCase() || country.iso3 === code.toUpperCase()
  );
};

export const getStatesByCountryId = (countryId: number): State[] => {
  return states.filter((state) => state.countryId === countryId);
};

export const getStateById = (id: number): State | undefined => {
  return states.find((state) => state.id === id);
};

// City accessors delegate to the package, which lazy-loads + decompresses
// the city dataset on first use (keeps it out of the initial bundle path).
export const getCitiesByStateId = (stateId: number): City[] => {
  return CountryStateCity.getCitiesByStateId(stateId) as City[];
};

export const getCityById = (id: number): City | undefined => {
  return CountryStateCity.getCityById(id) as City | undefined;
};

export const getCitiesByCountryId = (countryId: number): City[] => {
  return CountryStateCity.getCitiesByCountryId(countryId) as City[];
};

// Search functions
export const searchCountries = (query: string): Country[] => {
  const searchTerm = query.toLowerCase();
  return countries.filter(
    (country) =>
      country.name.toLowerCase().includes(searchTerm) ||
      country.native.toLowerCase().includes(searchTerm) ||
      country.iso2.toLowerCase().includes(searchTerm) ||
      country.iso3.toLowerCase().includes(searchTerm)
  );
};

export const searchStates = (query: string, countryId?: number): State[] => {
  const searchTerm = query.toLowerCase();
  let filteredStates = states;

  if (countryId) {
    filteredStates = states.filter((state) => state.countryId === countryId);
  }

  return filteredStates.filter(
    (state) =>
      state.name.toLowerCase().includes(searchTerm) ||
      state.stateCode.toLowerCase().includes(searchTerm)
  );
};

export const searchCities = (query: string, stateId?: number, countryId?: number): City[] => {
  return CountryStateCity.searchCities(query, stateId, countryId) as City[];
};

// Statistics — uses precomputed totals so this never forces the full
// city dataset to load just to display a count.
export const getStats = () => {
  return {
    countries: countries.length,
    states: states.length,
    cities: STATS.cities,
  };
};

// Export country/state data for direct use (cities load on demand).
export { countries, states };
