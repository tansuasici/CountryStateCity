import type { AddressInfo } from 'node:net';

import { afterEach, describe, expect, it } from 'vitest';

import { createApiHandler, hashApiKey, resetApiRuntimeState } from '../handler';
import { apiConfigFromEnvironment, createNodeServer } from '../server';

const RAW_KEY = 'node-adapter-test-key';
const KEY_CONFIG = `test:${hashApiKey(RAW_KEY)}`;
const servers = new Set<ReturnType<typeof createNodeServer>>();

afterEach(async () => {
  await Promise.all(
    [...servers].map(
      (server) =>
        new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve()))
        )
    )
  );
  servers.clear();
  resetApiRuntimeState();
});

async function listen() {
  const server = createNodeServer({
    handler: createApiHandler({ apiKeyHashes: KEY_CONFIG, corsOrigin: 'https://example.test' }),
  });
  servers.add(server);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

describe('standalone Node API server', () => {
  it('serves public health and authenticated data over HTTP', async () => {
    const origin = await listen();
    const health = await fetch(`${origin}/api/v1/health`);
    expect(health.status).toBe(200);
    expect((await health.json()).data.counts.countries).toBe(250);

    const unauthorized = await fetch(`${origin}/api/v1/countries?limit=1`);
    expect(unauthorized.status).toBe(401);

    const authenticated = await fetch(`${origin}/api/v1/countries?limit=1`, {
      headers: { 'x-api-key': RAW_KEY },
    });
    expect(authenticated.status).toBe(200);
    expect(authenticated.headers.get('access-control-allow-origin')).toBe('https://example.test');
    expect((await authenticated.json()).data).toHaveLength(1);
  });

  it('maps production environment values into the standalone service configuration', () => {
    expect(
      apiConfigFromEnvironment({
        CSC_API_KEYS: KEY_CONFIG,
        CSC_RATE_LIMIT_PER_MINUTE: '250',
        CSC_CACHE_TTL_MS: '120000',
        CSC_CORS_ORIGIN: 'https://countrystatecity.tansuasici.com',
      })
    ).toEqual({
      apiKeyHashes: KEY_CONFIG,
      rateLimitPerMinute: 250,
      cacheTtlMs: 120000,
      corsOrigin: 'https://countrystatecity.tansuasici.com',
    });
  });

  it('rejects oversized request bodies before they reach the API handler', async () => {
    const server = createNodeServer({
      handler: createApiHandler({ apiKeyHashes: KEY_CONFIG }),
      maxBodyBytes: 16,
    });
    servers.add(server);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${port}/api/graphql`, {
      method: 'POST',
      headers: { 'x-api-key': RAW_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ query: '{ countries { name } }' }),
    });
    expect(response.status).toBe(413);
    expect((await response.json()).error.code).toBe('body_too_large');
  });
});
