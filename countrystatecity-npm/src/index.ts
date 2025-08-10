import { readFileSync } from 'fs';
import { join } from 'path';
import { Country, State, City, DataFormat, FormatOptions } from './types';
import { DataFormatter } from './formatters';

export * from './types';
export { DataFormatter } from './formatters';

export class CountryStateCity {
  private static countries: Country[] | null = null;
  private static states: State[] | null = null;
  private static cities: City[] | null = null;
  
  // Lazy loading to prevent memory issues during build
  private static loadCountries(): Country[] {
    if (!this.countries) {
      try {
        // Try different paths to find the data
        const paths = [
          join(__dirname, 'data', 'country.json'),
          join(__dirname, '..', 'data', 'country.json'),
          join(process.cwd(), 'node_modules', 'countrystatecity', 'data', 'country.json'),
          join(process.cwd(), 'node_modules', 'countrystatecity', 'dist', 'data', 'country.json')
        ];
        
        for (const path of paths) {
          try {
            const data = readFileSync(path, 'utf-8');
            this.countries = JSON.parse(data);
            break;
          } catch (e) {
            // Try next path
          }
        }
        
        if (!this.countries) {
          console.error('Failed to load countries data');
          this.countries = [];
        }
      } catch (error) {
        console.error('Error loading countries:', error);
        this.countries = [];
      }
    }
    return this.countries;
  }
  
  private static loadStates(): State[] {
    if (!this.states) {
      try {
        const paths = [
          join(__dirname, 'data', 'state.json'),
          join(__dirname, '..', 'data', 'state.json'),
          join(process.cwd(), 'node_modules', 'countrystatecity', 'data', 'state.json'),
          join(process.cwd(), 'node_modules', 'countrystatecity', 'dist', 'data', 'state.json')
        ];
        
        for (const path of paths) {
          try {
            const data = readFileSync(path, 'utf-8');
            this.states = JSON.parse(data);
            break;
          } catch (e) {
            // Try next path
          }
        }
        
        if (!this.states) {
          console.error('Failed to load states data');
          this.states = [];
        }
      } catch (error) {
        console.error('Error loading states:', error);
        this.states = [];
      }
    }
    return this.states;
  }
  
  private static loadCities(): City[] {
    if (!this.cities) {
      try {
        const paths = [
          join(__dirname, 'data', 'city.json'),
          join(__dirname, '..', 'data', 'city.json'),
          join(process.cwd(), 'node_modules', 'countrystatecity', 'data', 'city.json'),
          join(process.cwd(), 'node_modules', 'countrystatecity', 'dist', 'data', 'city.json')
        ];
        
        for (const path of paths) {
          try {
            const data = readFileSync(path, 'utf-8');
            this.cities = JSON.parse(data);
            break;
          } catch (e) {
            // Try next path
          }
        }
        
        if (!this.cities) {
          console.error('Failed to load cities data');
          this.cities = [];
        }
      } catch (error) {
        console.error('Error loading cities:', error);
        this.cities = [];
      }
    }
    return this.cities;
  }

  // ============ COUNTRY METHODS ============
  
  static getAllCountries(format?: DataFormat, options?: FormatOptions): Country[] | string {
    const countries = this.loadCountries();
    if (format) {
      return DataFormatter.format(countries, format, {
        rootName: 'countries',
        itemName: 'country'
      }, options);
    }
    return countries;
  }

  static getCountryById(id: number): Country | undefined {
    return this.loadCountries().find(country => country.id === id);
  }

  static getCountryByIso2(iso2: string): Country | undefined {
    return this.loadCountries().find(country => 
      country.iso2.toLowerCase() === iso2.toLowerCase()
    );
  }

  static getCountryByIso3(iso3: string): Country | undefined {
    return this.loadCountries().find(country => 
      country.iso3.toLowerCase() === iso3.toLowerCase()
    );
  }

  static searchCountries(query: string): Country[] {
    const searchTerm = query.toLowerCase();
    return this.loadCountries().filter(country =>
      country.name.toLowerCase().includes(searchTerm) ||
      (country.native && country.native.toLowerCase().includes(searchTerm))
    );
  }

  static getCountriesByRegion(region: string): Country[] {
    return this.loadCountries().filter(country =>
      country.region.toLowerCase() === region.toLowerCase()
    );
  }

  static getCountriesBySubregion(subregion: string): Country[] {
    return this.loadCountries().filter(country =>
      country.subregion.toLowerCase() === subregion.toLowerCase()
    );
  }

  // ============ STATE METHODS ============

  static getAllStates(format?: DataFormat, options?: FormatOptions): State[] | string {
    const states = this.loadStates();
    if (format) {
      return DataFormatter.format(states, format, {
        rootName: 'states',
        itemName: 'state'
      }, options);
    }
    return states;
  }

  static getStateById(id: number): State | undefined {
    return this.loadStates().find(state => state.id === id);
  }

  static getStatesByCountryId(countryId: number, format?: DataFormat, options?: FormatOptions): State[] | string {
    const states = this.loadStates().filter(state => state.countryId === countryId);
    if (format) {
      return DataFormatter.format(states, format, {
        rootName: 'states',
        itemName: 'state'
      }, options);
    }
    return states;
  }

  static getStatesByCountryCode(countryCode: string, format?: DataFormat, options?: FormatOptions): State[] | string {
    const states = this.loadStates().filter(state =>
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
    let results = this.loadStates().filter(state =>
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
      countries: this.loadCountries().length,
      states: this.loadStates().length,
      cities: this.loadCities().length
    };
  }

  static getAllRegions(): string[] {
    const regions = new Set(this.loadCountries().map(country => country.region));
    return Array.from(regions).filter(Boolean).sort();
  }

  static getAllSubregions(): string[] {
    const subregions = new Set(this.loadCountries().map(country => country.subregion));
    return Array.from(subregions).filter(Boolean).sort();
  }

  static getAllTimezones(): string[] {
    const timezones = new Set<string>();
    this.loadCountries().forEach(country => {
      country.timezones.forEach(tz => {
        timezones.add(tz.zoneName);
      });
    });
    return Array.from(timezones).sort();
  }

  static getAllCurrencies(): Array<{code: string, name: string, symbol: string}> {
    const currenciesMap = new Map<string, {name: string, symbol: string}>();
    
    this.loadCountries().forEach(country => {
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
        return DataFormatter.format(this.loadCountries(), format, {
          rootName: 'countries',
          itemName: 'country'
        }, options);
      case 'states':
        return DataFormatter.format(this.loadStates(), format, {
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