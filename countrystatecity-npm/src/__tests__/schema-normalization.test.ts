import { describe, expect, it } from 'vitest';
import { CountryStateCity, type Country, type State } from '../index';

const canonicalLocales = [
  'de',
  'en',
  'es',
  'fa',
  'fr',
  'hr',
  'it',
  'ja',
  'ko',
  'nl',
  'pt',
  'pt-BR',
  'tr',
  'zh-CN',
];

describe('schema normalization', () => {
  it('uses one BCP 47 translation key set for every country', () => {
    const countries = CountryStateCity.getAllCountries() as Country[];
    expect(countries).toHaveLength(250);
    expect(
      countries.every(
        (country) =>
          JSON.stringify(Object.keys(country.translations)) === JSON.stringify(canonicalLocales)
      )
    ).toBe(true);
    expect(
      countries.reduce((sum, country) => sum + country.translationMissingLocales.length, 0)
    ).toBe(22);
  });

  it('resolves deprecated translation aliases without keeping them in canonical JSON', () => {
    expect(CountryStateCity.getCountryTranslation('TR', 'kr')).toBe(
      CountryStateCity.getCountryTranslation('TR', 'ko')
    );
    expect(CountryStateCity.getCountryTranslation('BR', 'br')).toBe(
      CountryStateCity.getCountryTranslation('BR', 'pt-BR')
    );
    expect(CountryStateCity.getCountryTranslation('CN', 'cn')).toBe(
      CountryStateCity.getCountryTranslation('CN', 'zh-CN')
    );
  });

  it('normalizes state types and explains every null', () => {
    const states = CountryStateCity.getAllStates() as State[];
    expect(states.filter((state) => state.type === null)).toHaveLength(4272);
    expect(
      states.every((state) => state.type === null || state.type === state.type.trim().toLowerCase())
    ).toBe(true);
    expect(
      states
        .filter((state) => state.type === null)
        .every(
          (state) =>
            state.typeStatus === 'unknown' && state.typeReasonCode === 'source-type-missing'
        )
    ).toBe(true);
  });
});
