import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { createBotIdentityVerifier } from '../src/modules/auth/bot-identity.js';
import type { CatalogRepository } from '../src/modules/catalog/catalog.repository.js';

const token = '123456:TEST_ONLY_TOKEN_NOT_A_REAL_CREDENTIAL';
const now = 1_780_000_000_000;
const body = {telegramId: '4503599627370495', username: 'schoolroom_user', name: 'Test User'};
const openApps: Awaited<ReturnType<typeof createApp>>[] = [];

afterEach(async () => { await Promise.all(openApps.splice(0).map((app) => app.close())); });

async function makeApp() {
  const upsert = vi.fn().mockResolvedValue('22222222-2222-4222-8222-222222222222');
  const catalog: CatalogRepository = {
    list: vi.fn(), findBySlug: vi.fn(), listPopular: vi.fn(), listFavorites: vi.fn(),
    addFavorite: vi.fn(), removeFavorite: vi.fn(),
  };
  const app = await createApp({
    catalogRepository: catalog,
    userRepository: {upsertTelegramUser: upsert},
    corsOrigins: [],
    developmentAuthEnabled: false,
    botIdentityVerifier: createBotIdentityVerifier({botToken: token, now: () => now}),
  });
  openApps.push(app);
  return {app, upsert};
}

function headers(payload = body, timestamp = String(now), botToken = token) {
  const key = createHmac('sha256', 'SchoolRoomBotIdentity').update(botToken).digest();
  return {
    'x-schoolroom-timestamp': timestamp,
    'x-schoolroom-signature': createHmac('sha256', key)
      .update(timestamp + '.' + JSON.stringify(payload)).digest('hex'),
  };
}

describe('Telegram bot identity registration', () => {
  it('persists the Telegram identity from a valid bot-signed request', async () => {
    const {app, upsert} = await makeApp();
    const response = await app.inject({
      method: 'POST', url: '/internal/v1/telegram/users', payload: body, headers: headers(),
    });
    expect(response.statusCode).toBe(204);
    expect(upsert).toHaveBeenCalledWith({
      telegramId: BigInt(body.telegramId), username: body.username, name: body.name, authDate: new Date(now),
    });
  });

  it('rejects stale, tampered and wrong-bot requests before writing', async () => {
    const {app, upsert} = await makeApp();
    const attempts = [
      {payload: body, headers: headers(body, String(now - 30_001))},
      {payload: {...body, name: 'Tampered'}, headers: headers()},
      {payload: body, headers: headers(body, String(now), 'different-bot-token')},
    ];
    for (const attempt of attempts) {
      const response = await app.inject({
        method: 'POST', url: '/internal/v1/telegram/users', ...attempt,
      });
      expect(response.statusCode).toBe(401);
      expect(response.body).not.toContain(token);
    }
    expect(upsert).not.toHaveBeenCalled();
  });
});
