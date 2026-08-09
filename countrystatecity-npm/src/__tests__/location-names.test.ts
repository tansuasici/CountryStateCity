import { describe, expect, it } from 'vitest';
import {
  formatAdministrativeType,
  getAdministrativeAreaDisplay,
  normalizeLocationName,
} from '../location-names';

describe('location display names', () => {
  it('normalizes Unicode-safe whitespace without changing the place name', () => {
    expect(normalizeLocationName('  São   Tomé\t')).toBe('São Tomé');
  });

  it('formats administrative categories consistently', () => {
    expect(formatAdministrativeType(' metropolitan collectivity with special status\t')).toBe(
      'Metropolitan Collectivity with Special Status'
    );
  });

  it('separates a repeated category from the canonical name', () => {
    expect(
      getAdministrativeAreaDisplay(
        { name: 'Andrijevica Municipality', type: null },
        { name: 'Andrijevica', type: 'municipality' }
      )
    ).toEqual({
      canonicalName: 'Andrijevica Municipality',
      name: 'Andrijevica',
      type: 'Municipality',
      source: 'verified',
    });
  });

  it('infers a category only when it is explicit in the name', () => {
    expect(getAdministrativeAreaDisplay({ name: 'Berat County', type: null })).toMatchObject({
      name: 'Berat',
      type: 'County',
      source: 'inferred',
    });
    expect(getAdministrativeAreaDisplay({ name: 'Mexico City', type: null })).toMatchObject({
      name: 'Mexico City',
      type: null,
      source: 'unknown',
    });
    expect(getAdministrativeAreaDisplay({ name: 'Washington State', type: null })).toMatchObject({
      name: 'Washington',
      type: 'State',
      source: 'inferred',
    });
    expect(getAdministrativeAreaDisplay({ name: 'Greenwich Village', type: null })).toMatchObject({
      name: 'Greenwich Village',
      type: null,
      source: 'unknown',
    });
  });

  it('does not strip a suffix that disagrees with the known category', () => {
    expect(getAdministrativeAreaDisplay({ name: 'Nairobi City', type: 'county' })).toMatchObject({
      name: 'Nairobi City',
      type: 'County',
    });
  });
});
