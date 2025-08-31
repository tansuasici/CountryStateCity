// Browser-safe version without fs/path dependencies
import { Country, State, City, DataFormat, FormatOptions } from './types';
import { DataFormatter } from './formatters';

// Import JSON data directly for browser compatibility
import countriesData from '../../data/country.json';
import statesData from '../../data/state.json';
import citiesData from '../../data/city.json';

export * from './types';
export { DataFormatter } from './formatters';

export class CountryStateCity {
  private static countries: Country[] = countriesData as Country[];
  private static states: State[] = statesData as State[];
  private static cities: City[] | null = null;
  
  // Lazy loading to prevent memory issues during build
  private static loadCities(): City[] {
    if (!this.cities) {
      // Check if data is in optimized format or full format
      const sampleCity = citiesData[0] as any;
      const isOptimized = sampleCity && typeof sampleCity.i !== 'undefined';
      
      if (isOptimized) {
        // Convert optimized format back to full format
        this.cities = (citiesData as any[]).map((city: any) => ({
          id: city.i,
          name: city.n,
          stateId: city.s,
          stateCode: '',
          stateName: '',
          countryId: city.c,
          countryCode: '',
          countryName: '',
          latitude: String(city.la),
          longitude: String(city.lo),
          wikiDataId: city.w || ''
        }));
      } else {
        // Data is already in full format
        this.cities = citiesData as City[];
      }
      
      // Fill in missing data from states and countries if needed
      if (this.cities && isOptimized) {
        this.cities.forEach(city => {
          const state = this.states.find(s => s.id === city.stateId);
          const country = this.countries.find(c => c.id === city.countryId);
          
          if (state) {
            city.stateCode = state.stateCode;
            city.stateName = state.name;
          }
          
          if (country) {
            city.countryCode = country.iso2;
            city.countryName = country.name;
          }
        });
      }
    }
    return this.cities;
  }

  // ============ COUNTRY METHODS ============
  
  static getAllCountries(format?: DataFormat, options?: FormatOptions): Country[] | string {
    if (format) {
      return DataFormatter.format(this.countries, format, {
        rootName: 'countries',
        itemName: 'country'
      }, options);
    }
    return this.countries;
  }

  static getCountryById(id: number): Country | undefined {
    return this.countries.find(country => country.id === id);
  }

  static getCountryByIso2(iso2: string): Country | undefined {
    return this.countries.find(country => 
      country.iso2.toLowerCase() === iso2.toLowerCase()
    );
  }

  static getCountryByIso3(iso3: string): Country | undefined {
    return this.countries.find(country => 
      country.iso3.toLowerCase() === iso3.toLowerCase()
    );
  }

  static searchCountries(query: string): Country[] {
    const searchTerm = query.toLowerCase();
    return this.countries.filter(country =>
      country.name.toLowerCase().includes(searchTerm) ||
      (country.native && country.native.toLowerCase().includes(searchTerm))
    );
  }

  static getCountriesByRegion(region: string): Country[] {
    return this.countries.filter(country =>
      country.region.toLowerCase() === region.toLowerCase()
    );
  }

  static getCountriesBySubregion(subregion: string): Country[] {
    return this.countries.filter(country =>
      country.subregion.toLowerCase() === subregion.toLowerCase()
    );
  }

  // ============ STATE METHODS ============

  static getAllStates(format?: DataFormat, options?: FormatOptions): State[] | string {
    if (format) {
      return DataFormatter.format(this.states, format, {
        rootName: 'states',
        itemName: 'state'
      }, options);
    }
    return this.states;
  }

  static getStateById(id: number): State | undefined {
    return this.states.find(state => state.id === id);
  }

  static getStatesByCountryId(countryId: number, format?: DataFormat, options?: FormatOptions): State[] | string {
    const states = this.states.filter(state => state.countryId === countryId);
    if (format) {
      return DataFormatter.format(states, format, {
        rootName: 'states',
        itemName: 'state'
      }, options);
    }
    return states;
  }

  static getStatesByCountryCode(countryCode: string, format?: DataFormat, options?: FormatOptions): State[] | string {
    const states = this.states.filter(state =>
      state.countryCode.toLowerCase() === countryCode.toLowerCase()
    );
    if (format) {
      return DataFormatter.format(states, format, {
        rootName: 'states',
        itemName: 'state'
      }, options);
    }
    return states;
  }

  static searchStates(query: string, countryId?: number): State[] {
    const searchTerm = query.toLowerCase();
    let results = this.states.filter(state =>
      state.name.toLowerCase().includes(searchTerm)
    );
    
    if (countryId) {
      results = results.filter(state => state.countryId === countryId);
    }
    
    return results;
  }

  // ============ CITY METHODS ============

  static getAllCities(format?: DataFormat, options?: FormatOptions): City[] | string {
    const cities = this.loadCities();
    if (format) {
      return DataFormatter.format(cities, format, {
        rootName: 'cities',
        itemName: 'city'
      }, options);
    }
    return cities;
  }

  static getCityById(id: number): City | undefined {
    return this.loadCities().find(city => city.id === id);
  }

  static getCitiesByStateId(stateId: number, format?: DataFormat, options?: FormatOptions): City[] | string {
    const cities = this.loadCities().filter(city => city.stateId === stateId);
    if (format) {
      return DataFormatter.format(cities, format, {
        rootName: 'cities',
        itemName: 'city'
      }, options);
    }
    return cities;
  }

  static getCitiesByCountryId(countryId: number, format?: DataFormat, options?: FormatOptions): City[] | string {
    const cities = this.loadCities().filter(city => city.countryId === countryId);
    if (format) {
      return DataFormatter.format(cities, format, {
        rootName: 'cities',
        itemName: 'city'
      }, options);
    }
    return cities;
  }

  static searchCities(query: string, stateId?: number, countryId?: number): City[] {
    const searchTerm = query.toLowerCase();
    let results = this.loadCities().filter(city =>
      city.name.toLowerCase().includes(searchTerm)
    );
    
    if (stateId) {
      results = results.filter(city => city.stateId === stateId);
    }
    
    if (countryId) {
      results = results.filter(city => city.countryId === countryId);
    }
    
    return results;
  }

  // ============ UTILITY METHODS ============

  static getStats() {
    return {
      countries: this.countries.length,
      states: this.states.length,
      cities: this.loadCities().length
    };
  }

  static getAllRegions(): string[] {
    const regions = new Set(this.countries.map(country => country.region));
    return Array.from(regions).filter(Boolean).sort();
  }

  static getAllSubregions(): string[] {
    const subregions = new Set(this.countries.map(country => country.subregion));
    return Array.from(subregions).filter(Boolean).sort();
  }

  static getAllTimezones(): string[] {
    const timezones = new Set<string>();
    this.countries.forEach(country => {
      country.timezones.forEach(tz => {
        timezones.add(tz.zoneName);
      });
    });
    return Array.from(timezones).sort();
  }

  static getAllCurrencies(): Array<{code: string, name: string, symbol: string}> {
    const currenciesMap = new Map<string, {name: string, symbol: string}>();
    
    this.countries.forEach(country => {
      if (country.currency && !currenciesMap.has(country.currency)) {
        currenciesMap.set(country.currency, {
          name: country.currencyName,
          symbol: country.currencySymbol
        });
      }
    });
    
    return Array.from(currenciesMap.entries())
      .map(([code, data]) => ({
        code,
        name: data.name,
        symbol: data.symbol
      }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  static exportData(
    dataType: 'countries' | 'states' | 'cities',
    format: DataFormat,
    options: FormatOptions = {}
  ): string {
    switch (dataType) {
      case 'countries':
        return DataFormatter.format(this.countries, format, {
          rootName: 'countries',
          itemName: 'country'
        }, options);
      case 'states':
        return DataFormatter.format(this.states, format, {
          rootName: 'states',
          itemName: 'state'
        }, options);
      case 'cities':
        return DataFormatter.format(this.loadCities(), format, {
          rootName: 'cities',
          itemName: 'city'
        }, options);
      default:
        throw new Error(`Invalid data type: ${dataType}`);
    }
  }
}

export default CountryStateCity;