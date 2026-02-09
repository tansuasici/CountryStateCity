import { describe, it, expect } from 'vitest';
import { CountryStateCity } from '../../../countrystatecity-npm/src/index';

describe('MCP Tools - Country Operations', () => {
  describe('search_countries', () => {
    it('returns results for a valid query', () => {
      const results = CountryStateCity.searchCountries('turkey');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toContain('Turkey');
    });

    it('returns results for partial name match', () => {
      const results = CountryStateCity.searchCountries('united');
      expect(results.length).toBeGreaterThanOrEqual(3); // United States, United Kingdom, UAE, etc.
    });

    it('returns empty array for empty query', () => {
      const results = CountryStateCity.searchCountries('');
      expect(results).toEqual([]);
    });

    it('returns empty array for whitespace-only query', () => {
      const results = CountryStateCity.searchCountries('   ');
      expect(results).toEqual([]);
    });

    it('returns empty array for nonsense query', () => {
      const results = CountryStateCity.searchCountries('xyzxyzxyz123');
      expect(results).toEqual([]);
    });

    it('is case-insensitive', () => {
      const upper = CountryStateCity.searchCountries('GERMANY');
      const lower = CountryStateCity.searchCountries('germany');
      expect(upper.length).toBe(lower.length);
      expect(upper[0].iso2).toBe(lower[0].iso2);
    });
  });

  describe('get_country', () => {
    it('retrieves a country by numeric id', () => {
      const country = CountryStateCity.getCountryById(225);
      expect(country).toBeDefined();
      expect(country!.iso2).toBe('TR');
    });

    it('retrieves a country by iso2 code', () => {
      const country = CountryStateCity.getCountryByIso2('TR');
      expect(country).toBeDefined();
      expect(country!.name).toBe('Turkey');
      expect(country!.iso3).toBe('TUR');
    });

    it('retrieves a country by iso3 code', () => {
      const country = CountryStateCity.getCountryByIso3('USA');
      expect(country).toBeDefined();
      expect(country!.iso2).toBe('US');
    });

    it('iso2 lookup is case-insensitive', () => {
      const upper = CountryStateCity.getCountryByIso2('US');
      const lower = CountryStateCity.getCountryByIso2('us');
      expect(upper).toEqual(lower);
    });

    it('iso3 lookup is case-insensitive', () => {
      const upper = CountryStateCity.getCountryByIso3('GBR');
      const lower = CountryStateCity.getCountryByIso3('gbr');
      expect(upper).toEqual(lower);
    });

    it('returns undefined for invalid id', () => {
      expect(CountryStateCity.getCountryById(999999)).toBeUndefined();
    });

    it('returns undefined for invalid iso2', () => {
      expect(CountryStateCity.getCountryByIso2('ZZ')).toBeUndefined();
    });

    it('returns undefined for invalid iso3', () => {
      expect(CountryStateCity.getCountryByIso3('ZZZ')).toBeUndefined();
    });

    it('returns undefined for empty iso2', () => {
      expect(CountryStateCity.getCountryByIso2('')).toBeUndefined();
    });

    it('country has expected fields', () => {
      const country = CountryStateCity.getCountryByIso2('DE');
      expect(country).toBeDefined();
      expect(country).toHaveProperty('id');
      expect(country).toHaveProperty('name');
      expect(country).toHaveProperty('iso2');
      expect(country).toHaveProperty('iso3');
      expect(country).toHaveProperty('phoneCode');
      expect(country).toHaveProperty('capital');
      expect(country).toHaveProperty('currency');
      expect(country).toHaveProperty('currencyName');
      expect(country).toHaveProperty('currencySymbol');
      expect(country).toHaveProperty('region');
      expect(country).toHaveProperty('subregion');
      expect(country).toHaveProperty('timezones');
      expect(country).toHaveProperty('latitude');
      expect(country).toHaveProperty('longitude');
      expect(country).toHaveProperty('emoji');
    });
  });

  describe('get_countries_by_region', () => {
    it('returns European countries', () => {
      const results = CountryStateCity.getCountriesByRegion('Europe');
      expect(results.length).toBeGreaterThan(30);
      results.forEach((c) => {
        expect(c.region).toBe('Europe');
      });
    });

    it('returns Asian countries', () => {
      const results = CountryStateCity.getCountriesByRegion('Asia');
      expect(results.length).toBeGreaterThan(30);
      results.forEach((c) => {
        expect(c.region).toBe('Asia');
      });
    });

    it('is case-insensitive', () => {
      const lower = CountryStateCity.getCountriesByRegion('europe');
      const upper = CountryStateCity.getCountriesByRegion('EUROPE');
      expect(lower.length).toBe(upper.length);
    });

    it('returns empty array for invalid region', () => {
      const results = CountryStateCity.getCountriesByRegion('Atlantis');
      expect(results).toEqual([]);
    });

    it('returns empty array for empty string', () => {
      const results = CountryStateCity.getCountriesByRegion('');
      expect(results).toEqual([]);
    });
  });
});

describe('MCP Tools - State Operations', () => {
  describe('get_states', () => {
    it('returns states by countryId', () => {
      const turkey = CountryStateCity.getCountryByIso2('TR')!;
      const states = CountryStateCity.getStatesByCountryId(turkey.id) as any[];
      expect(states.length).toBeGreaterThan(70); // Turkey has 81 provinces
    });

    it('returns states by countryCode', () => {
      const states = CountryStateCity.getStatesByCountryCode('US') as any[];
      expect(states.length).toBeGreaterThan(40);
    });

    it('returns empty array for non-existent countryId', () => {
      const states = CountryStateCity.getStatesByCountryId(999999) as any[];
      expect(states).toEqual([]);
    });

    it('returns empty array for non-existent countryCode', () => {
      const states = CountryStateCity.getStatesByCountryCode('ZZ') as any[];
      expect(states).toEqual([]);
    });

    it('state has expected fields', () => {
      const states = CountryStateCity.getStatesByCountryCode('DE') as any[];
      expect(states.length).toBeGreaterThan(0);
      const state = states[0];
      expect(state).toHaveProperty('id');
      expect(state).toHaveProperty('name');
      expect(state).toHaveProperty('countryId');
      expect(state).toHaveProperty('countryCode');
      expect(state).toHaveProperty('stateCode');
    });
  });

  describe('search_states', () => {
    it('returns results for a valid query', () => {
      const results = CountryStateCity.searchStates('california');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name.toLowerCase()).toContain('california');
    });

    it('filters by countryId', () => {
      const us = CountryStateCity.getCountryByIso2('US')!;
      const results = CountryStateCity.searchStates('new', us.id);
      expect(results.length).toBeGreaterThan(0);
      results.forEach((s) => {
        expect(s.countryId).toBe(us.id);
      });
    });

    it('returns empty array for empty query', () => {
      expect(CountryStateCity.searchStates('')).toEqual([]);
    });

    it('returns empty array for nonsense query', () => {
      expect(CountryStateCity.searchStates('xyzxyz999')).toEqual([]);
    });
  });
});

describe('MCP Tools - City Operations', () => {
  describe('get_cities', () => {
    it('returns cities by stateId', () => {
      const states = CountryStateCity.getStatesByCountryCode('US') as any[];
      const firstState = states[0];
      const cities = CountryStateCity.getCitiesByStateId(firstState.id) as any[];
      expect(cities.length).toBeGreaterThan(0);
    });

    it('returns cities by countryId', () => {
      const turkey = CountryStateCity.getCountryByIso2('TR')!;
      const cities = CountryStateCity.getCitiesByCountryId(turkey.id) as any[];
      expect(cities.length).toBeGreaterThan(100);
    });

    it('respects limit via slice', () => {
      const turkey = CountryStateCity.getCountryByIso2('TR')!;
      const allCities = CountryStateCity.getCitiesByCountryId(turkey.id) as any[];
      const limited = allCities.slice(0, 10);
      expect(limited.length).toBe(10);
      expect(limited.length).toBeLessThanOrEqual(allCities.length);
    });

    it('returns empty array for non-existent stateId', () => {
      const cities = CountryStateCity.getCitiesByStateId(999999) as any[];
      expect(cities).toEqual([]);
    });

    it('city has expected fields', () => {
      const states = CountryStateCity.getStatesByCountryCode('DE') as any[];
      const cities = CountryStateCity.getCitiesByStateId(states[0].id) as any[];
      expect(cities.length).toBeGreaterThan(0);
      const city = cities[0];
      expect(city).toHaveProperty('id');
      expect(city).toHaveProperty('name');
      expect(city).toHaveProperty('stateId');
      expect(city).toHaveProperty('countryId');
      expect(city).toHaveProperty('latitude');
      expect(city).toHaveProperty('longitude');
    });
  });

  describe('search_cities', () => {
    it('returns results for a valid query', () => {
      const results = CountryStateCity.searchCities('istanbul');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name.toLowerCase()).toContain('istanbul');
    });

    it('filters by stateId', () => {
      const states = CountryStateCity.getStatesByCountryCode('US') as any[];
      const california = states.find((s: any) => s.name === 'California');
      expect(california).toBeDefined();
      const results = CountryStateCity.searchCities('los', california!.id);
      expect(results.length).toBeGreaterThan(0);
      results.forEach((c) => {
        expect(c.stateId).toBe(california!.id);
      });
    });

    it('filters by countryId', () => {
      const turkey = CountryStateCity.getCountryByIso2('TR')!;
      const results = CountryStateCity.searchCities('ankara', undefined, turkey.id);
      expect(results.length).toBeGreaterThan(0);
      results.forEach((c) => {
        expect(c.countryId).toBe(turkey.id);
      });
    });

    it('respects limit via slice', () => {
      const results = CountryStateCity.searchCities('san');
      const limited = results.slice(0, 5);
      expect(limited.length).toBeLessThanOrEqual(5);
    });

    it('returns empty array for empty query', () => {
      expect(CountryStateCity.searchCities('')).toEqual([]);
    });
  });
});

describe('MCP Tools - Utility Operations', () => {
  describe('get_stats', () => {
    it('returns statistics with expected shape', () => {
      const stats = CountryStateCity.getStats();
      expect(stats).toHaveProperty('countries');
      expect(stats).toHaveProperty('states');
      expect(stats).toHaveProperty('cities');
    });

    it('counts are reasonable numbers', () => {
      const stats = CountryStateCity.getStats();
      expect(stats.countries).toBeGreaterThan(200);
      expect(stats.states).toBeGreaterThan(4000);
      expect(stats.cities).toBeGreaterThan(100000);
    });
  });

  describe('get_regions', () => {
    it('returns a non-empty array of region strings', () => {
      const regions = CountryStateCity.getAllRegions();
      expect(regions.length).toBeGreaterThan(0);
      expect(regions).toContain('Europe');
      expect(regions).toContain('Asia');
      expect(regions).toContain('Africa');
      expect(regions).toContain('Americas');
      expect(regions).toContain('Oceania');
    });

    it('regions are sorted', () => {
      const regions = CountryStateCity.getAllRegions();
      const sorted = [...regions].sort();
      expect(regions).toEqual(sorted);
    });
  });

  describe('get_timezones', () => {
    it('returns a non-empty array of timezone strings', () => {
      const timezones = CountryStateCity.getAllTimezones();
      expect(timezones.length).toBeGreaterThan(100);
    });

    it('contains well-known timezones', () => {
      const timezones = CountryStateCity.getAllTimezones();
      expect(timezones).toContain('Europe/London');
      expect(timezones).toContain('America/New_York');
      expect(timezones).toContain('Asia/Tokyo');
    });

    it('timezones are sorted', () => {
      const timezones = CountryStateCity.getAllTimezones();
      const sorted = [...timezones].sort();
      expect(timezones).toEqual(sorted);
    });
  });

  describe('get_currencies', () => {
    it('returns a non-empty array of currency objects', () => {
      const currencies = CountryStateCity.getAllCurrencies();
      expect(currencies.length).toBeGreaterThan(50);
    });

    it('each currency has code, name, and symbol', () => {
      const currencies = CountryStateCity.getAllCurrencies();
      currencies.forEach((c) => {
        expect(c).toHaveProperty('code');
        expect(c).toHaveProperty('name');
        expect(c).toHaveProperty('symbol');
      });
    });

    it('contains well-known currencies', () => {
      const currencies = CountryStateCity.getAllCurrencies();
      const codes = currencies.map((c) => c.code);
      expect(codes).toContain('USD');
      expect(codes).toContain('EUR');
      expect(codes).toContain('GBP');
      expect(codes).toContain('TRY');
    });

    it('currencies are sorted by code', () => {
      const currencies = CountryStateCity.getAllCurrencies();
      const codes = currencies.map((c) => c.code);
      const sorted = [...codes].sort();
      expect(codes).toEqual(sorted);
    });
  });
});
