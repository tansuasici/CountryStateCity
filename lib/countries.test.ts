import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearCityShardCache, getCitiesByCountryId, getCitiesByStateId } from '@/lib/countries';

const compactRows = [
  { i: 107120, n: 'Aladağ', s: 2212, la: 37.5585, lo: 35.402, w: 'Q911286' },
  { i: 107258, n: 'Bahçe', s: 2214, la: 37.1972, lo: 36.5766 },
];

describe('country city shard loading', () => {
  beforeEach(() => {
    clearCityShardCache();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify(compactRows), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
      )
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  it('fetches only the selected country shard and inflates complete city records', async () => {
    const cities = await getCitiesByCountryId(225);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      '/data/cities/tr.json',
      expect.objectContaining({ cache: 'force-cache' })
    );
    expect(cities[0]).toMatchObject({
      id: 107120,
      name: 'Aladağ',
      stateId: 2212,
      countryId: 225,
      countryCode: 'TR',
      countryName: 'Türkiye',
      wikiDataId: 'Q911286',
      parentId: 2212,
    });
  });

  it('reuses a successful country shard and filters it by state', async () => {
    await getCitiesByCountryId(225);
    const cities = await getCitiesByStateId(2212);
    expect(cities.map((city) => city.id)).toEqual([107120]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('forwards AbortSignal and does not cache a failed request', async () => {
    const controller = new AbortController();
    vi.mocked(fetch).mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'));
    await expect(getCitiesByCountryId(225, { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
    await getCitiesByCountryId(225);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('rejects unknown country IDs without a network request', async () => {
    await expect(getCitiesByCountryId(-1)).rejects.toThrow('Unknown country ID');
    expect(fetch).not.toHaveBeenCalled();
  });
});
