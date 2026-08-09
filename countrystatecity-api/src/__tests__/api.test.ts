import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApiHandler, hashApiKey, resetApiRuntimeState } from '../handler';

const RAW_KEY = 'test-key-that-must-never-be-logged';
const KEY_CONFIG = `test:${hashApiKey(RAW_KEY)}`;

function request(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  if (
    !path.includes('/health') &&
    !path.includes('/openapi') &&
    !path.includes('/policy') &&
    path !== '/api'
  ) {
    headers.set('x-api-key', RAW_KEY);
  }
  return new Request(`https://example.test${path}`, { ...options, headers });
}

describe('hosted API', () => {
  beforeEach(() => resetApiRuntimeState());

  it('exposes public health with dataset metadata', async () => {
    const response = await createApiHandler({ apiKeyHashes: KEY_CONFIG })(
      request('/api/v1/health')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.status).toBe('ok');
    expect(body.data.counts).toMatchObject({ countries: 250, states: 4963, cities: 147739 });
    expect(body.meta.dataVersion).toMatch(/^sha256:/);
    expect(body.meta.source.license.id).toBe('ODbL-1.0');
  });

  it('fails closed when an API key is absent or authentication is unconfigured', async () => {
    const configured = createApiHandler({ apiKeyHashes: KEY_CONFIG });
    const absent = await configured(new Request('https://example.test/api/v1/countries'));
    expect(absent.status).toBe(401);
    expect((await absent.json()).error.code).toBe('invalid_api_key');

    const unconfigured = await createApiHandler({ apiKeyHashes: '' })(
      new Request('https://example.test/api/v1/countries')
    );
    expect(unconfigured.status).toBe(503);
  });

  it('paginates and selects fields for countries', async () => {
    const response = await createApiHandler({ apiKeyHashes: KEY_CONFIG })(
      request('/api/v1/countries?q=turk&limit=5&fields=id,name,iso2')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toContainEqual({ id: 225, name: 'Türkiye', iso2: 'TR' });
    expect(body.meta.pagination.total).toBeGreaterThanOrEqual(1);
    expect(response.headers.get('x-data-version')).toBe(body.meta.dataVersion);
  });

  it('resolves all Türkiye provinces and filters places by province code', async () => {
    const handler = createApiHandler({ apiKeyHashes: KEY_CONFIG });
    const subdivisions = await handler(request('/api/v1/subdivisions?country=TR&limit=100'));
    const subdivisionsBody = await subdivisions.json();
    expect(subdivisionsBody.meta.pagination.total).toBe(81);

    const places = await handler(
      request('/api/v1/places?country=TR&subdivision=34&q=Kadikoy&limit=10')
    );
    const placesBody = await places.json();
    expect(placesBody.data).toContainEqual(
      expect.objectContaining({ name: 'Kadıköy', countryCode: 'TR', subdivisionCode: '34' })
    );
  });

  it('searches across entity types with country scoping', async () => {
    const response = await createApiHandler({ apiKeyHashes: KEY_CONFIG })(
      request('/api/v1/search?q=Kadikoy&country=TR&types=place&limit=10')
    );
    const body = await response.json();
    expect(body.data).toContainEqual(
      expect.objectContaining({
        canonicalId: 'csc:city:107863',
        entityType: 'city',
        name: 'Kadıköy',
        matchReason: 'canonical-exact',
        countryCode: 'TR',
        stateCode: '34',
      })
    );
  });

  it('reverse geocodes nearest centres with distance, confidence, and data version', async () => {
    const response = await createApiHandler({ apiKeyHashes: KEY_CONFIG })(
      request(
        '/api/v1/reverse?latitude=40.9811&longitude=29.0651&types=city,state,country&country=TR'
      )
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.centers.dataVersion).toMatch(/^sha256:/);
    expect(body.data.centers.results).toContainEqual(
      expect.objectContaining({
        entityType: 'city',
        confidenceBasis: 'center-distance',
        entity: expect.objectContaining({ id: 107863, name: 'Kadıköy' }),
      })
    );
  });

  it('uses versioned Türkiye polygons for admin-1/admin-2 containment', async () => {
    const response = await createApiHandler({ apiKeyHashes: KEY_CONFIG })(
      request(
        '/api/v1/reverse?latitude=40.981096&longitude=29.06514473&types=city&country=TR&polygon=true'
      )
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.polygons).toMatchObject({
      coverage: 'TR',
      province: { confidence: 'exact', matches: [{ properties: { stateCode: '34' } }] },
      district: { confidence: 'exact', matches: [{ properties: { name: 'Kadıköy' } }] },
    });
  });

  it('serves cache hits and honors If-None-Match', async () => {
    const handler = createApiHandler({ apiKeyHashes: KEY_CONFIG });
    const first = await handler(request('/api/v1/countries?limit=2'));
    const etag = first.headers.get('etag');
    expect(first.headers.get('x-cache')).toBe('MISS');

    const second = await handler(request('/api/v1/countries?limit=2'));
    expect(second.headers.get('x-cache')).toBe('HIT');

    const conditional = await handler(
      request('/api/v1/countries?limit=2', { headers: { 'if-none-match': etag || '' } })
    );
    expect(conditional.status).toBe(304);
  });

  it('enforces per-key rate limits', async () => {
    const handler = createApiHandler({ apiKeyHashes: KEY_CONFIG, rateLimitPerMinute: 2 });
    await handler(request('/api/v1/countries?offset=0'));
    await handler(request('/api/v1/countries?offset=1'));
    const limited = await handler(request('/api/v1/countries?offset=2'));
    expect(limited.status).toBe(429);
    expect((await limited.json()).error.code).toBe('rate_limit_exceeded');
  });

  it('executes GraphQL and attaches immutable dataset metadata', async () => {
    const response = await createApiHandler({ apiKeyHashes: KEY_CONFIG })(
      request('/api/graphql', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          query:
            '{ country(code: "TR") { name iso2 } subdivisions(country: "TR", limit: 2) { pageInfo { total } nodes { name stateCode } } }',
        }),
      })
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.country).toEqual({ name: 'Türkiye', iso2: 'TR' });
    expect(body.data.subdivisions.pageInfo.total).toBe(81);
    expect(body.extensions.meta.dataVersion).toMatch(/^sha256:/);
  });

  it('publishes an OpenAPI document and policy without authentication', async () => {
    const handler = createApiHandler({ apiKeyHashes: KEY_CONFIG });
    const openapi = await handler(request('/api/openapi.json'));
    expect((await openapi.json()).openapi).toBe('3.1.0');

    const subscriptions = await handler(request('/api/subscription-policy.json'));
    expect((await subscriptions.json()).channels.webhook.signature.algorithm).toBe('HMAC-SHA256');

    const policy = await handler(new Request('https://example.test/api/policy.json'));
    expect((await policy.json()).authentication.header).toBe('x-api-key');
  });

  it('emits structured logs without exposing raw keys or hashes', async () => {
    const log = vi.fn();
    await createApiHandler({ apiKeyHashes: KEY_CONFIG, log })(request('/api/v1/countries?limit=1'));
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: '/api/v1/countries', keyId: 'test' })
    );
    const serialized = JSON.stringify(log.mock.calls);
    expect(serialized).not.toContain(RAW_KEY);
    expect(serialized).not.toContain(hashApiKey(RAW_KEY));
  });
});
