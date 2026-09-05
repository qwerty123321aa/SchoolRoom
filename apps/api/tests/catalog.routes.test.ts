import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type {
  CatalogProjectRecord,
  CatalogRepository,
} from '../src/modules/catalog/catalog.repository.js';
import type { UserRepository } from '../src/modules/auth/auth.repository.js';
import type { TelegramInitDataVerifier } from '../src/modules/auth/telegram-init-data.js';

const project: CatalogProjectRecord = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'finansovaya-gramotnost',
  title: 'Финансовая грамотность школьника',
  subject: 'Обществознание',
  description: 'Описание.',
  keywords: ['финансы'],
  coverUrl: null,
  coverKey: 'social-finance',
  priceMinor: 99_900,
  currency: 'RUB',
  includedMaterials: ['Проект', 'Презентация', 'Продукт', 'Речь'],
  purchaseCount: 0,
  featured: false,
};

class MemoryRepository implements CatalogRepository, UserRepository {
  async list() {
    return { items: [project], total: 1 };
  }

  async findBySlug(slug: string) {
    return slug === project.slug ? project : null;
  }

  async listPopular() {
    return [project];
  }

  async listFavorites() {
    return [project];
  }

  async addFavorite(_userId: string, projectId: string) {
    return projectId === project.id;
  }

  async removeFavorite(_userId: string, projectId: string) {
    return projectId === project.id;
  }

  async upsertTelegramUser() {
    return '22222222-2222-4222-8222-222222222222';
  }
}

const openApps: Array<Awaited<ReturnType<typeof createApp>>> = [];

async function makeApp(
  developmentAuthEnabled = true,
  telegramInitDataVerifier?: TelegramInitDataVerifier,
) {
  const repository = new MemoryRepository();
  const app = await createApp({
    catalogRepository: repository,
    userRepository: repository,
    corsOrigins: ['http://localhost:5173'],
    developmentAuthEnabled,
    telegramInitDataVerifier,
  });
  openApps.push(app);
  return app;
}

afterEach(async () => {
  await Promise.all(openApps.splice(0).map((app) => app.close()));
});

describe('catalog routes', () => {
  it('serves a public paginated catalog without personal state', async () => {
    const app = await makeApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/projects?limit=24&offset=0',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
    expect(response.headers['cache-control']).toContain('public');
    expect(response.json().items[0]).not.toHaveProperty('isFavorite');
  });

  it('validates query parameters', async () => {
    const app = await makeApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/projects?limit=1000',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('requires an identity for favorites', async () => {
    const app = await makeApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/favorites',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('AUTH_REQUIRED');
    expect(response.headers['cache-control']).toBe('private, no-store');
  });

  it('allows the explicitly enabled development identity', async () => {
    const app = await makeApp();
    const response = await app.inject({
      method: 'PUT',
      url: `/api/v1/favorites/${project.id}`,
      headers: { 'x-dev-telegram-user-id': '100000001' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      projectId: project.id,
      isFavorite: true,
    });
  });

  it('does not accept a development identity when the bypass is disabled', async () => {
    const app = await makeApp(false);
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/favorites',
      headers: { 'x-dev-telegram-user-id': '100000001' },
    });

    expect(response.statusCode).toBe(401);
  });

  it('accepts verified Telegram init data for favorites', async () => {
    const verifier: TelegramInitDataVerifier = (raw) => {
      expect(raw).toBe('signed-init-data');
      return {
        telegramId: 100_000_002n,
        username: 'verified',
        name: 'Verified user',
        authDate: new Date(),
      };
    };
    const app = await makeApp(false, verifier);
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/favorites',
      headers: { authorization: 'tma signed-init-data' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
  });

  it('never falls back to development auth after invalid Telegram data', async () => {
    const app = await makeApp(true, () => {
      throw new Error('invalid signature');
    });
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/favorites',
      headers: {
        authorization: 'tma invalid',
        'x-dev-telegram-user-id': '100000001',
      },
    });

    expect(response.statusCode).toBe(401);
  });
});
