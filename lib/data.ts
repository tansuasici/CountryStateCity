import { Country, State, City } from '@/types';
import countriesData from '@/data/country.json';
import statesData from '@/data/state.json';
import citiesData from '@/data/city.json';

export const countries: Country[] = countriesData as Country[];
export const states: State[] = statesData as State[];
export const cities: City[] = citiesData as City[];

export class DataService {
  static getAllCountries(): Country[] {
    return countries;
  }

  static getCountryById(id: number): Country | undefined {
    return countries.find(country => country.id === id);
  }

  static getCountryByCode(code: string): Country | undefined {
    const upperCode = code.toUpperCase();
    return countries.find(country => 
      country.iso2 === upperCode || country.iso3 === upperCode
    );
  }

  static searchCountries(query: string): Country[] {
    const searchTerm = query.toLowerCase();
    return countries.filter(country =>
      country.name.toLowerCase().includes(searchTerm) ||
      country.iso2.toLowerCase().includes(searchTerm) ||
      country.iso3.toLowerCase().includes(searchTerm)
    );
  }

  static getStatesByCountryId(countryId: number): State[] {
    return states.filter(state => state.countryId === countryId);
  }

  static getStateById(id: number): State | undefined {
    return states.find(state => state.id === id);
  }

  static searchStates(query: string, countryId?: number): State[] {
    const searchTerm = query.toLowerCase();
    let filteredStates = query ? states.filter(state =>
      state.name.toLowerCase().includes(searchTerm)
    ) : states;

    if (countryId) {
      filteredStates = filteredStates.filter(state => state.countryId === countryId);
    }

    return filteredStates;
  }

  static getCitiesByStateId(stateId: number): City[] {
    return cities.filter(city => city.stateId === stateId);
  }

  static getCitiesByCountryId(countryId: number): City[] {
    return cities.filter(city => city.countryId === countryId);
  }

  static getCityById(id: number): City | undefined {
    return cities.find(city => city.id === id);
  }

  static searchCities(query: string, stateId?: number, countryId?: number): City[] {
    const searchTerm = query.toLowerCase();
    let filteredCities = cities.filter(city =>
      city.name.toLowerCase().includes(searchTerm)
    );

    if (stateId) {
      filteredCities = filteredCities.filter(city => city.stateId === stateId);
    } else if (countryId) {
      filteredCities = filteredCities.filter(city => city.countryId === countryId);
    }

    return filteredCities;
  }

  static getStats() {
    return {
      totalCountries: countries.length,
      totalStates: states.length,
      totalCities: cities.length
    };
  }
}