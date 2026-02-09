import { describe, it, expect, beforeAll } from 'vitest';
import { CountryStateCity } from '../index';
import type { State } from '../types';

describe('State Methods', () => {
  let allStates: State[];

  beforeAll(() => {
    allStates = CountryStateCity.getAllStates() as State[];
  });

  // ----------------------------------------------------------------
  // getAllStates
  // ----------------------------------------------------------------
  describe('getAllStates', () => {
    it('should return an array of states', () => {
      expect(Array.isArray(allStates)).toBe(true);
    });

    it('should contain more than 4000 states', () => {
      expect(allStates.length).toBeGreaterThan(4000);
    });

    it('every state should have required fields', () => {
      for (const state of allStates) {
        expect(state).toHaveProperty('id');
        expect(state).toHaveProperty('name');
        expect(state).toHaveProperty('countryId');
        expect(state).toHaveProperty('countryCode');
        expect(state).toHaveProperty('countryName');
        expect(state).toHaveProperty('stateCode');
        expect(typeof state.id).toBe('number');
        expect(typeof state.name).toBe('string');
        expect(typeof state.countryId).toBe('number');
      }
    });

    it('should return a JSON string when format is "json"', () => {
      const result = CountryStateCity.getAllStates('json');
      expect(typeof result).toBe('string');
      const parsed = JSON.parse(result as string);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(allStates.length);
    });

    it('should return a CSV string when format is "csv"', () => {
      const result = CountryStateCity.getAllStates('csv') as string;
      expect(typeof result).toBe('string');
      const lines = result.split('\n');
      expect(lines.length).toBeGreaterThan(1);
      expect(lines[0]).toContain('id');
      expect(lines[0]).toContain('name');
      expect(lines[0]).toContain('countryId');
    });
  });

  // ----------------------------------------------------------------
  // getStateById
  // ----------------------------------------------------------------
  describe('getStateById', () => {
    it('should return a state for a valid id', () => {
      // Use the first state from the dataset
      const firstState = allStates[0];
      const state = CountryStateCity.getStateById(firstState.id);
      expect(state).toBeDefined();
      expect(state!.id).toBe(firstState.id);
      expect(state!.name).toBe(firstState.name);
    });

    it('should return undefined for a non-existent id', () => {
      const state = CountryStateCity.getStateById(999999);
      expect(state).toBeUndefined();
    });

    it('should return undefined for negative id', () => {
      const state = CountryStateCity.getStateById(-1);
      expect(state).toBeUndefined();
    });

    it('returned state should have all expected properties', () => {
      const state = CountryStateCity.getStateById(allStates[0].id);
      expect(state).toHaveProperty('id');
      expect(state).toHaveProperty('name');
      expect(state).toHaveProperty('countryId');
      expect(state).toHaveProperty('countryCode');
      expect(state).toHaveProperty('countryName');
      expect(state).toHaveProperty('stateCode');
      expect(state).toHaveProperty('latitude');
      expect(state).toHaveProperty('longitude');
    });
  });

  // ----------------------------------------------------------------
  // getStatesByCountryId
  // ----------------------------------------------------------------
  describe('getStatesByCountryId', () => {
    it('should return states for the United States (id 233)', () => {
      const states = CountryStateCity.getStatesByCountryId(233) as State[];
      expect(Array.isArray(states)).toBe(true);
      // US has 50 states plus territories (DC, PR, etc.)
      expect(states.length).toBeGreaterThanOrEqual(50);
    });

    it('all returned states should belong to the correct country', () => {
      const states = CountryStateCity.getStatesByCountryId(233) as State[];
      for (const state of states) {
        expect(state.countryId).toBe(233);
      }
    });

    it('should return an empty array for a non-existent country id', () => {
      const states = CountryStateCity.getStatesByCountryId(999999) as State[];
      expect(states).toEqual([]);
    });

    it('should return states for Turkey (id 225)', () => {
      const states = CountryStateCity.getStatesByCountryId(225) as State[];
      expect(states.length).toBeGreaterThan(50);
      for (const state of states) {
        expect(state.countryId).toBe(225);
      }
    });

    it('should return a formatted string when format is specified', () => {
      const result = CountryStateCity.getStatesByCountryId(233, 'json') as string;
      expect(typeof result).toBe('string');
      const parsed = JSON.parse(result);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThanOrEqual(50);
    });
  });

  // ----------------------------------------------------------------
  // getStatesByCountryCode
  // ----------------------------------------------------------------
  describe('getStatesByCountryCode', () => {
    it('should return states for "US"', () => {
      const states = CountryStateCity.getStatesByCountryCode('US') as State[];
      expect(Array.isArray(states)).toBe(true);
      expect(states.length).toBeGreaterThanOrEqual(50);
    });

    it('should return the same states as getStatesByCountryId for the same country', () => {
      const byCode = CountryStateCity.getStatesByCountryCode('US') as State[];
      const byId = CountryStateCity.getStatesByCountryId(233) as State[];
      expect(byCode.length).toBe(byId.length);
      // Check that the same state ids are present
      const codeIds = byCode.map((s) => s.id).sort();
      const idIds = byId.map((s) => s.id).sort();
      expect(codeIds).toEqual(idIds);
    });

    it('should be case insensitive', () => {
      const upper = CountryStateCity.getStatesByCountryCode('US') as State[];
      const lower = CountryStateCity.getStatesByCountryCode('us') as State[];
      expect(upper.length).toBe(lower.length);
    });

    it('should return an empty array for an empty string', () => {
      const states = CountryStateCity.getStatesByCountryCode('');
      expect(states).toEqual([]);
    });

    it('should return an empty array for an invalid country code', () => {
      const states = CountryStateCity.getStatesByCountryCode('ZZ') as State[];
      expect(states).toEqual([]);
    });

    it('should return a formatted string when format is specified', () => {
      const result = CountryStateCity.getStatesByCountryCode('TR', 'json') as string;
      expect(typeof result).toBe('string');
      const parsed = JSON.parse(result);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(50);
    });
  });

  // ----------------------------------------------------------------
  // searchStates
  // ----------------------------------------------------------------
  describe('searchStates', () => {
    it('should return results for "california"', () => {
      const results = CountryStateCity.searchStates('california');
      expect(results.length).toBeGreaterThanOrEqual(1);
      const names = results.map((s) => s.name.toLowerCase());
      expect(names.some((n) => n.includes('california'))).toBe(true);
    });

    it('should return an empty array for an empty string', () => {
      const results = CountryStateCity.searchStates('');
      expect(results).toEqual([]);
    });

    it('should return an empty array for whitespace-only string', () => {
      const results = CountryStateCity.searchStates('   ');
      expect(results).toEqual([]);
    });

    it('should be case insensitive', () => {
      const lower = CountryStateCity.searchStates('california');
      const upper = CountryStateCity.searchStates('CALIFORNIA');
      expect(lower.length).toBe(upper.length);
    });

    it('should return an empty array for a nonsense query', () => {
      const results = CountryStateCity.searchStates('xyznonexistent123');
      expect(results).toEqual([]);
    });

    it('should filter by countryId when provided', () => {
      const allResults = CountryStateCity.searchStates('california');
      const usOnly = CountryStateCity.searchStates('california', 233);
      // usOnly should be a subset
      expect(usOnly.length).toBeLessThanOrEqual(allResults.length);
      for (const state of usOnly) {
        expect(state.countryId).toBe(233);
      }
    });

    it('should find states by partial name', () => {
      const results = CountryStateCity.searchStates('ist');
      expect(results.length).toBeGreaterThanOrEqual(1);
      for (const state of results) {
        expect(state.name.toLowerCase()).toContain('ist');
      }
    });
  });
});
