import { describe, expect, it } from 'vitest';
import { CountryStateCity } from '../index';
import type { Country } from '../types';

describe('country metadata policy', () => {
  it('distinguishes officially assigned and user-assigned country codes', () => {
    const countries = CountryStateCity.getAllCountries();
    expect(Array.isArray(countries)).toBe(true);
    const rows = countries as Country[];
    expect(rows.filter((country) => country?.codeStatus === 'officially-assigned')).toHaveLength(
      249
    );
    expect(rows.filter((country) => country?.codeStatus === 'user-assigned')).toHaveLength(1);

    const kosovo = CountryStateCity.getCountryByIso2('XK');
    expect(kosovo).toMatchObject({
      codeAuthority: 'CountryStateCity user-assigned',
      codeStatus: 'user-assigned',
      metadataVerifiedAt: '2026-08-08',
    });
  });

  it('publishes current names and currencies', () => {
    expect(CountryStateCity.getCountryByIso2('BG')).toMatchObject({ currency: 'EUR' });
    expect(CountryStateCity.getCountryByIso2('HR')).toMatchObject({ currency: 'EUR' });
    expect(CountryStateCity.getCountryByIso2('MR')).toMatchObject({ currency: 'MRU' });
    expect(CountryStateCity.getCountryByIso2('MK')).toMatchObject({ name: 'North Macedonia' });
    expect(CountryStateCity.getCountryByIso2('TL')).toMatchObject({ name: 'Timor-Leste' });
    expect(CountryStateCity.getCountryByIso2('TR')).toMatchObject({ name: 'Türkiye' });
  });
});
