import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import path from 'node:path';

import { createApiHandler, type ApiConfig } from './handler';

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 5310;
const DEFAULT_MAX_BODY_BYTES = 65_536;

export interface NodeServerOptions {
  handler?: (request: Request) => Promise<Response>;
  maxBodyBytes?: number;
}

class RequestBodyTooLargeError extends Error {}

function positiveInteger(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}

export function apiConfigFromEnvironment(environment: NodeJS.ProcessEnv = process.env): ApiConfig {
  return {
    apiKeyHashes: environment.CSC_API_KEYS,
    rateLimitPerMinute: positiveInteger(
      environment.CSC_RATE_LIMIT_PER_MINUTE,
      100,
      'CSC_RATE_LIMIT_PER_MINUTE'
    ),
    cacheTtlMs: positiveInteger(environment.CSC_CACHE_TTL_MS, 60_000, 'CSC_CACHE_TTL_MS'),
    corsOrigin: environment.CSC_CORS_ORIGIN || '*',
  };
}

async function requestBody(request: IncomingMessage, maxBodyBytes: number) {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.byteLength;
    if (bytes > maxBodyBytes) throw new RequestBodyTooLargeError();
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

async function toFetchRequest(request: IncomingMessage, maxBodyBytes: number): Promise<Request> {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) headers.set(name, value.join(','));
    else if (value !== undefined) headers.set(name, value);
  }

  const protocol = headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'http';
  const host = headers.get('host') || 'localhost';
  const method = (request.method || 'GET').toUpperCase();
  const body = ['GET', 'HEAD'].includes(method)
    ? undefined
    : await requestBody(request, maxBodyBytes);

  return new Request(new URL(request.url || '/', `${protocol}://${host}`), {
    method,
    headers,
    body,
  });
}

async function sendFetchResponse(response: Response, target: ServerResponse) {
  target.statusCode = response.status;
  response.headers.forEach((value, name) => target.setHeader(name, value));
  target.end(Buffer.from(await response.arrayBuffer()));
}

function errorResponse(status: number, code: string, message: string) {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export function createNodeServer(options: NodeServerOptions = {}): Server {
  const handler = options.handler || createApiHandler(apiConfigFromEnvironment());
  const maxBodyBytes = options.maxBodyBytes || DEFAULT_MAX_BODY_BYTES;

  return createServer(async (request, response) => {
    try {
      await sendFetchResponse(await handler(await toFetchRequest(request, maxBodyBytes)), response);
    } catch (error) {
      const fetchResponse =
        error instanceof RequestBodyTooLargeError
          ? errorResponse(413, 'body_too_large', `Request body exceeds ${maxBodyBytes} bytes.`)
          : errorResponse(500, 'internal_error', 'An internal error occurred.');
      await sendFetchResponse(fetchResponse, response);
    }
  });
}

export async function startServer(environment: NodeJS.ProcessEnv = process.env) {
  if (!environment.CSC_API_KEYS?.trim()) {
    throw new Error('CSC_API_KEYS is required; refusing to start an unauthenticated API service.');
  }

  const host = environment.CSC_API_HOST || DEFAULT_HOST;
  const port = positiveInteger(environment.CSC_API_PORT, DEFAULT_PORT, 'CSC_API_PORT');
  const maxBodyBytes = positiveInteger(
    environment.CSC_MAX_BODY_BYTES,
    DEFAULT_MAX_BODY_BYTES,
    'CSC_MAX_BODY_BYTES'
  );
  const server = createNodeServer({
    handler: createApiHandler(apiConfigFromEnvironment(environment)),
    maxBodyBytes,
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });
  console.info(JSON.stringify({ event: 'server_started', host, port }));

  const shutdown = (signal: string) => {
    console.info(JSON.stringify({ event: 'server_stopping', signal }));
    server.close((error) => {
      if (error) {
        console.error(error);
        process.exitCode = 1;
      }
    });
  };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
  return server;
}

if (process.argv[1] && ['server.ts', 'server.mjs'].includes(path.basename(process.argv[1]))) {
  startServer().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
