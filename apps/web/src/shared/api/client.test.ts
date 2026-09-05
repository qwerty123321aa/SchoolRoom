import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { apiRequest } from './client.js';

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(window, 'Telegram');
});

function mockResponse(payload: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(
      () =>
        Promise.resolve(
          new Response(JSON.stringify(payload), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
    ),
  );
}

describe('API authentication headers', () => {
  it('sends raw Telegram init data only for authenticated requests', async () => {
    Object.defineProperty(window, 'Telegram', {
      configurable: true,
      value: { WebApp: { initData: 'query_id=abc&hash=signed' } },
    });
    mockResponse({ ok: true });

    await apiRequest('/private', z.object({ ok: z.boolean() }), {
      authenticated: true,
    });
    const [, privateInit] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(new Headers(privateInit?.headers).get('Authorization')).toBe(
      'tma query_id=abc&hash=signed',
    );

    await apiRequest('/public', z.object({ ok: z.boolean() }));
    const [, publicInit] = vi.mocked(fetch).mock.calls[1] ?? [];
    expect(new Headers(publicInit?.headers).has('Authorization')).toBe(false);
  });

  it('never trusts initDataUnsafe for authentication', async () => {
    Object.defineProperty(window, 'Telegram', {
      configurable: true,
      value: { WebApp: { initData: '', initDataUnsafe: { user: { id: 42 } } } },
    });
    mockResponse({ ok: true });

    await apiRequest('/private', z.object({ ok: z.boolean() }), {
      authenticated: true,
    });
    const [, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(new Headers(init?.headers).has('Authorization')).toBe(false);
  });
});
