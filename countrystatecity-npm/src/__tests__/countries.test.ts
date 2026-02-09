import { describe, it, expect, beforeAll } from 'vitest';
import { CountryStateCity } from '../index';
import type { Country } from '../types';

describe('Country Methods', () => {
  // Pre-load countries once so individual tests are fast
  let allCountries: Country[];

  beforeAll(() => {
    allCountries = CountryStateCity.getAllCountries() as Country[];
  });

  // ----------------------------------------------------------------
  // getAllCountries
  // ----------------------------------------------------------------
  describe('getAllCountries', () => {
    it('should return an array of countries', () => {
      expect(Array.isArray(allCountries)).toBe(true);
    });

    it('should contain more than 200 countries', () => {
      expect(allCountries.length).toBeGreaterThan(200);
    });

    it('every country should have required fields', () => {
      for (const country of allCountries) {
        expect(country).toHaveProperty('id');
        expect(country).toHaveProperty('name');
        expect(country).toHaveProperty('iso2');
        expect(country).toHaveProperty('iso3');
        expect(country).toHaveProperty('region');
        expect(country).toHaveProperty('subregion');
        expect(country).toHaveProperty('timezones');
        expect(typeof country.id).toBe('number');
        expect(typeof country.name).toBe('string');
      }
    });

    it('should return a JSON string when format is "json"', () => {
      const result = CountryStateCity.getAllCountries('json');
      expect(typeof result).toBe('string');
      const parsed = JSON.parse(result as string);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(allCountries.length);
    });

    it('should return a CSV string when format is "csv"', () => {
      const result = CountryStateCity.getAllCountries('csv') as string;
      expect(typeof result).toBe('string');
      const lines = result.split('\n');
      // Header + data rows
      expect(lines.length).toBeGreaterThan(1);
      expect(lines[0]).toContain('id');
      expect(lines[0]).toContain('name');
    });

    it('should return an XML string when format is "xml"', () => {
      const result = CountryStateCity.getAllCountries('xml') as string;
      expect(typeof result).toBe('string');
      expect(result).toContain('<countries>');
      expect(result).toContain('<country>');
    });

    it('should return a YAML string when format is "yaml"', () => {
      const result = CountryStateCity.getAllCountries('yaml') as string;
      expect(typeof result).toBe('string');
      expect(result).toContain('name:');
      expect(result).toContain('iso2:');
    });
  });

  // ----------------------------------------------------------------
  // getCountryById
  // ----------------------------------------------------------------
  describe('getCountryById', () => {
    it('should return Afghanistan for id 1', () => {
      const country = CountryStateCity.getCountryById(1);
      expect(country).toBeDefined();
      expect(country!.name).toBe('Afghanistan');
      expect(country!.iso2).toBe('AF');
      expect(country!.iso3).toBe('AFG');
    });

    it('should return undefined for a non-existent id', () => {
      const country = CountryStateCity.getCountryById(999999);
      expect(country).toBeUndefined();
    });

    it('should return undefined for negative id', () => {
      const country = CountryStateCity.getCountryById(-1);
      expect(country).toBeUndefined();
    });

    it('should return a country object with all expected properties', () => {
      const country = CountryStateCity.getCountryById(1);
      expect(country).toHaveProperty('id');
      expect(country).toHaveProperty('name');
      expect(country).toHaveProperty('iso2');
      expect(country).toHaveProperty('iso3');
      expect(country).toHaveProperty('phoneCode');
      expect(country).toHaveProperty('capital');
      expect(country).toHaveProperty('currency');
      expect(country).toHaveProperty('region');
      expect(country).toHaveProperty('subregion');
      expect(country).toHaveProperty('timezones');
      expect(country).toHaveProperty('latitude');
      expect(country).toHaveProperty('longitude');
    });
  });

  // ----------------------------------------------------------------
  // getCountryByIso2
  // ----------------------------------------------------------------
  describe('getCountryByIso2', () => {
    it('should return the United States for "US"', () => {
      const country = CountryStateCity.getCountryByIso2('US');
      expect(country).toBeDefined();
      expect(country!.name).toBe('United States');
      expect(country!.iso3).toBe('USA');
    });

    it('should be case insensitive', () => {
      const upper = CountryStateCity.getCountryByIso2('US');
      const lower = CountryStateCity.getCountryByIso2('us');
      const mixed = CountryStateCity.getCountryByIso2('Us');
      expect(upper).toEqual(lower);
      expect(upper).toEqual(mixed);
    });

    it('should return undefined for an empty string', () => {
      const country = CountryStateCity.getCountryByIso2('');
      expect(country).toBeUndefined();
    });

    it('should return undefined for an invalid iso2 code', () => {
      const country = CountryStateCity.getCountryByIso2('ZZ');
      expect(country).toBeUndefined();
    });

    it('should find Turkey with "TR"', () => {
      const country = CountryStateCity.getCountryByIso2('TR');
      expect(country).toBeDefined();
      expect(country!.name).toBe('Turkey');
      expect(country!.iso3).toBe('TUR');
    });
  });

  // ----------------------------------------------------------------
  // getCountryByIso3
  // ----------------------------------------------------------------
  describe('getCountryByIso3', () => {
    it('should return the United States for "USA"', () => {
      const country = CountryStateCity.getCountryByIso3('USA');
      expect(country).toBeDefined();
      expect(country!.name).toBe('United States');
      expect(country!.iso2).toBe('US');
    });

    it('should be case insensitive', () => {
      const upper = CountryStateCity.getCountryByIso3('USA');
      const lower = CountryStateCity.getCountryByIso3('usa');
      const mixed = CountryStateCity.getCountryByIso3('Usa');
      expect(upper).toEqual(lower);
      expect(upper).toEqual(mixed);
    });

    it('should return undefined for an empty string', () => {
      const country = CountryStateCity.getCountryByIso3('');
      expect(country).toBeUndefined();
    });

    it('should return undefined for an invalid iso3 code', () => {
      const country = CountryStateCity.getCountryByIso3('ZZZ');
      expect(country).toBeUndefined();
    });

    it('should find Germany with "DEU"', () => {
      const country = CountryStateCity.getCountryByIso3('DEU');
      expect(country).toBeDefined();
      expect(country!.name).toBe('Germany');
      expect(country!.iso2).toBe('DE');
    });
  });

  // ----------------------------------------------------------------
  // searchCountries
  // ----------------------------------------------------------------
  describe('searchCountries', () => {
    it('should return multiple results for "united"', () => {
      const results = CountryStateCity.searchCountries('united');
      expect(results.length).toBeGreaterThanOrEqual(2);
      const names = results.map((c) => c.name.toLowerCase());
      for (const name of names) {
        expect(name).toContain('united');
      }
    });

    it('should return an empty array for an empty string', () => {
      const results = CountryStateCity.searchCountries('');
      expect(results).toEqual([]);
    });

    it('should return an empty array for whitespace-only string', () => {
      const results = CountryStateCity.searchCountries('   ');
      expect(results).toEqual([]);
    });

    it('should return an empty array for a nonsense query', () => {
      const results = CountryStateCity.searchCountries('xyznonexistent123');
      expect(results).toEqual([]);
    });

    it('should be case insensitive', () => {
      const lower = CountryStateCity.searchCountries('germany');
      const upper = CountryStateCity.searchCountries('GERMANY');
      expect(lower.length).toBe(upper.length);
      expect(lower[0]?.id).toBe(upper[0]?.id);
    });

    it('should find countries by partial name', () => {
      const results = CountryStateCity.searchCountries('ger');
      const names = results.map((c) => c.name.toLowerCase());
      expect(names.some((n) => n.includes('ger'))).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  // getCountriesByRegion
  // ----------------------------------------------------------------
  describe('getCountriesByRegion', () => {
    it('should return countries for "Europe"', () => {
      const results = CountryStateCity.getCountriesByRegion('Europe');
      expect(results.length).toBeGreaterThan(30);
    });

    it('all returned countries should have matching region', () => {
      const results = CountryStateCity.getCountriesByRegion('Europe');
      for (const country of results) {
        expect(country.region.toLowerCase()).toBe('europe');
      }
    });

    it('should be case insensitive', () => {
      const lower = CountryStateCity.getCountriesByRegion('europe');
      const upper = CountryStateCity.getCountriesByRegion('EUROPE');
      expect(lower.length).toBe(upper.length);
    });

    it('should return an empty array for an empty string', () => {
      const results = CountryStateCity.getCountriesByRegion('');
      expect(results).toEqual([]);
    });

    it('should return an empty array for a non-existent region', () => {
      const results = CountryStateCity.getCountriesByRegion('Atlantis');
      expect(results).toEqual([]);
    });

    it('should return countries for "Asia"', () => {
      const results = CountryStateCity.getCountriesByRegion('Asia');
      expect(results.length).toBeGreaterThan(30);
      for (const country of results) {
        expect(country.region.toLowerCase()).toBe('asia');
      }
    });
  });

  // ----------------------------------------------------------------
  // getCountriesBySubregion
  // ----------------------------------------------------------------
  describe('getCountriesBySubregion', () => {
    it('should return countries for "Western Europe"', () => {
      const results = CountryStateCity.getCountriesBySubregion('Western Europe');
      expect(results.length).toBeGreaterThan(3);
    });

    it('all returned countries should have matching subregion', () => {
      const results = CountryStateCity.getCountriesBySubregion('Western Europe');
      for (const country of results) {
        expect(country.subregion.toLowerCase()).toBe('western europe');
      }
    });

    it('should be case insensitive', () => {
      const lower = CountryStateCity.getCountriesBySubregion('western europe');
      const upper = CountryStateCity.getCountriesBySubregion('WESTERN EUROPE');
      expect(lower.length).toBe(upper.length);
    });

    it('should return an empty array for an empty string', () => {
      const results = CountryStateCity.getCountriesBySubregion('');
      expect(results).toEqual([]);
    });

    it('should return an empty array for a non-existent subregion', () => {
      const results = CountryStateCity.getCountriesBySubregion('North Pole');
      expect(results).toEqual([]);
    });

    it('should return countries for "Southern Asia"', () => {
      const results = CountryStateCity.getCountriesBySubregion('Southern Asia');
      expect(results.length).toBeGreaterThan(3);
      for (const country of results) {
        expect(country.subregion.toLowerCase()).toBe('southern asia');
      }
    });
  });
});
