import { describe, expect, it } from 'vitest';
import { CountryStateCity, type Country } from '../index';

describe('timezone safety contract', () => {
  const countries = CountryStateCity.getAllCountries() as Country[];
  const timezones = countries.flatMap((country) => country.timezones);

  it('publishes one explicit observation instant and normalized UTC format', () => {
    expect(timezones).toHaveLength(428);
    expect(timezones.every((timezone) => timezone.observedAt === '2026-01-15T00:00:00.000Z')).toBe(
      true
    );
    expect(timezones.every((timezone) => /^UTC[+-]\d{2}:\d{2}$/.test(timezone.gmtOffsetName))).toBe(
      true
    );
    expect(
      timezones
        .filter((timezone) => timezone.gmtOffset === 0)
        .every((timezone) => timezone.gmtOffsetName === 'UTC+00:00')
    ).toBe(true);
  });

  it('treats IANA zoneName as authoritative', () => {
    expect(
      timezones.every((timezone) => {
        expect(
          () => new Intl.DateTimeFormat('en-US', { timeZone: timezone.zoneName })
        ).not.toThrow();
        return timezone.zoneNameAuthority === 'IANA Time Zone Database';
      })
    ).toBe(true);
  });

  it('calculates runtime offsets for the requested instant, including DST', () => {
    const winter = CountryStateCity.getTimezoneOffset('America/New_York', '2026-01-15T00:00:00Z');
    const summer = CountryStateCity.getTimezoneOffset('America/New_York', '2026-07-15T00:00:00Z');
    expect(winter.gmtOffsetName).toBe('UTC-05:00');
    expect(summer.gmtOffsetName).toBe('UTC-04:00');
    expect(winter.observedAt).toBe('2026-01-15T00:00:00.000Z');
  });

  it('rejects unknown zones', () => {
    expect(() => CountryStateCity.getTimezoneOffset('Mars/Olympus_Mons')).toThrow(
      'Invalid IANA time zone'
    );
  });
});
