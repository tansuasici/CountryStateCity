import { describe, expect, it } from 'vitest';
import { CountryStateCity, type State } from '../index';

describe('state coordinate quality contract', () => {
  const states = CountryStateCity.getAllStates() as State[];

  it('publishes a method, source, validation, and review date on every state', () => {
    expect(states).toHaveLength(4963);
    expect(states.every((state) => state.coordinateType.length > 0)).toBe(true);
    expect(states.every((state) => state.coordinateSource.length > 0)).toBe(true);
    expect(states.every((state) => state.coordinateVerifiedAt === '2026-08-08')).toBe(true);
    expect(states.every((state) => state.coordinateValidation.length > 0)).toBe(true);
  });

  it('keeps every unavailable point as an explicit exception', () => {
    const unavailable = states.filter(
      (state) => state.latitude === null || state.longitude === null
    );
    expect(unavailable).toHaveLength(49);
    expect(unavailable.every((state) => state.coordinateType === 'unavailable')).toBe(true);
    expect(unavailable.every((state) => state.coordinateStatus === 'exception')).toBe(true);
  });

  it.each([
    ['PH', 'ISA', 'Isabela'],
    ['SC', '09', 'Bel Air'],
    ['MY', '09', 'Perlis'],
    ['VU', 'TOB', 'Torba'],
    ['SG', '02', 'North East Community Development Council'],
    ['SG', '05', 'South West Community Development Council'],
  ])('corrects %s-%s %s with an Admin-1 point on surface', (countryCode, stateCode) => {
    const state = states.find(
      (row) => row.countryCode === countryCode && row.stateCode === stateCode
    );
    expect(state?.coordinateType).toBe('point-on-surface');
    expect(state?.coordinateSource).toBe('natural-earth-admin1-5.1.1');
    expect(state?.coordinateStatus).toBe('verified');
  });
});
