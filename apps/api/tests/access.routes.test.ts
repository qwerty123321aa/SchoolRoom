import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { ProjectAccessRepository } from '../src/modules/access/access.repository.js';
import type { UserRepository } from '../src/modules/auth/auth.repository.js';
import type {
  CatalogProjectRecord,
  CatalogRepository,
} from '../src/modules/catalog/catalog.repository.js';

const project: CatalogProjectRecord = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'test-project',
  title: 'Тестовый проект',
  subject: 'История',
  description: null,
  keywords: [],
  coverUrl: null,
  coverKey: 'history',
  priceMinor: 99_900,
  currency: 'RUB',
  includedMaterials: ['Проект'],
  purchaseCount: 0,
  featured: false,
};

class CatalogMemory implements CatalogRepository {
  async list() { return { items: [project], total: 1 }; }
  async findBySlug() { return project; }
  async listPopular() { return []; }
  async listFavorites() { return []; }
  async addFavorite() { return true; }
  async removeFavorite() { return true; }
}

class UserMemory implements UserRepository {
  async upsertTelegramUser() {
    return '22222222-2222-4222-8222-222222222222';
  }
}

class AccessMemory implements ProjectAccessRepository {
  constructor(private readonly owned: boolean) {}
  async getProjectAccess(_userId: string, projectId: string) {
    return projectId === project.id
      ? { owned: this.owned, materialsAvailable: this.owned }
      : null;
  }
}

const openApps: Array<Awaited<ReturnType<typeof createApp>>> = [];

afterEach(async () => {
  await Promise.all(openApps.splice(0).map((app) => app.close()));
});

async function makeApp(owned: boolean) {
  const app = await createApp({
    catalogRepository: new CatalogMemory(),
    userRepository: new UserMemory(),
    accessRepository: new AccessMemory(owned),
    corsOrigins: ['http://localhost:5173'],
    developmentAuthEnabled: true,
  });
  openApps.push(app);
  return app;
}

describe('project access route', () => {
  it('returns owned state from the private read model', async () => {
    const app = await makeApp(true);
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/me/projects/${project.id}/access`,
      headers: { 'x-dev-telegram-user-id': '100000001' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.json()).toEqual({
      projectId: project.id,
      state: 'owned',
      materialsAvailable: true,
    });
  });

  it('does not expose personal state without authentication', async () => {
    const app = await makeApp(false);
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/me/projects/${project.id}/access`,
    });
    expect(response.statusCode).toBe(401);
    expect(response.headers['cache-control']).toBe('private, no-store');
  });
});
