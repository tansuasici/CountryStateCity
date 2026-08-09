import { describe, expect, it, vi } from 'vitest';

import { deliverWebhook, signWebhook, verifyWebhook, type ReleaseWebhookEvent } from '../webhooks';

const event: ReleaseWebhookEvent = {
  id: 'evt_2.0.15',
  type: 'data.release.published',
  createdAt: '2026-08-08T00:00:00.000Z',
  fromVersion: '2.0.14',
  toVersion: '2.0.15',
  dataVersion: 'sha256:test',
  summaryUrl: '/data/versions/2.0.14...2.0.15/summary.json',
};

describe('release webhooks', () => {
  it('signs the timestamp and exact raw body and rejects tampering/stale delivery', () => {
    const timestamp = 1_786_147_200;
    const rawBody = JSON.stringify(event);
    const signature = signWebhook(rawBody, 'secret', timestamp);
    expect(verifyWebhook(rawBody, 'secret', timestamp, signature, { now: timestamp * 1000 })).toBe(
      true
    );
    expect(
      verifyWebhook(`${rawBody} `, 'secret', timestamp, signature, { now: timestamp * 1000 })
    ).toBe(false);
    expect(
      verifyWebhook(rawBody, 'secret', timestamp, signature, { now: (timestamp + 301) * 1000 })
    ).toBe(false);
  });

  it('retries transient failures with a stable event id and succeeds', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(new Response(null, { status: 429 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const sleep = vi.fn(async () => undefined);
    const result = await deliverWebhook('https://consumer.example/webhook', event, {
      secret: 'secret',
      fetch: fetcher,
      sleep,
      retryDelaysMs: [0, 1, 10],
      now: () => 1_786_147_200_000,
    });
    expect(result).toMatchObject({ delivered: true, deadLetter: false });
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
    for (const call of fetcher.mock.calls) {
      expect(new Headers(call[1]?.headers).get('x-csc-event-id')).toBe(event.id);
    }
  });

  it('does not retry terminal client errors and dead-letters exhausted transient errors', async () => {
    const terminal = await deliverWebhook('https://consumer.example/webhook', event, {
      secret: 'secret',
      fetch: vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 400 })),
      retryDelaysMs: [0, 1],
      sleep: async () => undefined,
    });
    expect(terminal).toMatchObject({ delivered: false, deadLetter: false });
    expect(terminal.attempts).toHaveLength(1);

    const exhausted = await deliverWebhook('https://consumer.example/webhook', event, {
      secret: 'secret',
      fetch: vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 503 })),
      retryDelaysMs: [0, 1, 2],
      sleep: async () => undefined,
    });
    expect(exhausted).toMatchObject({ delivered: false, deadLetter: true });
    expect(exhausted.attempts).toHaveLength(3);
  });
});
