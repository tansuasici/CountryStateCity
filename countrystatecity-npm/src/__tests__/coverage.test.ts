import { describe, expect, it } from 'vitest';
import { CountryStateCity } from '../index';

describe('Coverage contract', () => {
  it('publishes an exhaustive reason code for every current gap', () => {
    const report = CountryStateCity.getCoverageReport();

    expect(report.summary.countriesWithoutStates).toBe(53);
    expect(report.summary.countriesWithoutCities).toBe(58);
    expect(report.summary.statesWithoutCities).toBe(1532);
    expect(report.summary.contract.gapClassificationRate).toBe(1);
    expect(report.summary.contract.passed).toBe(true);
  });

  it('does not expose the UM 0,0 sentinel as a real coordinate', () => {
    const country = CountryStateCity.getCountryByIso2('UM');
    const coverage = CountryStateCity.getCountryCoverage('um');

    expect(country?.latitude).toBeNull();
    expect(country?.longitude).toBeNull();
    expect(coverage?.coordinate).toEqual({
      status: 'notApplicable',
      reasonCode: 'aggregate-has-no-single-centre',
    });
    expect(coverage?.cities.status).toBe('unknown');
  });

  it('publishes reviewed metadata corrections without inventing capitals', () => {
    expect(CountryStateCity.getCountryByIso2('BV')).toMatchObject({
      region: 'Americas',
      subregion: 'South America',
    });
    expect(CountryStateCity.getCountryByIso2('HM')).toMatchObject({
      region: 'Oceania',
      subregion: 'Australia and New Zealand',
    });
    expect(CountryStateCity.getCountryByIso2('CI')?.native).toBe('Côte d’Ivoire');
    expect(CountryStateCity.getCountryCoverage('TK')?.metadataGaps).toContainEqual({
      field: 'capital',
      status: 'notApplicable',
      reasonCode: 'no-official-capital',
    });
  });

  it('returns undefined for an unknown coverage code', () => {
    expect(CountryStateCity.getCountryCoverage('ZZ')).toBeUndefined();
    expect(CountryStateCity.getCountryCoverage('')).toBeUndefined();
  });
});
