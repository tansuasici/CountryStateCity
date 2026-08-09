import { createHmac, timingSafeEqual } from 'node:crypto';

export interface ReleaseWebhookEvent {
  id: string;
  type: 'data.release.published';
  createdAt: string;
  fromVersion: string;
  toVersion: string;
  dataVersion: string;
  summaryUrl: string;
}

export interface WebhookDeliveryOptions {
  secret: string;
  fetch?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
  retryDelaysMs?: number[];
  now?: () => number;
}

export function signWebhook(rawBody: string, secret: string, timestamp: number): string {
  if (!secret) throw new Error('Webhook secret is required.');
  return `v1=${createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')}`;
}

export function verifyWebhook(
  rawBody: string,
  secret: string,
  timestamp: number,
  signature: string,
  options: { now?: number; toleranceSeconds?: number } = {}
): boolean {
  const now = options.now ?? Date.now();
  const tolerance = (options.toleranceSeconds ?? 300) * 1000;
  if (!Number.isFinite(timestamp) || Math.abs(now - timestamp * 1000) > tolerance) return false;
  const expected = Buffer.from(signWebhook(rawBody, secret, timestamp));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function deliverWebhook(
  url: string,
  event: ReleaseWebhookEvent,
  options: WebhookDeliveryOptions
) {
  const fetcher = options.fetch || fetch;
  const sleep =
    options.sleep ||
    ((milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const delays = options.retryDelaysMs || [0, 1_000, 10_000, 60_000, 600_000, 3_600_000];
  const rawBody = JSON.stringify(event);
  const attempts: Array<{ attempt: number; status: number | null; retryable: boolean }> = [];

  for (let index = 0; index < delays.length; index += 1) {
    if (delays[index] > 0) await sleep(delays[index]);
    const timestamp = Math.floor((options.now?.() ?? Date.now()) / 1000);
    try {
      const response = await fetcher(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'user-agent': 'CountryStateCity-Webhook/1.0',
          'x-csc-event-id': event.id,
          'x-csc-event-type': event.type,
          'x-csc-timestamp': String(timestamp),
          'x-csc-signature': signWebhook(rawBody, options.secret, timestamp),
        },
        body: rawBody,
      });
      const retryable =
        response.status === 408 || response.status === 429 || response.status >= 500;
      attempts.push({ attempt: index + 1, status: response.status, retryable });
      if (response.ok) return { delivered: true, deadLetter: false, attempts };
      if (!retryable) return { delivered: false, deadLetter: false, attempts };
    } catch {
      attempts.push({ attempt: index + 1, status: null, retryable: true });
    }
  }

  return { delivered: false, deadLetter: true, attempts };
}
