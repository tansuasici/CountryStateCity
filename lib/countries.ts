import countriesData from '@/data/country.json';
import statesData from '@/data/state.json';
import citiesData from '@/data/city.json';
import { Country, State, City } from '@/types';

// Load data directly from JSON files
const countries: Country[] = countriesData as Country[];
const states: State[] = statesData as State[];
const cities: City[] = citiesData as City[];

// Helper functions for data access
export const getCountries = (limit?: number): Country[] => {
  return limit ? countries.slice(0, limit) : countries;
};

export const getCountryById = (id: number): Country | undefined => {
  return countries.find(country => country.id === id);
};

export const getCountryByCode = (code: string): Country | undefined => {
  return countries.find(country => 
    country.iso2 === code.toUpperCase() || 
    country.iso3 === code.toUpperCase()
  );
};

export const getStatesByCountryId = (countryId: number): State[] => {
  return states.filter(state => state.countryId === countryId);
};

export const getStateById = (id: number): State | undefined => {
  return states.find(state => state.id === id);
};

export const getCitiesByStateId = (stateId: number): City[] => {
  return cities.filter(city => city.stateId === stateId);
};

export const getCityById = (id: number): City | undefined => {
  return cities.find(city => city.id === id);
};

export const getCitiesByCountryId = (countryId: number): City[] => {
  return cities.filter(city => city.countryId === countryId);
};

// Search functions
export const searchCountries = (query: string): Country[] => {
  const searchTerm = query.toLowerCase();
  return countries.filter(country => 
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
    filteredStates = states.filter(state => state.countryId === countryId);
  }
  
  return filteredStates.filter(state => 
    state.name.toLowerCase().includes(searchTerm) ||
    state.stateCode.toLowerCase().includes(searchTerm)
  );
};

export const searchCities = (query: string, stateId?: number, countryId?: number): City[] => {
  const searchTerm = query.toLowerCase();
  let filteredCities = cities;
  
  if (stateId) {
    filteredCities = cities.filter(city => city.stateId === stateId);
  } else if (countryId) {
    filteredCities = cities.filter(city => city.countryId === countryId);
  }
  
  return filteredCities.filter(city => 
    city.name.toLowerCase().includes(searchTerm)
  );
};

// Statistics
export const getStats = () => {
  return {
    countries: countries.length,
    states: states.length,
    cities: cities.length
  };
};

// Export all data for different formats
export { countries, states, cities };