import { describe, it, expect } from 'vitest';
import { callModel } from './managed-server';
import type { ManagedConfig } from './managed';

const cfg: ManagedConfig = {
  provider: 'test',
  endpoint: 'https://example.test/v1/chat/completions',
  model: 'gpt-4o-mini',
  key: 'k',
  timeoutMs: 50,
  maxRetries: 2,
  rpmPerClient: 10,
  dailyCostCapUsd: 1,
};

const okBody = () =>
  JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }], usage: { prompt_tokens: 10, completion_tokens: 5 } });

describe('callModel', () => {
  it('returns usage-based cost and zero retries on success', async () => {
    const calls: number[] = [];
    const r = await callModel(cfg, 'sys', 'user', {
      fetchImpl: (async () => {
        calls.push(1);
        return new Response(okBody(), { status: 200 });
      }) as typeof fetch,
      sleep: async () => {},
      now: () => 0,
    });
    expect(calls.length).toBe(1);
    expect(r.usage).toEqual({ inputTokens: 10, outputTokens: 5 });
    expect(r.costUsd).toBeCloseTo((10 * 0.15 + 5 * 0.6) / 1_000_000);
    expect(r.retries).toBe(0);
  });

  it('retries on 500 then succeeds, counting the retry', async () => {
    let n = 0;
    const r = await callModel(cfg, 'sys', 'user', {
      fetchImpl: (async () => {
        n++;
        return n === 1 ? new Response('boom', { status: 500 }) : new Response(okBody(), { status: 200 });
      }) as typeof fetch,
      sleep: async () => {},
      now: () => 0,
    });
    expect(n).toBe(2);
    expect(r.retries).toBe(1);
  });

  it('does NOT retry a 400 and throws with the status preserved', async () => {
    let n = 0;
    await expect(
      callModel(cfg, 'sys', 'user', {
        fetchImpl: (async () => {
          n++;
          return new Response('bad', { status: 400 });
        }) as typeof fetch,
        sleep: async () => {},
      }),
    ).rejects.toThrow('http 400');
    expect(n).toBe(1);
  });

  it('gives up after the retry budget on persistent 429', async () => {
    let n = 0;
    await expect(
      callModel(cfg, 'sys', 'user', {
        fetchImpl: (async () => {
          n++;
          return new Response('slow down', { status: 429 });
        }) as typeof fetch,
        sleep: async () => {},
      }),
    ).rejects.toThrow('http 429');
    expect(n).toBe(3); // initial + 2 retries
  });

  it('retries network failures', async () => {
    let n = 0;
    const r = await callModel(cfg, 'sys', 'user', {
      fetchImpl: (async () => {
        n++;
        if (n === 1) throw new TypeError('fetch failed');
        return new Response(okBody(), { status: 200 });
      }) as typeof fetch,
      sleep: async () => {},
      now: () => 0,
    });
    expect(n).toBe(2);
    expect(r.retries).toBe(1);
  });
});
