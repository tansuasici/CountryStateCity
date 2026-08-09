import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';

import { dataMetadata, dataStore } from './data-store';
import { executeGraphql } from './graphql';
import { PolygonLookupIndex } from '../../countrystatecity-npm/src/reverse-geocoding';
import type {
  CoordinatePoint,
  GeoJsonFeatureCollection,
  NearestCenterOptions,
  NearestEntityType,
} from '../../countrystatecity-npm/src/types';

type LogEvent = {
  requestId: string;
  method: string;
  endpoint: string;
  status: number;
  durationMs: number;
  cache: 'HIT' | 'MISS' | 'BYPASS';
  keyId: string;
};

export interface ApiConfig {
  apiKeyHashes?: string;
  rateLimitPerMinute?: number;
  cacheTtlMs?: number;
  corsOrigin?: string;
  log?: (event: LogEvent) => void;
  now?: () => number;
}

type CacheEntry = { body: string; etag: string; expiresAt: number; status: number };
type RateEntry = { count: number; resetAt: number };

const responseCache = new Map<string, CacheEntry>();
const rateWindows = new Map<string, RateEntry>();
let turkeyPolygonIndexes:
  | Promise<{
      provinces: PolygonLookupIndex<Record<string, unknown>>;
      districts: PolygonLookupIndex<Record<string, unknown>>;
    }>
  | undefined;

export function hashApiKey(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function resetApiRuntimeState(): void {
  responseCache.clear();
  rateWindows.clear();
}

function metadata(extra: Record<string, unknown> = {}) {
  return {
    apiVersion: 'v1',
    dataVersion: dataMetadata.dataVersion,
    source: dataMetadata.source,
    ...extra,
  };
}

function parseKeyHashes(value: string): Array<{ id: string; hash: Buffer }> {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .flatMap((entry) => {
      const separator = entry.indexOf(':');
      if (separator < 1) return [];
      const id = entry.slice(0, separator);
      const hash = entry.slice(separator + 1);
      return /^[a-f\d]{64}$/i.test(hash) ? [{ id, hash: Buffer.from(hash, 'hex') }] : [];
    });
}

function authenticate(request: Request, configuredHashes: string): string | null {
  const provided = request.headers.get('x-api-key');
  if (!provided) return null;
  const providedHash = Buffer.from(hashApiKey(provided), 'hex');
  for (const candidate of parseKeyHashes(configuredHashes)) {
    if (timingSafeEqual(providedHash, candidate.hash)) return candidate.id;
  }
  return null;
}

function selectFields(records: Array<Record<string, unknown>>, fieldsValue: string | null) {
  if (!fieldsValue) return records;
  const fields = [
    ...new Set(
      fieldsValue
        .split(',')
        .map((field) => field.trim())
        .filter(Boolean)
    ),
  ];
  if (!fields.length) throw new ApiError(400, 'invalid_fields', 'At least one field is required.');
  const allowed = new Set(records.flatMap((record) => Object.keys(record)));
  const unknown = fields.filter((field) => !allowed.has(field));
  if (unknown.length) {
    throw new ApiError(400, 'invalid_fields', `Unknown fields: ${unknown.join(', ')}`);
  }
  return records.map((record) =>
    Object.fromEntries(
      fields.filter((field) => field in record).map((field) => [field, record[field]])
    )
  );
}

function pagination(url: URL, total: number) {
  const parsedLimit = Number(url.searchParams.get('limit') || 25);
  const parsedOffset = Number(url.searchParams.get('offset') || 0);
  if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
    throw new ApiError(400, 'invalid_limit', 'limit must be an integer between 1 and 100.');
  }
  if (!Number.isInteger(parsedOffset) || parsedOffset < 0) {
    throw new ApiError(400, 'invalid_offset', 'offset must be a non-negative integer.');
  }
  return {
    limit: parsedLimit,
    offset: parsedOffset,
    total,
    hasMore: parsedOffset + parsedLimit < total,
  };
}

class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

function jsonResponse(
  body: unknown,
  status: number,
  headers: Headers,
  cacheStatus: 'HIT' | 'MISS' | 'BYPASS'
): Response {
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('X-Cache', cacheStatus);
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers });
}

function baseHeaders(requestId: string, corsOrigin: string): Headers {
  return new Headers({
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'content-type,x-api-key,if-none-match',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Expose-Headers':
      'etag,x-cache,x-data-version,x-ratelimit-limit,x-ratelimit-remaining,x-ratelimit-reset,server-timing',
    'X-Content-Type-Options': 'nosniff',
    'X-Data-Version': dataMetadata.dataVersion,
    'X-Request-Id': requestId,
  });
}

function cacheableResponse(
  request: Request,
  body: unknown,
  status: number,
  headers: Headers,
  cacheKey: string,
  now: number,
  ttl: number
): Response {
  const serialized = JSON.stringify(body);
  const etag = `"${createHash('sha256').update(serialized).digest('base64url')}"`;
  headers.set('ETag', etag);
  headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
  responseCache.set(cacheKey, { body: serialized, etag, expiresAt: now + ttl, status });
  if (request.headers.get('if-none-match') === etag)
    return new Response(null, { status: 304, headers });
  return jsonResponse(serialized, status, headers, 'MISS');
}

function getCached(
  request: Request,
  cacheKey: string,
  now: number,
  headers: Headers
): Response | null {
  const cached = responseCache.get(cacheKey);
  if (!cached || cached.expiresAt <= now) {
    if (cached) responseCache.delete(cacheKey);
    return null;
  }
  headers.set('ETag', cached.etag);
  headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
  if (request.headers.get('if-none-match') === cached.etag) {
    headers.set('X-Cache', 'HIT');
    return new Response(null, { status: 304, headers });
  }
  return jsonResponse(cached.body, cached.status, headers, 'HIT');
}

function paginateRecords(url: URL, records: Array<Record<string, unknown>>) {
  const page = pagination(url, records.length);
  const nodes = records.slice(page.offset, page.offset + page.limit);
  return { nodes: selectFields(nodes, url.searchParams.get('fields')), page };
}

function parseReverseOptions(url: URL): NearestCenterOptions {
  const supported = new Set<NearestEntityType>(['country', 'state', 'city', 'district']);
  const entityTypes = (url.searchParams.get('types') || 'country,state,city')
    .split(',')
    .filter(Boolean) as NearestEntityType[];
  if (!entityTypes.length || entityTypes.some((type) => !supported.has(type))) {
    throw new ApiError(
      400,
      'invalid_types',
      'types may contain country, state, city, and district.'
    );
  }
  const limitPerType = Number(url.searchParams.get('limitPerType') || 1);
  const maximum = url.searchParams.get('maxDistanceKm');
  const maxDistanceKm = maximum === null ? undefined : Number(maximum);
  return {
    entityTypes,
    countryCode: url.searchParams.get('country') || undefined,
    limitPerType,
    maxDistanceKm,
  };
}

function parsePoint(value: { latitude?: unknown; longitude?: unknown }): CoordinatePoint {
  if (
    value.latitude === null ||
    value.latitude === undefined ||
    value.longitude === null ||
    value.longitude === undefined
  ) {
    throw new ApiError(
      400,
      'invalid_coordinate',
      'latitude and longitude must be valid WGS84 coordinates.'
    );
  }
  const point = { latitude: Number(value.latitude), longitude: Number(value.longitude) };
  if (
    !Number.isFinite(point.latitude) ||
    point.latitude < -90 ||
    point.latitude > 90 ||
    !Number.isFinite(point.longitude) ||
    point.longitude < -180 ||
    point.longitude > 180
  ) {
    throw new ApiError(
      400,
      'invalid_coordinate',
      'latitude and longitude must be valid WGS84 coordinates.'
    );
  }
  return point;
}

async function getTurkeyPolygonIndexes() {
  if (!turkeyPolygonIndexes) {
    turkeyPolygonIndexes = (async () => {
      const dataRoot = process.env.CSC_DATA_DIR || `${process.cwd()}/data`;
      const { readFile } = await import('node:fs/promises');
      const [provinceText, districtText] = await Promise.all([
        readFile(`${dataRoot}/boundaries/tr/turkey-provinces.geojson`, 'utf8'),
        readFile(`${dataRoot}/boundaries/tr/turkey-districts.geojson`, 'utf8'),
      ]);
      return {
        provinces: new PolygonLookupIndex(
          JSON.parse(provinceText) as GeoJsonFeatureCollection<Record<string, unknown>>
        ),
        districts: new PolygonLookupIndex(
          JSON.parse(districtText) as GeoJsonFeatureCollection<Record<string, unknown>>
        ),
      };
    })();
  }
  return turkeyPolygonIndexes;
}

async function route(
  request: Request,
  url: URL
): Promise<{ body: unknown; status?: number; cacheable?: boolean }> {
  const path = url.pathname.replace(/\/+$/, '') || '/';
  if (path === '/api' && request.method === 'GET') {
    return {
      body: {
        data: {
          name: 'CountryStateCity Hosted API',
          version: 'v1',
          documentation: '/docs/hosted-api',
          openapi: '/api/openapi.json',
          graphql: '/api/graphql',
        },
        meta: metadata(),
      },
    };
  }
  if (path === '/api/v1/health' && request.method === 'GET') {
    return {
      body: {
        data: { status: 'ok', counts: dataMetadata.counts, generatedAt: dataMetadata.generatedAt },
        meta: metadata(),
      },
    };
  }
  if (path === '/api/openapi.json' && request.method === 'GET') {
    const dataRoot = process.env.CSC_DATA_DIR || `${process.cwd()}/data`;
    const { readFile } = await import('node:fs/promises');
    return { body: JSON.parse(await readFile(`${dataRoot}/api/openapi.json`, 'utf8')) };
  }
  if (path === '/api/policy.json' && request.method === 'GET') {
    const dataRoot = process.env.CSC_DATA_DIR || `${process.cwd()}/data`;
    const { readFile } = await import('node:fs/promises');
    return { body: JSON.parse(await readFile(`${dataRoot}/api/policy.json`, 'utf8')) };
  }
  if (path === '/api/subscription-policy.json' && request.method === 'GET') {
    const dataRoot = process.env.CSC_DATA_DIR || `${process.cwd()}/data`;
    const { readFile } = await import('node:fs/promises');
    return {
      body: JSON.parse(await readFile(`${dataRoot}/subscriptions/policy.json`, 'utf8')),
    };
  }
  if (path === '/api/v1/countries' && request.method === 'GET') {
    const records = dataStore.countries(url.searchParams.get('q') || undefined);
    const { nodes, page } = paginateRecords(url, records);
    return { body: { data: nodes, meta: metadata({ pagination: page }) }, cacheable: true };
  }
  const countryMatch = path.match(/^\/api\/v1\/countries\/([^/]+)$/);
  if (countryMatch && request.method === 'GET') {
    const country = dataStore.country(decodeURIComponent(countryMatch[1]));
    if (!country) throw new ApiError(404, 'country_not_found', 'Country was not found.');
    return { body: { data: country, meta: metadata() }, cacheable: true };
  }
  if (path === '/api/v1/subdivisions' && request.method === 'GET') {
    const country = url.searchParams.get('country');
    if (!country) throw new ApiError(400, 'country_required', 'country is required.');
    if (!dataStore.country(country))
      throw new ApiError(404, 'country_not_found', 'Country was not found.');
    const records = dataStore.subdivisions(country, url.searchParams.get('q') || undefined);
    const { nodes, page } = paginateRecords(url, records);
    return { body: { data: nodes, meta: metadata({ pagination: page }) }, cacheable: true };
  }
  if (path === '/api/v1/places' && request.method === 'GET') {
    const country = url.searchParams.get('country');
    if (!country) throw new ApiError(400, 'country_required', 'country is required.');
    if (!dataStore.country(country))
      throw new ApiError(404, 'country_not_found', 'Country was not found.');
    const records = dataStore.places(
      country,
      url.searchParams.get('subdivision') || undefined,
      url.searchParams.get('q') || undefined
    );
    const { nodes, page } = paginateRecords(url, records);
    return { body: { data: nodes, meta: metadata({ pagination: page }) }, cacheable: true };
  }
  if (path === '/api/v1/search' && request.method === 'GET') {
    const query = url.searchParams.get('q')?.trim();
    if (!query || query.length < 2)
      throw new ApiError(400, 'query_too_short', 'q must contain at least 2 characters.');
    const types = url.searchParams.get('types')?.split(',').filter(Boolean);
    const supported = new Set(['country', 'subdivision', 'place', 'district']);
    if (types?.some((type) => !supported.has(type))) {
      throw new ApiError(
        400,
        'invalid_types',
        'types may contain country, subdivision, place, and district.'
      );
    }
    const records = dataStore.search(query, {
      country: url.searchParams.get('country') || undefined,
      subdivision: url.searchParams.get('subdivision') || undefined,
      types,
    });
    const { nodes, page } = paginateRecords(url, records);
    return { body: { data: nodes, meta: metadata({ pagination: page }) }, cacheable: true };
  }
  if (path === '/api/v1/reverse' && request.method === 'GET') {
    const point = parsePoint({
      latitude: url.searchParams.get('latitude'),
      longitude: url.searchParams.get('longitude'),
    });
    const centers = dataStore.reverse(point, parseReverseOptions(url));
    let polygons: Record<string, unknown> | null = null;
    if (url.searchParams.get('polygon') === 'true') {
      const indexes = await getTurkeyPolygonIndexes();
      polygons = {
        coverage: 'TR',
        province: indexes.provinces.locate(point),
        district: indexes.districts.locate(point),
      };
    }
    return { body: { data: { centers, polygons }, meta: metadata() }, cacheable: true };
  }
  if (path === '/api/v1/reverse/batch' && request.method === 'POST') {
    const length = Number(request.headers.get('content-length') || 0);
    if (length > 131_072)
      throw new ApiError(413, 'body_too_large', 'Request body exceeds 128 KiB.');
    let payload: {
      points?: Array<{ latitude?: unknown; longitude?: unknown }>;
      options?: NearestCenterOptions;
    };
    try {
      const raw = await request.text();
      if (raw.length > 131_072)
        throw new ApiError(413, 'body_too_large', 'Request body exceeds 128 KiB.');
      payload = JSON.parse(raw) as typeof payload;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(400, 'invalid_json', 'Request body must be valid JSON.');
    }
    if (!Array.isArray(payload.points) || !payload.points.length) {
      throw new ApiError(400, 'points_required', 'points must be a non-empty array.');
    }
    if (payload.points.length > 1_000) {
      throw new ApiError(
        400,
        'batch_too_large',
        'Hosted API batches may contain at most 1,000 points.'
      );
    }
    const points = payload.points.map(parsePoint);
    const results = dataStore.reverseBatch(points, payload.options || {});
    return { body: { data: results, meta: metadata() } };
  }
  if (path === '/api/graphql' && request.method === 'POST') {
    const length = Number(request.headers.get('content-length') || 0);
    if (length > 32_768) throw new ApiError(413, 'body_too_large', 'Request body exceeds 32 KiB.');
    let payload: { query?: string; variables?: Record<string, unknown> };
    try {
      const raw = await request.text();
      if (raw.length > 32_768)
        throw new ApiError(413, 'body_too_large', 'Request body exceeds 32 KiB.');
      payload = JSON.parse(raw) as typeof payload;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(400, 'invalid_json', 'Request body must be valid JSON.');
    }
    if (!payload.query) throw new ApiError(400, 'query_required', 'GraphQL query is required.');
    const result = await executeGraphql(payload.query, payload.variables);
    return {
      body: { ...result, extensions: { ...result.extensions, meta: metadata() } },
      status: result.errors?.length ? 400 : 200,
      cacheable: !result.errors?.length,
    };
  }
  if (path.startsWith('/api/')) throw new ApiError(404, 'not_found', 'API route was not found.');
  throw new ApiError(404, 'not_found', 'Route was not found.');
}

const PUBLIC_PATHS = new Set([
  '/api',
  '/api/v1/health',
  '/api/openapi.json',
  '/api/policy.json',
  '/api/subscription-policy.json',
]);

export function createApiHandler(config: ApiConfig = {}) {
  const nowFn = config.now || Date.now;
  const log = config.log || ((event: LogEvent) => console.info(JSON.stringify(event)));
  const corsOrigin = config.corsOrigin || '*';
  const rateLimit = config.rateLimitPerMinute || 100;
  const cacheTtlMs = config.cacheTtlMs || 60_000;

  return async function handle(request: Request): Promise<Response> {
    const startedAt = nowFn();
    const requestId = randomUUID();
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const headers = baseHeaders(requestId, corsOrigin);
    let keyId = 'public';
    let cache: LogEvent['cache'] = 'BYPASS';
    let response: Response;

    try {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
      if (!['GET', 'POST'].includes(request.method)) {
        throw new ApiError(405, 'method_not_allowed', 'Only GET, POST, and OPTIONS are supported.');
      }

      if (!PUBLIC_PATHS.has(path)) {
        const hashes = config.apiKeyHashes ?? process.env.CSC_API_KEYS ?? '';
        if (!hashes)
          throw new ApiError(
            503,
            'authentication_not_configured',
            'API authentication is not configured.'
          );
        const authenticatedId = authenticate(request, hashes);
        if (!authenticatedId)
          throw new ApiError(401, 'invalid_api_key', 'A valid x-api-key header is required.');
        keyId = authenticatedId;

        const now = nowFn();
        const current = rateWindows.get(keyId);
        const window =
          !current || current.resetAt <= now ? { count: 0, resetAt: now + 60_000 } : current;
        window.count += 1;
        rateWindows.set(keyId, window);
        headers.set('X-RateLimit-Limit', String(rateLimit));
        headers.set('X-RateLimit-Remaining', String(Math.max(0, rateLimit - window.count)));
        headers.set('X-RateLimit-Reset', String(Math.ceil(window.resetAt / 1000)));
        if (window.count > rateLimit)
          throw new ApiError(429, 'rate_limit_exceeded', 'Rate limit exceeded.');
      }

      const bodyForCache = request.method === 'POST' ? await request.clone().text() : '';
      const cacheKey = `${request.method}:${url.toString()}:${bodyForCache}:${dataMetadata.dataVersion}`;
      if (request.method === 'GET' || path === '/api/graphql') {
        const cached = getCached(request, cacheKey, nowFn(), headers);
        if (cached) {
          cache = 'HIT';
          response = cached;
        } else {
          const result = await route(request, url);
          if (result.cacheable) {
            cache = 'MISS';
            response = cacheableResponse(
              request,
              result.body,
              result.status || 200,
              headers,
              cacheKey,
              nowFn(),
              cacheTtlMs
            );
          } else {
            response = jsonResponse(result.body, result.status || 200, headers, cache);
          }
        }
      } else {
        const result = await route(request, url);
        response = jsonResponse(result.body, result.status || 200, headers, cache);
      }
    } catch (error) {
      const apiError =
        error instanceof ApiError
          ? error
          : new ApiError(500, 'internal_error', 'An internal error occurred.');
      response = jsonResponse(
        { error: { code: apiError.code, message: apiError.message }, meta: metadata() },
        apiError.status,
        headers,
        'BYPASS'
      );
    }

    const durationMs = Math.max(0, nowFn() - startedAt);
    response.headers.set('Server-Timing', `app;dur=${durationMs}`);
    log({
      requestId,
      method: request.method,
      endpoint: path,
      status: response.status,
      durationMs,
      cache,
      keyId,
    });
    return response;
  };
}

export const handleApiRequest = createApiHandler();
