import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { createTelegramInitDataVerifier } from '../src/modules/auth/telegram-init-data.js';
import type { CatalogRepository } from '../src/modules/catalog/catalog.repository.js';

const token = '123456:TEST_ONLY_TOKEN_NOT_A_REAL_CREDENTIAL';
const now = new Date('2026-09-06T00:00:00Z');
const id = 4503599627370495;
const date = Math.floor(now.getTime() / 1000);
const openApps: Awaited<ReturnType<typeof createApp>>[] = [];
afterEach(async () => {await Promise.all(openApps.splice(0).map((app) => app.close()));});
function sign(authDate = date, botToken = token) {
  const params = new URLSearchParams({auth_date: String(authDate), user: JSON.stringify({id, first_name: 'Test'}), signature: 'signed-third-party-field'});
  params.sort();
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  params.set('hash', createHmac('sha256', secret).update([...params].map(([key, value]) => `${key}=${value}`).join('\n')).digest('hex'));
  return params.toString();
}
async function makeApp(developmentAuthEnabled = false) {
  const upsert = vi.fn().mockResolvedValue('22222222-2222-4222-8222-222222222222');
  const catalog: CatalogRepository = {list: vi.fn(), findBySlug: vi.fn(), listPopular: vi.fn(), listFavorites: vi.fn(), addFavorite: vi.fn(), removeFavorite: vi.fn()};
  const app = await createApp({catalogRepository: catalog, userRepository: {upsertTelegramUser: upsert}, corsOrigins: [], developmentAuthEnabled,
    telegramInitDataVerifier: createTelegramInitDataVerifier({botToken: token, maxAgeSeconds: 3600, now: () => now})});
  openApps.push(app);
  return {app, upsert};
}
describe('current Telegram user', () => {
  it('verifies real HMAC before persisting identity and returns a string Telegram ID', async () => {
    const {app, upsert} = await makeApp();
    const response = await app.inject({url: '/api/v1/me', headers: {authorization: `tma ${sign()}`}});
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({user: {id: '22222222-2222-4222-8222-222222222222', telegramId: String(id), name: 'Test', username: null}});
    expect(upsert.mock.calls[0]?.[0].telegramId).toBe(BigInt(id));
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.body).not.toContain('signature');
  });
  it('rejects expired, future, tampered, duplicate, and wrong-bot signatures before any database write', async () => {
    const {app, upsert} = await makeApp(true);
    for (const raw of [sign(date - 3601), sign(date + 31), sign().replace('Test', 'Forged'), `${sign()}&user=%7B%7D`, sign(date, 'different-bot-token')]) {
      const response = await app.inject({url: '/api/v1/me', headers: {authorization: `tma ${raw}`, 'x-dev-telegram-user-id': '100000001'}});
      expect(response.statusCode).toBe(401);
      expect(response.headers['cache-control']).toBe('private, no-store');
    }
    expect(upsert).not.toHaveBeenCalled();
  });
  it('rejects client-supplied IDs and disabled development headers', async () => {
    const {app, upsert} = await makeApp();
    expect((await app.inject({url: '/api/v1/me?telegramId=100000001', headers: {'x-dev-telegram-user-id': '100000001'}})).statusCode).toBe(401);
    expect(upsert).not.toHaveBeenCalled();
  });
  it('rejects zero and unsafe development IDs even when development auth is enabled', async () => {
    const {app, upsert} = await makeApp(true);
    for (const value of ['0', '0001', '9007199254740992']) {
      expect((await app.inject({url: '/api/v1/me', headers: {'x-dev-telegram-user-id': value}})).statusCode).toBe(401);
    }
    expect(upsert).not.toHaveBeenCalled();
  });
});
