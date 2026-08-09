import { readFileSync } from 'fs';
import { join } from 'path';
import {
  Country,
  State,
  City,
  District,
  CoverageReport,
  CountryCoverage,
  DataFormat,
  FormatOptions,
  AdministrativeAreaQuery,
  SettlementQuery,
  CountryTranslationLocale,
  CountryTranslationAlias,
  CoordinatePoint,
  NearestCenterOptions,
  NearestCenterResult,
} from './types';
import { DataFormatter } from './formatters';
import { deriveCityEntityClassification } from './entity-levels';
import { getCountryTranslation as resolveCountryTranslation } from './translations';
import { getTimezoneOffset as observeTimezoneOffset } from './timezones';
import { CenterReverseGeocoder } from './reverse-geocoding';
import {
  createLocationSearchEntities,
  LocationSearchIndex,
  type LocationAliasPolicy,
  type LocationSearchMatch,
  type LocationSearchOptions,
} from './search';
import searchAliasPolicyData from '../../data/search/alias-policy.json' with { type: 'json' };

const runtimeDirectory = typeof __dirname === 'string' ? __dirname : process.cwd();

export * from './types';
export * from './location-names';
export * from './public-id';
export * from './translations';
export * from './timezones';
export * from './reverse-geocoding';
export * from './search';
export { DataFormatter } from './formatters';

export class CountryStateCity {
  private static countries: Country[] | null = null;
  private static states: State[] | null = null;
  private static cities: City[] | null = null;
  private static districts: District[] | null = null;
  private static coverageReport: CoverageReport | null = null;
  private static dataVersion: string | null = null;
  private static reverseGeocoder: CenterReverseGeocoder | null = null;
  private static locationSearchIndexes = new Map<string, LocationSearchIndex>();

  private static loadDataVersion(): string {
    if (this.dataVersion) return this.dataVersion;
    const paths = [
      join(runtimeDirectory, 'data', 'production-manifest.json'),
      join(runtimeDirectory, '..', 'data', 'production-manifest.json'),
      join(process.cwd(), 'data', 'production-manifest.json'),
      join(
        process.cwd(),
        'node_modules',
        '@tansuasici/country-state-city',
        'data',
        'production-manifest.json'
      ),
    ];
    for (const candidate of paths) {
      try {
        this.dataVersion = JSON.parse(readFileSync(candidate, 'utf-8')).dataVersion;
        break;
      } catch {
        // Try the next runtime/package location.
      }
    }
    this.dataVersion ||= 'unavailable';
    return this.dataVersion;
  }

  private static getReverseGeocoder(): CenterReverseGeocoder {
    if (!this.reverseGeocoder) {
      this.reverseGeocoder = new CenterReverseGeocoder(
        {
          country: () => this.loadCountries(),
          state: () => this.loadStates(),
          city: () => this.loadCities(),
          district: () => this.loadDistricts(),
        },
        this.loadDataVersion()
      );
    }
    return this.reverseGeocoder;
  }

  private static getLocationSearchIndex(options: LocationSearchOptions): LocationSearchIndex {
    const countryCode = options.countryCode?.toUpperCase();
    const types = new Set(options.entityTypes || ['country', 'state', 'city', 'district']);
    const key = [
      countryCode || '*',
      options.stateId || options.stateCode?.toUpperCase() || '*',
      [...types].sort().join(','),
    ].join(':');
    let index = this.locationSearchIndexes.get(key);
    if (!index) {
      const stateFilter = (state: State) =>
        (!countryCode || state.countryCode.toUpperCase() === countryCode) &&
        (!options.stateId || state.id === options.stateId) &&
        (!options.stateCode || state.stateCode.toUpperCase() === options.stateCode.toUpperCase());
      const cityFilter = (city: City | District) =>
        (!countryCode || city.countryCode.toUpperCase() === countryCode) &&
        (!options.stateId || city.stateId === options.stateId) &&
        (!options.stateCode || city.stateCode.toUpperCase() === options.stateCode.toUpperCase());
      index = new LocationSearchIndex(
        createLocationSearchEntities({
          countries: types.has('country')
            ? this.loadCountries().filter(
                (country) => !countryCode || country.iso2.toUpperCase() === countryCode
              )
            : [],
          states: types.has('state') ? this.loadStates().filter(stateFilter) : [],
          cities: types.has('city') ? this.loadCities().filter(cityFilter) : [],
          districts: types.has('district') ? this.loadDistricts().filter(cityFilter) : [],
        }),
        searchAliasPolicyData as LocationAliasPolicy
      );
      this.locationSearchIndexes.set(key, index);
    }
    return index;
  }

  // Lazy loading to prevent memory issues during build
  private static loadCountries(): Country[] {
    if (!this.countries) {
      try {
        // Try different paths to find the data
        const paths = [
          join(runtimeDirectory, 'data', 'country.json'),
          join(runtimeDirectory, '..', 'data', 'country.json'),
          join(process.cwd(), 'data', 'country.json'),
          join(
            process.cwd(),
            'node_modules',
            '@tansuasici/country-state-city',
            'data',
            'country.json'
          ),
          join(
            process.cwd(),
            'node_modules',
            '@tansuasici/country-state-city',
            'dist',
            'data',
            'country.json'
          ),
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
          join(runtimeDirectory, 'data', 'state.json'),
          join(runtimeDirectory, '..', 'data', 'state.json'),
          join(process.cwd(), 'data', 'state.json'),
          join(
            process.cwd(),
            'node_modules',
            '@tansuasici/country-state-city',
            'data',
            'state.json'
          ),
          join(
            process.cwd(),
            'node_modules',
            '@tansuasici/country-state-city',
            'dist',
            'data',
            'state.json'
          ),
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
          join(runtimeDirectory, '..', '..', 'data', 'city-optimized.json'),
          join(runtimeDirectory, '..', 'data', 'city-optimized.json'),
          join(runtimeDirectory, 'data', 'city.json'),
          join(runtimeDirectory, '..', 'data', 'city.json'),
          join(process.cwd(), 'data', 'city-optimized.json'),
          join(process.cwd(), 'data', 'city.json'),
          join(
            process.cwd(),
            'node_modules',
            '@tansuasici/country-state-city',
            'data',
            'city-optimized.json'
          ),
          join(
            process.cwd(),
            'node_modules',
            '@tansuasici/country-state-city',
            'data',
            'city.json'
          ),
          join(
            process.cwd(),
            'node_modules',
            '@tansuasici/country-state-city',
            'dist',
            'data',
            'city.json'
          ),
        ];

        for (const path of paths) {
          try {
            const data = readFileSync(path, 'utf-8');
            const parsedData = JSON.parse(data);

            // Detect format: optimized (short keys) vs full (standard keys)
            if (parsedData.length > 0 && 'i' in parsedData[0]) {
              // Optimized format - convert back to full format
              this.cities = parsedData.map((city: any) => ({
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
                wikiDataId: city.w || '',
              })) as City[];
            } else {
              // Full format - use directly
              this.cities = parsedData;
            }

            // Fill in missing data from states and countries
            const states = this.loadStates();
            const countries = this.loadCountries();
            const statesById = new Map(states.map((state) => [state.id, state]));
            const countriesById = new Map(countries.map((country) => [country.id, country]));

            if (this.cities) {
              this.cities.forEach((city) => {
                const state = statesById.get(city.stateId);
                const country = countriesById.get(city.countryId);

                if (state) {
                  city.stateCode = state.stateCode || city.stateCode || '';
                  city.stateName = state.name || city.stateName || '';
                }

                if (!city.entityType) {
                  Object.assign(city, deriveCityEntityClassification(city, state));
                }

                if (country) {
                  city.countryCode = country.iso2 || city.countryCode || '';
                  city.countryName = country.name || city.countryName || '';
                }
              });
            }

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

  private static loadDistricts(): District[] {
    if (!this.districts) {
      const paths = [
        join(runtimeDirectory, 'data', 'admin', 'districts', 'tr.json'),
        join(runtimeDirectory, '..', 'data', 'admin', 'districts', 'tr.json'),
        join(process.cwd(), 'data', 'admin', 'districts', 'tr.json'),
        join(
          process.cwd(),
          'node_modules',
          '@tansuasici/country-state-city',
          'data',
          'admin',
          'districts',
          'tr.json'
        ),
      ];
      for (const candidate of paths) {
        try {
          const parsed = JSON.parse(readFileSync(candidate, 'utf-8'));
          this.districts = parsed.districts;
          break;
        } catch {
          // Try the next package/runtime location.
        }
      }
      if (!this.districts) this.districts = [];
    }
    return this.districts;
  }

  private static loadCoverageReport(): CoverageReport {
    if (!this.coverageReport) {
      const paths = [
        join(runtimeDirectory, 'data', 'coverage-report.json'),
        join(runtimeDirectory, '..', 'data', 'coverage-report.json'),
        join(process.cwd(), 'data', 'coverage-report.json'),
        join(
          process.cwd(),
          'node_modules',
          '@tansuasici/country-state-city',
          'data',
          'coverage-report.json'
        ),
      ];
      for (const candidate of paths) {
        try {
          this.coverageReport = JSON.parse(readFileSync(candidate, 'utf-8'));
          break;
        } catch {
          // Try the next package/runtime location.
        }
      }
    }
    if (!this.coverageReport) throw new Error('Failed to load coverage report');
    return this.coverageReport;
  }

  // ============ COUNTRY METHODS ============

  static getAllCountries(format?: DataFormat, options?: FormatOptions): Country[] | string {
    const countries = this.loadCountries();
    if (format) {
      return DataFormatter.format(
        countries,
        format,
        {
          rootName: 'countries',
          itemName: 'country',
        },
        options
      );
    }
    return countries;
  }

  static getCountryById(id: number): Country | undefined {
    return this.loadCountries().find((country) => country.id === id);
  }

  static getCountryByIso2(iso2: string): Country | undefined {
    return this.loadCountries().find(
      (country) => country.iso2.toLowerCase() === iso2.toLowerCase()
    );
  }

  static getCountryByIso3(iso3: string): Country | undefined {
    return this.loadCountries().find(
      (country) => country.iso3.toLowerCase() === iso3.toLowerCase()
    );
  }

  static searchCountries(query: string): Country[] {
    const searchTerm = query.trim().toLowerCase();
    if (!searchTerm) return [];
    return this.loadCountries().filter(
      (country) =>
        country.name.toLowerCase().includes(searchTerm) ||
        (country.native && country.native.toLowerCase().includes(searchTerm)) ||
        Object.values(country.translations ?? {}).some(
          (name) => typeof name === 'string' && name.toLowerCase().includes(searchTerm)
        )
    );
  }

  static getCountriesByRegion(region: string): Country[] {
    const term = region.trim().toLowerCase();
    if (!term) return [];
    return this.loadCountries().filter((country) => country.region.toLowerCase() === term);
  }

  static getCountriesBySubregion(subregion: string): Country[] {
    const term = subregion.trim().toLowerCase();
    if (!term) return [];
    return this.loadCountries().filter((country) => country.subregion.toLowerCase() === term);
  }

  static getCountryTranslation(
    countryCode: string,
    locale: CountryTranslationLocale | CountryTranslationAlias
  ): string | null | undefined {
    const country = this.getCountryByIso2(countryCode);
    return country ? resolveCountryTranslation(country, locale) : undefined;
  }

  // ============ STATE METHODS ============

  static getAllStates(format?: DataFormat, options?: FormatOptions): State[] | string {
    const states = this.loadStates();
    if (format) {
      return DataFormatter.format(
        states,
        format,
        {
          rootName: 'states',
          itemName: 'state',
        },
        options
      );
    }
    return states;
  }

  static getStateById(id: number): State | undefined {
    return this.loadStates().find((state) => state.id === id);
  }

  static getStatesByCountryId(
    countryId: number,
    format?: DataFormat,
    options?: FormatOptions
  ): State[] | string {
    const states = this.loadStates().filter((state) => state.countryId === countryId);
    if (format) {
      return DataFormatter.format(
        states,
        format,
        {
          rootName: 'states',
          itemName: 'state',
        },
        options
      );
    }
    return states;
  }

  static getStatesByCountryCode(
    countryCode: string,
    format?: DataFormat,
    options?: FormatOptions
  ): State[] | string {
    const states = this.loadStates().filter(
      (state) => state.countryCode.toLowerCase() === countryCode.toLowerCase()
    );
    if (format) {
      return DataFormatter.format(
        states,
        format,
        {
          rootName: 'states',
          itemName: 'state',
        },
        options
      );
    }
    return states;
  }

  static searchStates(query: string, countryId?: number): State[] {
    const searchTerm = query.trim().toLowerCase();
    if (!searchTerm) return [];
    let results = this.loadStates().filter((state) =>
      state.name.toLowerCase().includes(searchTerm)
    );

    if (countryId) {
      results = results.filter((state) => state.countryId === countryId);
    }

    return results;
  }

  // ============ CITY METHODS ============

  static getAllCities(format?: DataFormat, options?: FormatOptions): City[] | string {
    const cities = this.loadCities();
    if (format) {
      return DataFormatter.format(
        cities,
        format,
        {
          rootName: 'cities',
          itemName: 'city',
        },
        options
      );
    }
    return cities;
  }

  static getCityById(id: number): City | undefined {
    return this.loadCities().find((city) => city.id === id);
  }

  static getCitiesByStateId(
    stateId: number,
    format?: DataFormat,
    options?: FormatOptions
  ): City[] | string {
    const cities = this.loadCities().filter((city) => city.stateId === stateId);
    if (format) {
      return DataFormatter.format(
        cities,
        format,
        {
          rootName: 'cities',
          itemName: 'city',
        },
        options
      );
    }
    return cities;
  }

  static getCitiesByCountryId(
    countryId: number,
    format?: DataFormat,
    options?: FormatOptions
  ): City[] | string {
    const cities = this.loadCities().filter((city) => city.countryId === countryId);
    if (format) {
      return DataFormatter.format(
        cities,
        format,
        {
          rootName: 'cities',
          itemName: 'city',
        },
        options
      );
    }
    return cities;
  }

  static searchCities(query: string, stateId?: number, countryId?: number): City[] {
    const searchTerm = query.trim().toLowerCase();
    if (!searchTerm) return [];
    let results = this.loadCities().filter((city) => city.name.toLowerCase().includes(searchTerm));

    if (stateId) {
      results = results.filter((city) => city.stateId === stateId);
    }

    if (countryId) {
      results = results.filter((city) => city.countryId === countryId);
    }

    return results;
  }

  // ============ CANONICAL ENTITY METHODS ============

  /**
   * Returns comparable administrative areas. Defaults to current level-1 rows.
   * Legacy state methods intentionally retain the source collection unchanged.
   */
  static getAdministrativeAreas(query: AdministrativeAreaQuery = {}): Array<State | City> {
    const level = query.level ?? 1;
    const lifecycleStatus = query.lifecycleStatus ?? 'current';
    const sourceLayer = query.sourceLayer ?? 'state';
    const countryCode = query.countryCode?.trim().toUpperCase();
    const rows =
      sourceLayer === 'state'
        ? this.loadStates()
        : sourceLayer === 'city'
          ? this.loadCities()
          : [...this.loadStates(), ...this.loadCities()];
    return rows.filter(
      (row) =>
        row.entityType === 'administrative-area' &&
        row.administrativeLevel === level &&
        (!countryCode || row.countryCode === countryCode) &&
        (lifecycleStatus === 'all' || row.lifecycleStatus === lifecycleStatus)
    );
  }

  /** Returns canonical settlement rows; administrative-area-like source cities are excluded. */
  static getSettlements(query: SettlementQuery = {}): City[] {
    const lifecycleStatus = query.lifecycleStatus ?? 'current';
    const countryCode = query.countryCode?.trim().toUpperCase();
    return this.loadCities().filter(
      (city) =>
        city.entityType === 'settlement' &&
        (!countryCode || city.countryCode === countryCode) &&
        (!query.stateId || city.stateId === query.stateId) &&
        (lifecycleStatus === 'all' || city.lifecycleStatus === lifecycleStatus)
    );
  }

  // ============ DISTRICT METHODS ============

  static getAllDistricts(format?: DataFormat, options?: FormatOptions): District[] | string {
    const districts = this.loadDistricts();
    if (format) {
      return DataFormatter.format(
        districts,
        format,
        { rootName: 'districts', itemName: 'district' },
        options
      );
    }
    return districts;
  }

  static getDistrictById(id: number): District | undefined {
    return this.loadDistricts().find((district) => district.id === id);
  }

  static getDistrictByPublicId(publicId: string): District | undefined {
    return this.loadDistricts().find((district) => district.publicId === publicId);
  }

  static getDistrictsByStateId(
    stateId: number,
    format?: DataFormat,
    options?: FormatOptions
  ): District[] | string {
    const districts = this.loadDistricts().filter((district) => district.stateId === stateId);
    if (format) {
      return DataFormatter.format(
        districts,
        format,
        { rootName: 'districts', itemName: 'district' },
        options
      );
    }
    return districts;
  }

  static getDistrictsByCountryCode(countryCode: string): District[] {
    return this.loadDistricts().filter(
      (district) => district.countryCode.toLowerCase() === countryCode.trim().toLowerCase()
    );
  }

  static searchDistricts(query: string, stateId?: number): District[] {
    const searchTerm = query.trim().toLocaleLowerCase('tr-TR');
    if (!searchTerm) return [];
    return this.loadDistricts().filter(
      (district) =>
        (!stateId || district.stateId === stateId) &&
        [district.name, ...district.aliases].some((name) =>
          name.toLocaleLowerCase('tr-TR').includes(searchTerm)
        )
    );
  }

  // ============ UTILITY METHODS ============

  static getStats() {
    return {
      countries: this.loadCountries().length,
      states: this.loadStates().length,
      cities: this.loadCities().length,
      districts: this.loadDistricts().length,
    };
  }

  static getCoverageReport(): CoverageReport {
    return this.loadCoverageReport();
  }

  static getCountryCoverage(countryCode: string): CountryCoverage | undefined {
    const normalizedCode = countryCode.trim().toUpperCase();
    if (!normalizedCode) return undefined;
    return this.loadCoverageReport().countryCoverage.find(
      (entry) => entry.countryCode === normalizedCode
    );
  }

  static getAllRegions(): string[] {
    const regions = new Set(this.loadCountries().map((country) => country.region));
    return Array.from(regions).filter(Boolean).sort();
  }

  static getAllSubregions(): string[] {
    const subregions = new Set(this.loadCountries().map((country) => country.subregion));
    return Array.from(subregions).filter(Boolean).sort();
  }

  static getAllTimezones(): string[] {
    const timezones = new Set<string>();
    this.loadCountries().forEach((country) => {
      country.timezones.forEach((tz) => {
        timezones.add(tz.zoneName);
      });
    });
    return Array.from(timezones).sort();
  }

  static getTimezoneOffset(zoneName: string, at: Date | string | number = new Date()) {
    return observeTimezoneOffset(zoneName, at);
  }

  static nearestCenters(
    point: CoordinatePoint,
    options: NearestCenterOptions = {}
  ): NearestCenterResult {
    return this.getReverseGeocoder().nearest(point, options);
  }

  static nearestCentersBatch(
    points: readonly CoordinatePoint[],
    options: NearestCenterOptions = {}
  ): NearestCenterResult[] {
    return this.getReverseGeocoder().nearestBatch(points, options);
  }

  static searchLocations(
    query: string,
    options: LocationSearchOptions = {}
  ): LocationSearchMatch[] {
    return this.getLocationSearchIndex(options).search(query, options);
  }

  static getAllCurrencies(): Array<{ code: string; name: string; symbol: string }> {
    const currenciesMap = new Map<string, { name: string; symbol: string }>();

    this.loadCountries().forEach((country) => {
      if (country.currency && !currenciesMap.has(country.currency)) {
        currenciesMap.set(country.currency, {
          name: country.currencyName,
          symbol: country.currencySymbol,
        });
      }
    });

    return Array.from(currenciesMap.entries())
      .map(([code, data]) => ({
        code,
        name: data.name,
        symbol: data.symbol,
      }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  static exportData(
    dataType: 'countries' | 'states' | 'cities' | 'districts',
    format: DataFormat,
    options: FormatOptions = {}
  ): string {
    switch (dataType) {
      case 'countries':
        return DataFormatter.format(
          this.loadCountries(),
          format,
          {
            rootName: 'countries',
            itemName: 'country',
          },
          options
        );
      case 'states':
        return DataFormatter.format(
          this.loadStates(),
          format,
          {
            rootName: 'states',
            itemName: 'state',
          },
          options
        );
      case 'cities':
        return DataFormatter.format(
          this.loadCities(),
          format,
          {
            rootName: 'cities',
            itemName: 'city',
          },
          options
        );
      case 'districts':
        return DataFormatter.format(
          this.loadDistricts(),
          format,
          { rootName: 'districts', itemName: 'district' },
          options
        );
      default:
        throw new Error(`Invalid data type: ${dataType}`);
    }
  }
}

export default CountryStateCity;
