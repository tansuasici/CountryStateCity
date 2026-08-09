import { describe, expect, it } from 'vitest';
import { CountryStateCity, type City, type State } from '../index';

describe('canonical entity levels', () => {
  it('classifies every legacy state row without changing the legacy collection', () => {
    const states = CountryStateCity.getAllStates() as State[];
    expect(states).toHaveLength(4963);
    expect(states.every((row) => row.entityType === 'administrative-area')).toBe(true);
    expect(states.every((row) => Number.isInteger(row.administrativeLevel))).toBe(true);
    expect(states.every((row) => row.parentId === row.countryId)).toBe(true);
  });

  it('returns a comparable current level-1 layer by default', () => {
    const rows = CountryStateCity.getAdministrativeAreas();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.administrativeLevel === 1)).toBe(true);
    expect(rows.every((row) => row.lifecycleStatus === 'current')).toBe(true);
  });

  it('separates Albania current counties from abolished districts', () => {
    const current = CountryStateCity.getAdministrativeAreas({ countryCode: 'AL', level: 1 });
    const historical = CountryStateCity.getAdministrativeAreas({
      countryCode: 'AL',
      level: 2,
      lifecycleStatus: 'historical',
    });
    expect(current).toHaveLength(12);
    expect(historical).toHaveLength(35);
    expect(historical.every((row) => row.validTo === '2000-07-31')).toBe(true);
  });

  it('keeps France level 1 and level 2 comparable', () => {
    const level1 = CountryStateCity.getAdministrativeAreas({ countryCode: 'FR', level: 1 });
    const level2 = CountryStateCity.getAdministrativeAreas({ countryCode: 'FR', level: 2 });
    expect(level1).toHaveLength(27);
    expect(level2).toHaveLength(96);
  });

  it('excludes administrative-area-like source cities from settlements', () => {
    const allCities = CountryStateCity.getAllCities() as City[];
    const settlements = CountryStateCity.getSettlements({ lifecycleStatus: 'all' });
    expect(allCities.filter((row) => row.entityType === 'administrative-area')).toHaveLength(3712);
    expect(settlements).toHaveLength(144027);
    expect(settlements.every((row) => row.entityType === 'settlement')).toBe(true);
  });
});
