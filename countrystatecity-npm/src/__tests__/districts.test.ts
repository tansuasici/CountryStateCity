import { describe, expect, it } from 'vitest';
import { CountryStateCity } from '../index';
import type { District } from '../types';

describe('Türkiye district layer', () => {
  const districts = CountryStateCity.getAllDistricts() as District[];

  it('publishes exactly one current district identity for each of the 922 districts', () => {
    expect(districts).toHaveLength(922);
    expect(new Set(districts.map((item) => item.id))).toHaveProperty('size', 922);
    expect(new Set(districts.map((item) => item.publicId))).toHaveProperty('size', 922);
    expect(new Set(districts.map((item) => item.geoNameId))).toHaveProperty('size', 922);
  });

  it('keeps the province parent and administrative grain explicit', () => {
    const provinces = new Set(districts.map((item) => item.stateId));
    expect(provinces.size).toBe(81);
    expect(districts.every((item) => item.entityType === 'district')).toBe(true);
    expect(districts.some((item) => item.name === 'Merkez')).toBe(false);
    expect(districts.some((item) => item.name.endsWith(' İlçesi'))).toBe(false);
  });

  it('resolves reviewed current names without destroying legacy aliases', () => {
    const kahramankazan = CountryStateCity.getDistrictById(107956);
    const efeler = CountryStateCity.getDistrictByPublicId('csc:district:999001');
    const eregli = CountryStateCity.searchDistricts('Karadeniz Ereğli');

    expect(kahramankazan?.name).toBe('Kahramankazan');
    expect(kahramankazan?.aliases).toContain('Kazan');
    expect(efeler?.name).toBe('Efeler');
    expect(efeler?.aliases).toContain('Merkez');
    expect(eregli.some((item) => item.stateCode === '67' && item.name === 'Ereğli')).toBe(true);
  });

  it('filters and exports districts through the public API', () => {
    const adana = CountryStateCity.getDistrictsByStateId(2212) as District[];
    expect(adana).toHaveLength(15);
    expect(CountryStateCity.getDistrictsByCountryCode('tr')).toHaveLength(922);
    expect(JSON.parse(CountryStateCity.exportData('districts', 'json'))).toHaveLength(922);
  });

  it('does not present CSC identities as official government district codes', () => {
    expect(districts.every((item) => item.officialDistrictCode === null)).toBe(true);
    expect(districts.every((item) => item.publicId === `csc:district:${item.id}`)).toBe(true);
  });

  it('publishes no unresolved coordinate conflict and corrects the Sarıçam village mix-up', () => {
    const saricam = CountryStateCity.getDistrictById(108414);
    expect(districts.some((item) => item.coordinateStatus === 'review-required')).toBe(false);
    expect(saricam).toMatchObject({
      name: 'Sarıçam',
      latitude: '37.01974120',
      longitude: '35.39899190',
      coordinateStatus: 'corrected',
      coordinateSource: 'openstreetmap',
    });
  });
});
