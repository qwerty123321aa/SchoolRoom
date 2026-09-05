import { afterEach, describe, expect, it } from 'vitest';
import type {
  AdminProjectListQuery,
  ProjectCreateInput,
  ProjectPatchInput,
} from '@schoolroom/contracts';
import { createApp } from '../src/app.js';
import type {
  AdminCatalogRepository,
  AdminProjectRecord,
  AdminProjectUpdateResult,
} from '../src/modules/admin/admin-catalog.repository.js';
import type { UserRepository } from '../src/modules/auth/auth.repository.js';
import type {
  CatalogProjectRecord,
  CatalogRepository,
} from '../src/modules/catalog/catalog.repository.js';

const catalogProject: CatalogProjectRecord = {
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

const now = new Date('2026-09-05T12:00:00.000Z');
const draft: AdminProjectRecord = {
  ...catalogProject,
  isPublished: false,
  archivedAt: null,
  createdAt: now,
  updatedAt: now,
  version: 1,
};

class CatalogMemory implements CatalogRepository {
  async list() { return { items: [catalogProject], total: 1 }; }
  async findBySlug() { return catalogProject; }
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

class AdminMemory implements AdminCatalogRepository {
  project = { ...draft };
  async listProjects(_query: AdminProjectListQuery) { return [this.project]; }
  async findProjectById(id: string) { return id === this.project.id ? this.project : null; }
  async findProjectBySlug(slug: string) { return slug === this.project.slug ? this.project : null; }
  async createProject(input: ProjectCreateInput) {
    this.project = { ...draft, ...input, id: '33333333-3333-4333-8333-333333333333' };
    return this.project;
  }
  async updateProject(
    id: string,
    input: ProjectPatchInput,
  ): Promise<AdminProjectUpdateResult> {
    if (id !== this.project.id) return { status: 'missing' };
    if (input.expectedVersion !== this.project.version) return { status: 'conflict' };
    const { expectedVersion: _expectedVersion, ...changes } = input;
    this.project = {
      ...this.project,
      ...changes,
      version: this.project.version + 1,
      updatedAt: now,
    };
    return { status: 'ok', project: this.project };
  }
  async archiveProject(id: string) {
    if (id !== this.project.id) return null;
    this.project = {
      ...this.project,
      isPublished: false,
      archivedAt: now,
      version: this.project.version + 1,
    };
    return this.project;
  }
}

const openApps: Array<Awaited<ReturnType<typeof createApp>>> = [];
afterEach(async () => {
  await Promise.all(openApps.splice(0).map((app) => app.close()));
});

async function makeApp(adminTelegramIds = [100_000_001n]) {
  const adminRepository = new AdminMemory();
  const app = await createApp({
    catalogRepository: new CatalogMemory(),
    userRepository: new UserMemory(),
    adminCatalogRepository: adminRepository,
    adminTelegramIds,
    corsOrigins: ['http://localhost:5173'],
    developmentAuthEnabled: true,
  });
  openApps.push(app);
  return { app, adminRepository };
}

const validCreate = {
  title: 'Новый проект',
  slug: 'novyy-proekt',
  subject: 'Биология',
  description: 'Описание нового проекта.',
  keywords: ['биология'],
  coverUrl: null,
  coverKey: 'biology',
  priceMinor: 99_900,
  includedMaterials: ['Проект', 'Презентация'],
  featured: false,
};

describe('admin catalog routes', () => {
  it('allows an owner to create a draft and disables caching', async () => {
    const { app } = await makeApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/projects',
      headers: { 'x-dev-telegram-user-id': '100000001' },
      payload: validCreate,
    });
    expect(response.statusCode).toBe(201);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.json().project).toMatchObject({ isPublished: false, purchaseCount: 0 });
  });

  it('rejects non-owners and mutation of purchase counters', async () => {
    const { app } = await makeApp();
    const forbidden = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/projects',
      headers: { 'x-dev-telegram-user-id': '200000002' },
    });
    expect(forbidden.statusCode).toBe(403);

    const invalid = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/projects',
      headers: { 'x-dev-telegram-user-id': '100000001' },
      payload: { ...validCreate, purchaseCount: 500 },
    });
    expect(invalid.statusCode).toBe(400);
  });

  it('returns 409 for an outdated project version', async () => {
    const { app, adminRepository } = await makeApp();
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/projects/${adminRepository.project.id}`,
      headers: { 'x-dev-telegram-user-id': '100000001' },
      payload: { expectedVersion: 999, featured: true },
    });
    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('PROJECT_VERSION_CONFLICT');
  });

  it('archives instead of physically deleting a project', async () => {
    const { app, adminRepository } = await makeApp();
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/admin/projects/${adminRepository.project.id}`,
      headers: { 'x-dev-telegram-user-id': '100000001' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().project.archivedAt).not.toBeNull();
    expect(adminRepository.project.isPublished).toBe(false);
  });
});
