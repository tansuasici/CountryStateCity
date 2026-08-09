import { performance } from 'node:perf_hooks';

import { describe, expect, it } from 'vitest';

import goldenQueries from '../../../data/search/golden-queries.json' with { type: 'json' };
import { CountryStateCity } from '../index';
import type { LocationSearchOptions } from '../search';

describe('multilingual location search', () => {
  it('ranks every multilingual and ambiguous golden query at position one', () => {
    const ranks = goldenQueries.queries.map((golden) => {
      const results = CountryStateCity.searchLocations(
        golden.query,
        golden.options as LocationSearchOptions
      );
      return results.findIndex((result) => result.canonicalId === golden.expectedPublicId) + 1;
    });

    expect(ranks.every((rank) => rank === 1)).toBe(true);
    expect(ranks.reduce((sum, rank) => sum + 1 / rank, 0) / ranks.length).toBe(1);
  });

  it('returns canonical identity, parent context, and auditable alias reason', () => {
    const [result] = CountryStateCity.searchLocations('Constantinople', {
      countryCode: 'TR',
      entityTypes: ['state'],
    });

    expect(result).toMatchObject({
      canonicalId: 'csc:state:2170',
      name: 'Istanbul',
      countryCode: 'TR',
      stateCode: '34',
      matchReason: 'alias-exact',
      matchedName: 'Constantinople',
      matchedLanguageTag: 'en',
      matchedAliasType: 'historical',
      matchedAliasValidTo: '1930-03-28',
    });
    expect(result.matchedAliasSource?.id).toBe('wikidata:Q406');
  });

  it('uses parent context to disambiguate identical place names', () => {
    const all = CountryStateCity.searchLocations('Springfield', {
      countryCode: 'US',
      entityTypes: ['city'],
      limit: 100,
    });
    const illinois = CountryStateCity.searchLocations('Springfield', {
      countryCode: 'US',
      stateCode: 'IL',
      entityTypes: ['city'],
    });

    expect(new Set(all.map((result) => result.stateCode)).size).toBeGreaterThan(10);
    expect(illinois).toHaveLength(1);
    expect(illinois[0].canonicalId).toBe('csc:city:126890');
    expect(illinois[0].stateName).toBe('Illinois');
  });

  it('rejects short/noisy false positives and stays within the warm-query latency guardrail', () => {
    for (const query of ['zzzzzzzz', 'istanbulxxxxxxxx', 'qzxwvu', 'qz']) {
      expect(CountryStateCity.searchLocations(query, { entityTypes: ['state'] })).toEqual([]);
    }

    const durations = goldenQueries.queries.map((golden) => {
      const started = performance.now();
      CountryStateCity.searchLocations(golden.query, golden.options as LocationSearchOptions);
      return performance.now() - started;
    });
    const p95 = durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)];
    expect(p95).toBeLessThan(50);
  });
});
