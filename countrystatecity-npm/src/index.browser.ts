// Browser-safe version without fs/path dependencies
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

// Import JSON data directly for browser compatibility
import countriesData from '../../data/country.json' with { type: 'json' };
import statesData from '../../data/state.json' with { type: 'json' };
// Use the compressed dataset (~12 MB vs ~42 MB). loadCities() below
// decompresses the i/n/s/c keys back to full City objects at runtime.
import citiesData from '../../data/city-optimized.json' with { type: 'json' };
import turkeyDistrictData from '../../data/admin/districts/tr.json' with { type: 'json' };
import coverageReportData from '../../data/coverage-report.json' with { type: 'json' };
import productionManifestData from '../../data/production-manifest.json' with { type: 'json' };
import searchAliasPolicyData from '../../data/search/alias-policy.json' with { type: 'json' };

export * from './types';
export * from './location-names';
export * from './public-id';
export * from './translations';
export * from './timezones';
export * from './reverse-geocoding';
export * from './search';
export { DataFormatter } from './formatters';

export class CountryStateCity {
  private static countries: Country[] = countriesData as Country[];
  private static states: State[] = statesData as State[];
  private static cities: City[] | null = null;
  private static districts: District[] = turkeyDistrictData.districts as District[];
  private static coverageReport: CoverageReport = coverageReportData as unknown as CoverageReport;
  private static reverseGeocoder: CenterReverseGeocoder | null = null;
  private static locationSearchIndexes = new Map<string, LocationSearchIndex>();

  private static getReverseGeocoder(): CenterReverseGeocoder {
    if (!this.reverseGeocoder) {
      this.reverseGeocoder = new CenterReverseGeocoder(
        {
          country: this.countries,
          state: this.states,
          city: () => this.loadCities(),
          district: this.districts,
        },
        productionManifestData.dataVersion
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
            ? this.countries.filter(
                (country) => !countryCode || country.iso2.toUpperCase() === countryCode
              )
            : [],
          states: types.has('state') ? this.states.filter(stateFilter) : [],
          cities: types.has('city') ? this.loadCities().filter(cityFilter) : [],
          districts: types.has('district') ? this.districts.filter(cityFilter) : [],
        }),
        searchAliasPolicyData as LocationAliasPolicy
      );
      this.locationSearchIndexes.set(key, index);
    }
    return index;
  }

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
          wikiDataId: city.w || '',
        })) as City[];
      } else {
        // Data is already in full format
        this.cities = citiesData as unknown as City[];
      }

      // Fill in missing data from states and countries if needed
      if (this.cities && isOptimized) {
        const statesById = new Map(this.states.map((state) => [state.id, state]));
        const countriesById = new Map(this.countries.map((country) => [country.id, country]));
        this.cities.forEach((city) => {
          const state = statesById.get(city.stateId);
          const country = countriesById.get(city.countryId);

          if (state) {
            city.stateCode = state.stateCode;
            city.stateName = state.name;
          }

          Object.assign(city, deriveCityEntityClassification(city, state));

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
      return DataFormatter.format(
        this.countries,
        format,
        {
          rootName: 'countries',
          itemName: 'country',
        },
        options
      );
    }
    return this.countries;
  }

  static getCountryById(id: number): Country | undefined {
    return this.countries.find((country) => country.id === id);
  }

  static getCountryByIso2(iso2: string): Country | undefined {
    return this.countries.find((country) => country.iso2.toLowerCase() === iso2.toLowerCase());
  }

  static getCountryByIso3(iso3: string): Country | undefined {
    return this.countries.find((country) => country.iso3.toLowerCase() === iso3.toLowerCase());
  }

  static searchCountries(query: string): Country[] {
    const searchTerm = query.toLowerCase();
    return this.countries.filter(
      (country) =>
        country.name.toLowerCase().includes(searchTerm) ||
        (country.native && country.native.toLowerCase().includes(searchTerm)) ||
        Object.values(country.translations ?? {}).some(
          (name) => typeof name === 'string' && name.toLowerCase().includes(searchTerm)
        )
    );
  }

  static getCountriesByRegion(region: string): Country[] {
    return this.countries.filter(
      (country) => country.region.toLowerCase() === region.toLowerCase()
    );
  }

  static getCountriesBySubregion(subregion: string): Country[] {
    return this.countries.filter(
      (country) => country.subregion.toLowerCase() === subregion.toLowerCase()
    );
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
    if (format) {
      return DataFormatter.format(
        this.states,
        format,
        {
          rootName: 'states',
          itemName: 'state',
        },
        options
      );
    }
    return this.states;
  }

  static getStateById(id: number): State | undefined {
    return this.states.find((state) => state.id === id);
  }

  static getStatesByCountryId(
    countryId: number,
    format?: DataFormat,
    options?: FormatOptions
  ): State[] | string {
    const states = this.states.filter((state) => state.countryId === countryId);
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
    const states = this.states.filter(
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
    const searchTerm = query.toLowerCase();
    let results = this.states.filter((state) => state.name.toLowerCase().includes(searchTerm));

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
    const searchTerm = query.toLowerCase();
    let results = this.loadCities().filter((city) => city.name.toLowerCase().includes(searchTerm));

    if (stateId) {
      results = results.filter((city) => city.stateId === stateId);
    }

    if (countryId) {
      results = results.filter((city) => city.countryId === countryId);
    }

    return results;
  }

  static getAdministrativeAreas(query: AdministrativeAreaQuery = {}): Array<State | City> {
    const level = query.level ?? 1;
    const lifecycleStatus = query.lifecycleStatus ?? 'current';
    const sourceLayer = query.sourceLayer ?? 'state';
    const countryCode = query.countryCode?.trim().toUpperCase();
    const rows =
      sourceLayer === 'state'
        ? this.states
        : sourceLayer === 'city'
          ? this.loadCities()
          : [...this.states, ...this.loadCities()];
    return rows.filter(
      (row) =>
        row.entityType === 'administrative-area' &&
        row.administrativeLevel === level &&
        (!countryCode || row.countryCode === countryCode) &&
        (lifecycleStatus === 'all' || row.lifecycleStatus === lifecycleStatus)
    );
  }

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
    if (format) {
      return DataFormatter.format(
        this.districts,
        format,
        { rootName: 'districts', itemName: 'district' },
        options
      );
    }
    return this.districts;
  }

  static getDistrictById(id: number): District | undefined {
    return this.districts.find((district) => district.id === id);
  }

  static getDistrictByPublicId(publicId: string): District | undefined {
    return this.districts.find((district) => district.publicId === publicId);
  }

  static getDistrictsByStateId(
    stateId: number,
    format?: DataFormat,
    options?: FormatOptions
  ): District[] | string {
    const districts = this.districts.filter((district) => district.stateId === stateId);
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
    return this.districts.filter(
      (district) => district.countryCode.toLowerCase() === countryCode.trim().toLowerCase()
    );
  }

  static searchDistricts(query: string, stateId?: number): District[] {
    const searchTerm = query.trim().toLocaleLowerCase('tr-TR');
    if (!searchTerm) return [];
    return this.districts.filter(
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
      countries: this.countries.length,
      states: this.states.length,
      cities: this.loadCities().length,
      districts: this.districts.length,
    };
  }

  static getCoverageReport(): CoverageReport {
    return this.coverageReport;
  }

  static getCountryCoverage(countryCode: string): CountryCoverage | undefined {
    const normalizedCode = countryCode.trim().toUpperCase();
    if (!normalizedCode) return undefined;
    return this.coverageReport.countryCoverage.find(
      (entry) => entry.countryCode === normalizedCode
    );
  }

  static getAllRegions(): string[] {
    const regions = new Set(this.countries.map((country) => country.region));
    return Array.from(regions).filter(Boolean).sort();
  }

  static getAllSubregions(): string[] {
    const subregions = new Set(this.countries.map((country) => country.subregion));
    return Array.from(subregions).filter(Boolean).sort();
  }

  static getAllTimezones(): string[] {
    const timezones = new Set<string>();
    this.countries.forEach((country) => {
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

    this.countries.forEach((country) => {
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
          this.countries,
          format,
          {
            rootName: 'countries',
            itemName: 'country',
          },
          options
        );
      case 'states':
        return DataFormatter.format(
          this.states,
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
          this.districts,
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
