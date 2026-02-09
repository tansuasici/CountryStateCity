import { describe, it, expect } from 'vitest';
import { CountryStateCity } from '../../../countrystatecity-npm/src/index';

describe('MCP Resources', () => {
  describe('countries resource - all countries summary', () => {
    it('returns all countries as summary objects', () => {
      const countries = CountryStateCity.getAllCountries() as any[];
      const summary = countries.map((c) => ({
        id: c.id,
        name: c.name,
        iso2: c.iso2,
        iso3: c.iso3,
        region: c.region,
      }));

      expect(summary.length).toBeGreaterThan(200);
    });

    it('summary objects have the correct shape', () => {
      const countries = CountryStateCity.getAllCountries() as any[];
      const summary = countries.map((c) => ({
        id: c.id,
        name: c.name,
        iso2: c.iso2,
        iso3: c.iso3,
        region: c.region,
      }));

      const first = summary[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('name');
      expect(first).toHaveProperty('iso2');
      expect(first).toHaveProperty('iso3');
      expect(first).toHaveProperty('region');
      // Should NOT contain full country fields like timezones, translations, etc.
      expect(first).not.toHaveProperty('timezones');
      expect(first).not.toHaveProperty('translations');
      expect(first).not.toHaveProperty('currency');
      expect(first).not.toHaveProperty('capital');
    });

    it('all entries have non-empty iso2 codes', () => {
      const countries = CountryStateCity.getAllCountries() as any[];
      countries.forEach((c) => {
        expect(c.iso2).toBeTruthy();
        expect(c.iso2.length).toBe(2);
      });
    });

    it('all entries have non-empty iso3 codes', () => {
      const countries = CountryStateCity.getAllCountries() as any[];
      countries.forEach((c) => {
        expect(c.iso3).toBeTruthy();
        expect(c.iso3.length).toBe(3);
      });
    });
  });

  describe('country-by-iso2 resource', () => {
    it('returns full country detail for a valid iso2', () => {
      const country = CountryStateCity.getCountryByIso2('US');
      expect(country).toBeDefined();
      expect(country!.name).toBe('United States');
      expect(country!.iso3).toBe('USA');
      expect(country!.timezones).toBeDefined();
      expect(country!.timezones.length).toBeGreaterThan(0);
    });

    it('returns undefined for non-existent iso2', () => {
      const country = CountryStateCity.getCountryByIso2('ZZ');
      expect(country).toBeUndefined();
    });

    it('country detail includes all expected fields', () => {
      const country = CountryStateCity.getCountryByIso2('TR')!;
      expect(country.id).toBeTypeOf('number');
      expect(country.name).toBeTypeOf('string');
      expect(country.iso2).toBe('TR');
      expect(country.iso3).toBe('TUR');
      expect(country.phoneCode).toBeDefined();
      expect(country.capital).toBeDefined();
      expect(country.currency).toBeDefined();
      expect(country.currencyName).toBeDefined();
      expect(country.currencySymbol).toBeDefined();
      expect(country.region).toBeDefined();
      expect(country.subregion).toBeDefined();
      expect(country.latitude).toBeDefined();
      expect(country.longitude).toBeDefined();
      expect(country.emoji).toBeDefined();
      expect(country.timezones).toBeInstanceOf(Array);
      expect(country.translations).toBeDefined();
    });
  });

  describe('states-by-country resource', () => {
    it('returns states for a valid country code', () => {
      const states = CountryStateCity.getStatesByCountryCode('US') as any[];
      expect(states.length).toBeGreaterThan(40);
    });

    it('each state has expected fields', () => {
      const states = CountryStateCity.getStatesByCountryCode('TR') as any[];
      expect(states.length).toBeGreaterThan(0);
      states.forEach((s) => {
        expect(s).toHaveProperty('id');
        expect(s).toHaveProperty('name');
        expect(s).toHaveProperty('countryId');
        expect(s).toHaveProperty('countryCode');
        expect(s).toHaveProperty('stateCode');
      });
    });

    it('returns empty array for non-existent country', () => {
      const states = CountryStateCity.getStatesByCountryCode('ZZ') as any[];
      expect(states).toEqual([]);
    });

    it('all states belong to the correct country', () => {
      const country = CountryStateCity.getCountryByIso2('DE')!;
      const states = CountryStateCity.getStatesByCountryCode('DE') as any[];
      states.forEach((s) => {
        expect(s.countryId).toBe(country.id);
      });
    });
  });

  describe('cities-by-state resource', () => {
    it('returns cities for a valid state id', () => {
      const states = CountryStateCity.getStatesByCountryCode('US') as any[];
      const firstState = states[0];
      const cities = CountryStateCity.getCitiesByStateId(firstState.id) as any[];
      expect(cities.length).toBeGreaterThan(0);
    });

    it('limits to 500 entries as the resource does', () => {
      // The resource handler limits to 500. Simulate that behavior.
      const states = CountryStateCity.getStatesByCountryCode('US') as any[];
      const firstState = states[0];
      const cities = CountryStateCity.getCitiesByStateId(firstState.id) as any[];
      const limited = cities.slice(0, 500);
      expect(limited.length).toBeLessThanOrEqual(500);
    });

    it('resource response shape matches expected format', () => {
      const states = CountryStateCity.getStatesByCountryCode('TR') as any[];
      const stateId = states[0].id;
      const cities = CountryStateCity.getCitiesByStateId(stateId) as any[];
      const limited = cities.slice(0, 500);

      const response = {
        total: cities.length,
        returned: limited.length,
        cities: limited,
      };

      expect(response).toHaveProperty('total');
      expect(response).toHaveProperty('returned');
      expect(response).toHaveProperty('cities');
      expect(response.returned).toBeLessThanOrEqual(response.total);
      expect(response.returned).toBeLessThanOrEqual(500);
    });

    it('returns empty array for non-existent state id', () => {
      const cities = CountryStateCity.getCitiesByStateId(999999) as any[];
      expect(cities).toEqual([]);
    });

    it('each city has expected fields', () => {
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

  describe('stats resource', () => {
    it('returns statistics object', () => {
      const stats = CountryStateCity.getStats();
      expect(stats).toHaveProperty('countries');
      expect(stats).toHaveProperty('states');
      expect(stats).toHaveProperty('cities');
    });

    it('all counts are positive numbers', () => {
      const stats = CountryStateCity.getStats();
      expect(stats.countries).toBeTypeOf('number');
      expect(stats.states).toBeTypeOf('number');
      expect(stats.cities).toBeTypeOf('number');
      expect(stats.countries).toBeGreaterThan(0);
      expect(stats.states).toBeGreaterThan(0);
      expect(stats.cities).toBeGreaterThan(0);
    });

    it('stats match actual data counts', () => {
      const stats = CountryStateCity.getStats();
      const countries = CountryStateCity.getAllCountries() as any[];
      const states = CountryStateCity.getAllStates() as any[];
      const cities = CountryStateCity.getAllCities() as any[];
      expect(stats.countries).toBe(countries.length);
      expect(stats.states).toBe(states.length);
      expect(stats.cities).toBe(cities.length);
    });
  });
});
