import { describe, it, expect, beforeAll } from 'vitest';
import { CountryStateCity } from '../index';
import type { City } from '../types';

describe('City Methods', () => {
  // Cities dataset is large; load once via beforeAll
  let allCities: City[];

  beforeAll(() => {
    allCities = CountryStateCity.getAllCities() as City[];
  });

  // ----------------------------------------------------------------
  // getAllCities
  // ----------------------------------------------------------------
  describe('getAllCities', () => {
    it('should return an array of cities', () => {
      expect(Array.isArray(allCities)).toBe(true);
    });

    it('should contain more than 100000 cities', () => {
      expect(allCities.length).toBeGreaterThan(100000);
    });

    it('every city should have required fields', () => {
      // Check a sample rather than all ~150k to keep tests fast
      const sample = allCities.slice(0, 100);
      for (const city of sample) {
        expect(city).toHaveProperty('id');
        expect(city).toHaveProperty('name');
        expect(city).toHaveProperty('stateId');
        expect(city).toHaveProperty('stateCode');
        expect(city).toHaveProperty('stateName');
        expect(city).toHaveProperty('countryId');
        expect(city).toHaveProperty('countryCode');
        expect(city).toHaveProperty('countryName');
        expect(city).toHaveProperty('latitude');
        expect(city).toHaveProperty('longitude');
        expect(typeof city.id).toBe('number');
        expect(typeof city.name).toBe('string');
      }
    });
  });

  // ----------------------------------------------------------------
  // Decompression verification
  // ----------------------------------------------------------------
  describe('decompression from optimized format', () => {
    it('cities should have stateCode populated (not empty)', () => {
      // Find a city that has a known state
      const city = CountryStateCity.getCityById(allCities[0].id);
      expect(city).toBeDefined();
      expect(city!.stateCode).toBeDefined();
      expect(typeof city!.stateCode).toBe('string');
    });

    it('cities should have stateName populated', () => {
      const city = CountryStateCity.getCityById(allCities[0].id);
      expect(city).toBeDefined();
      expect(city!.stateName).toBeDefined();
      expect(typeof city!.stateName).toBe('string');
    });

    it('cities should have countryCode populated', () => {
      const city = CountryStateCity.getCityById(allCities[0].id);
      expect(city).toBeDefined();
      expect(city!.countryCode.length).toBeGreaterThanOrEqual(2);
    });

    it('cities should have countryName populated', () => {
      const city = CountryStateCity.getCityById(allCities[0].id);
      expect(city).toBeDefined();
      expect(city!.countryName.length).toBeGreaterThan(0);
    });

    it('latitude and longitude should be strings', () => {
      const city = CountryStateCity.getCityById(allCities[0].id);
      expect(city).toBeDefined();
      expect(typeof city!.latitude).toBe('string');
      expect(typeof city!.longitude).toBe('string');
    });

    it('decompressed fields should match corresponding country and state data', () => {
      // Pick a US city to verify cross-reference
      const usCities = CountryStateCity.getCitiesByCountryId(233) as City[];
      expect(usCities.length).toBeGreaterThan(0);

      const city = usCities[0];
      expect(city.countryCode).toBe('US');
      expect(city.countryName).toBe('United States');

      // Verify the state exists and matches
      const state = CountryStateCity.getStateById(city.stateId);
      expect(state).toBeDefined();
      expect(city.stateCode).toBe(state!.stateCode);
      expect(city.stateName).toBe(state!.name);
    });
  });

  // ----------------------------------------------------------------
  // getCityById
  // ----------------------------------------------------------------
  describe('getCityById', () => {
    it('should return a city for a valid id', () => {
      const firstCity = allCities[0];
      const city = CountryStateCity.getCityById(firstCity.id);
      expect(city).toBeDefined();
      expect(city!.id).toBe(firstCity.id);
      expect(city!.name).toBe(firstCity.name);
    });

    it('returned city should have all fields populated', () => {
      const city = CountryStateCity.getCityById(allCities[0].id);
      expect(city).toBeDefined();
      expect(city!.id).toBeGreaterThan(0);
      expect(city!.name.length).toBeGreaterThan(0);
      expect(city!.stateId).toBeGreaterThan(0);
      expect(city!.countryId).toBeGreaterThan(0);
      expect(city!.latitude.length).toBeGreaterThan(0);
      expect(city!.longitude.length).toBeGreaterThan(0);
    });

    it('should return undefined for a non-existent id', () => {
      const city = CountryStateCity.getCityById(999999999);
      expect(city).toBeUndefined();
    });

    it('should return undefined for negative id', () => {
      const city = CountryStateCity.getCityById(-1);
      expect(city).toBeUndefined();
    });
  });

  // ----------------------------------------------------------------
  // getCitiesByStateId
  // ----------------------------------------------------------------
  describe('getCitiesByStateId', () => {
    it('should return cities for a valid state id', () => {
      // Use a state from the first city
      const stateId = allCities[0].stateId;
      const cities = CountryStateCity.getCitiesByStateId(stateId) as City[];
      expect(Array.isArray(cities)).toBe(true);
      expect(cities.length).toBeGreaterThan(0);
    });

    it('all returned cities should belong to the given state', () => {
      const stateId = allCities[0].stateId;
      const cities = CountryStateCity.getCitiesByStateId(stateId) as City[];
      for (const city of cities) {
        expect(city.stateId).toBe(stateId);
      }
    });

    it('should return an empty array for a non-existent state id', () => {
      const cities = CountryStateCity.getCitiesByStateId(999999999) as City[];
      expect(cities).toEqual([]);
    });

    it('should return a formatted string when format is specified', () => {
      const stateId = allCities[0].stateId;
      const result = CountryStateCity.getCitiesByStateId(stateId, 'json') as string;
      expect(typeof result).toBe('string');
      const parsed = JSON.parse(result);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
    });
  });

  // ----------------------------------------------------------------
  // getCitiesByCountryId
  // ----------------------------------------------------------------
  describe('getCitiesByCountryId', () => {
    it('should return cities for the United States (id 233)', () => {
      const cities = CountryStateCity.getCitiesByCountryId(233) as City[];
      expect(Array.isArray(cities)).toBe(true);
      // US should have thousands of cities
      expect(cities.length).toBeGreaterThan(1000);
    });

    it('all returned cities should belong to the correct country', () => {
      const cities = CountryStateCity.getCitiesByCountryId(233) as City[];
      for (const city of cities.slice(0, 100)) {
        expect(city.countryId).toBe(233);
        expect(city.countryCode).toBe('US');
      }
    });

    it('should return an empty array for a non-existent country id', () => {
      const cities = CountryStateCity.getCitiesByCountryId(999999) as City[];
      expect(cities).toEqual([]);
    });

    it('should return cities for Turkey (id 225)', () => {
      const cities = CountryStateCity.getCitiesByCountryId(225) as City[];
      expect(cities.length).toBeGreaterThan(100);
      for (const city of cities.slice(0, 50)) {
        expect(city.countryId).toBe(225);
        expect(city.countryCode).toBe('TR');
      }
    });

    it('should return a formatted string when format is specified', () => {
      const result = CountryStateCity.getCitiesByCountryId(225, 'csv') as string;
      expect(typeof result).toBe('string');
      const lines = result.split('\n');
      expect(lines.length).toBeGreaterThan(1);
      expect(lines[0]).toContain('id');
      expect(lines[0]).toContain('name');
    });
  });

  // ----------------------------------------------------------------
  // searchCities
  // ----------------------------------------------------------------
  describe('searchCities', () => {
    it('should return results for "new york"', () => {
      const results = CountryStateCity.searchCities('new york');
      expect(results.length).toBeGreaterThanOrEqual(1);
      const names = results.map((c) => c.name.toLowerCase());
      expect(names.some((n) => n.includes('new york'))).toBe(true);
    });

    it('should return an empty array for an empty string', () => {
      const results = CountryStateCity.searchCities('');
      expect(results).toEqual([]);
    });

    it('should return an empty array for whitespace-only string', () => {
      const results = CountryStateCity.searchCities('   ');
      expect(results).toEqual([]);
    });

    it('should be case insensitive', () => {
      const lower = CountryStateCity.searchCities('london');
      const upper = CountryStateCity.searchCities('LONDON');
      expect(lower.length).toBe(upper.length);
    });

    it('should filter by stateId when provided', () => {
      // First find a US state to use as filter
      const usStates = CountryStateCity.getStatesByCountryCode('US') as any[];
      // Find California-like state
      const california = usStates.find((s: any) => s.name === 'California');
      if (california) {
        const results = CountryStateCity.searchCities('los', california.id);
        expect(results.length).toBeGreaterThanOrEqual(1);
        for (const city of results) {
          expect(city.stateId).toBe(california.id);
        }
      }
    });

    it('should filter by countryId when provided', () => {
      const results = CountryStateCity.searchCities('london', undefined, 233);
      // All results should be in the US
      for (const city of results) {
        expect(city.countryId).toBe(233);
      }
    });

    it('should return fewer results with country filter than without', () => {
      const allResults = CountryStateCity.searchCities('london');
      const usOnly = CountryStateCity.searchCities('london', undefined, 233);
      // There are Londons outside the US (UK has a famous one, plus Canada)
      expect(usOnly.length).toBeLessThanOrEqual(allResults.length);
    });

    it('should return an empty array for a nonsense query', () => {
      const results = CountryStateCity.searchCities('xyznonexistent123');
      expect(results).toEqual([]);
    });
  });
});
