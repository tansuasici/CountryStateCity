import { describe, it, expect } from 'vitest';
import { CountryStateCity } from '../index';

describe('Utility Methods', () => {
  // ----------------------------------------------------------------
  // getStats
  // ----------------------------------------------------------------
  describe('getStats', () => {
    it('should return an object with countries, states, and cities counts', () => {
      const stats = CountryStateCity.getStats();
      expect(stats).toHaveProperty('countries');
      expect(stats).toHaveProperty('states');
      expect(stats).toHaveProperty('cities');
    });

    it('should have more than 200 countries', () => {
      const stats = CountryStateCity.getStats();
      expect(stats.countries).toBeGreaterThan(200);
    });

    it('should have more than 4000 states', () => {
      const stats = CountryStateCity.getStats();
      expect(stats.states).toBeGreaterThan(4000);
    });

    it('should have more than 100000 cities', () => {
      const stats = CountryStateCity.getStats();
      expect(stats.cities).toBeGreaterThan(100000);
    });

    it('counts should be consistent with getAllX methods', () => {
      const stats = CountryStateCity.getStats();
      const countries = CountryStateCity.getAllCountries() as any[];
      const states = CountryStateCity.getAllStates() as any[];
      const cities = CountryStateCity.getAllCities() as any[];
      expect(stats.countries).toBe(countries.length);
      expect(stats.states).toBe(states.length);
      expect(stats.cities).toBe(cities.length);
    });
  });

  // ----------------------------------------------------------------
  // getAllRegions
  // ----------------------------------------------------------------
  describe('getAllRegions', () => {
    it('should return a sorted array of strings', () => {
      const regions = CountryStateCity.getAllRegions();
      expect(Array.isArray(regions)).toBe(true);
      expect(regions.length).toBeGreaterThan(0);
      for (const region of regions) {
        expect(typeof region).toBe('string');
      }
    });

    it('should be sorted alphabetically', () => {
      const regions = CountryStateCity.getAllRegions();
      const sorted = [...regions].sort();
      expect(regions).toEqual(sorted);
    });

    it('should contain known regions', () => {
      const regions = CountryStateCity.getAllRegions();
      expect(regions).toContain('Africa');
      expect(regions).toContain('Americas');
      expect(regions).toContain('Asia');
      expect(regions).toContain('Europe');
      expect(regions).toContain('Oceania');
    });

    it('should not contain empty strings', () => {
      const regions = CountryStateCity.getAllRegions();
      for (const region of regions) {
        expect(region.trim().length).toBeGreaterThan(0);
      }
    });

    it('should have no duplicates', () => {
      const regions = CountryStateCity.getAllRegions();
      const unique = new Set(regions);
      expect(regions.length).toBe(unique.size);
    });
  });

  // ----------------------------------------------------------------
  // getAllSubregions
  // ----------------------------------------------------------------
  describe('getAllSubregions', () => {
    it('should return a sorted array of strings', () => {
      const subregions = CountryStateCity.getAllSubregions();
      expect(Array.isArray(subregions)).toBe(true);
      expect(subregions.length).toBeGreaterThan(0);
      for (const subregion of subregions) {
        expect(typeof subregion).toBe('string');
      }
    });

    it('should be sorted alphabetically', () => {
      const subregions = CountryStateCity.getAllSubregions();
      const sorted = [...subregions].sort();
      expect(subregions).toEqual(sorted);
    });

    it('should contain known subregions', () => {
      const subregions = CountryStateCity.getAllSubregions();
      expect(subregions).toContain('Western Europe');
      expect(subregions).toContain('Southern Asia');
      expect(subregions).toContain('Northern America');
    });

    it('should not contain empty strings', () => {
      const subregions = CountryStateCity.getAllSubregions();
      for (const sub of subregions) {
        expect(sub.trim().length).toBeGreaterThan(0);
      }
    });

    it('should have no duplicates', () => {
      const subregions = CountryStateCity.getAllSubregions();
      const unique = new Set(subregions);
      expect(subregions.length).toBe(unique.size);
    });
  });

  // ----------------------------------------------------------------
  // getAllTimezones
  // ----------------------------------------------------------------
  describe('getAllTimezones', () => {
    it('should return a sorted array of strings', () => {
      const timezones = CountryStateCity.getAllTimezones();
      expect(Array.isArray(timezones)).toBe(true);
      expect(timezones.length).toBeGreaterThan(0);
      for (const tz of timezones) {
        expect(typeof tz).toBe('string');
      }
    });

    it('should be sorted alphabetically', () => {
      const timezones = CountryStateCity.getAllTimezones();
      const sorted = [...timezones].sort();
      expect(timezones).toEqual(sorted);
    });

    it('should contain well-known timezone names', () => {
      const timezones = CountryStateCity.getAllTimezones();
      // These are IANA timezone names
      expect(timezones).toContain('America/New_York');
      expect(timezones).toContain('Europe/London');
      expect(timezones).toContain('Asia/Tokyo');
    });

    it('should have no duplicates', () => {
      const timezones = CountryStateCity.getAllTimezones();
      const unique = new Set(timezones);
      expect(timezones.length).toBe(unique.size);
    });

    it('should have more than 200 timezones', () => {
      const timezones = CountryStateCity.getAllTimezones();
      expect(timezones.length).toBeGreaterThan(200);
    });
  });

  // ----------------------------------------------------------------
  // getAllCurrencies
  // ----------------------------------------------------------------
  describe('getAllCurrencies', () => {
    it('should return an array of currency objects', () => {
      const currencies = CountryStateCity.getAllCurrencies();
      expect(Array.isArray(currencies)).toBe(true);
      expect(currencies.length).toBeGreaterThan(0);
    });

    it('each currency should have code, name, and symbol', () => {
      const currencies = CountryStateCity.getAllCurrencies();
      for (const currency of currencies) {
        expect(currency).toHaveProperty('code');
        expect(currency).toHaveProperty('name');
        expect(currency).toHaveProperty('symbol');
        expect(typeof currency.code).toBe('string');
        expect(typeof currency.name).toBe('string');
        expect(typeof currency.symbol).toBe('string');
      }
    });

    it('should be sorted alphabetically by code', () => {
      const currencies = CountryStateCity.getAllCurrencies();
      const codes = currencies.map((c) => c.code);
      const sorted = [...codes].sort();
      expect(codes).toEqual(sorted);
    });

    it('should contain well-known currencies', () => {
      const currencies = CountryStateCity.getAllCurrencies();
      const codes = currencies.map((c) => c.code);
      expect(codes).toContain('USD');
      expect(codes).toContain('EUR');
      expect(codes).toContain('GBP');
      expect(codes).toContain('TRY');
    });

    it('USD should have correct name and symbol', () => {
      const currencies = CountryStateCity.getAllCurrencies();
      const usd = currencies.find((c) => c.code === 'USD');
      expect(usd).toBeDefined();
      expect(usd!.name).toContain('Dollar');
      expect(usd!.symbol).toBe('$');
    });

    it('should have no duplicate currency codes', () => {
      const currencies = CountryStateCity.getAllCurrencies();
      const codes = currencies.map((c) => c.code);
      const unique = new Set(codes);
      expect(codes.length).toBe(unique.size);
    });
  });

  // ----------------------------------------------------------------
  // exportData
  // ----------------------------------------------------------------
  describe('exportData', () => {
    it('should export countries as JSON string', () => {
      const result = CountryStateCity.exportData('countries', 'json');
      expect(typeof result).toBe('string');
      const parsed = JSON.parse(result);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(200);
    });

    it('should export states as JSON string', () => {
      const result = CountryStateCity.exportData('states', 'json');
      expect(typeof result).toBe('string');
      const parsed = JSON.parse(result);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(4000);
    });

    it('should export cities as JSON string', () => {
      const result = CountryStateCity.exportData('cities', 'json');
      expect(typeof result).toBe('string');
      const parsed = JSON.parse(result);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(100000);
    });

    it('should export countries as CSV', () => {
      const result = CountryStateCity.exportData('countries', 'csv');
      expect(typeof result).toBe('string');
      const lines = result.split('\n');
      expect(lines.length).toBeGreaterThan(200);
      expect(lines[0]).toContain('id');
    });

    it('should export countries as XML', () => {
      const result = CountryStateCity.exportData('countries', 'xml');
      expect(typeof result).toBe('string');
      expect(result).toContain('<countries>');
      expect(result).toContain('<country>');
    });

    it('should export countries as YAML', () => {
      const result = CountryStateCity.exportData('countries', 'yaml');
      expect(typeof result).toBe('string');
      expect(result).toContain('- id:');
      expect(result).toContain('name:');
    });

    it('should respect FormatOptions (pretty JSON)', () => {
      const minified = CountryStateCity.exportData('countries', 'json');
      const pretty = CountryStateCity.exportData('countries', 'json', { pretty: true });
      expect(pretty.length).toBeGreaterThan(minified.length);
      expect(pretty).toContain('\n');
    });

    it('should respect FormatOptions (custom CSV delimiter)', () => {
      const result = CountryStateCity.exportData('countries', 'csv', { delimiter: '|' });
      const lines = result.split('\n');
      expect(lines[0]).toContain('|');
    });
  });

  // ----------------------------------------------------------------
  // exportFiltered
  // ----------------------------------------------------------------
  describe('exportFiltered', () => {
    it('should filter countries by region', () => {
      const result = CountryStateCity.exportFiltered('countries', 'json', {
        region: 'Europe',
      });
      const parsed = JSON.parse(result);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(30);
      for (const country of parsed) {
        expect(country.region.toLowerCase()).toBe('europe');
      }
    });

    it('should filter countries by subregion', () => {
      const result = CountryStateCity.exportFiltered('countries', 'json', {
        subregion: 'Western Europe',
      });
      const parsed = JSON.parse(result);
      expect(parsed.length).toBeGreaterThan(3);
      for (const country of parsed) {
        expect(country.subregion.toLowerCase()).toBe('western europe');
      }
    });

    it('should filter countries by countryCode', () => {
      const result = CountryStateCity.exportFiltered('countries', 'json', {
        countryCode: 'US',
      });
      const parsed = JSON.parse(result);
      expect(parsed.length).toBe(1);
      expect(parsed[0].iso2).toBe('US');
    });

    it('should filter countries by countryId', () => {
      const result = CountryStateCity.exportFiltered('countries', 'json', {
        countryId: 233,
      });
      const parsed = JSON.parse(result);
      expect(parsed.length).toBe(1);
      expect(parsed[0].name).toBe('United States');
    });

    it('should return filtered data in the specified format (csv)', () => {
      const result = CountryStateCity.exportFiltered('countries', 'csv', {
        region: 'Europe',
      });
      const lines = result.split('\n');
      // Header + data
      expect(lines.length).toBeGreaterThan(30);
      expect(lines[0]).toContain('id');
    });
  });
});
