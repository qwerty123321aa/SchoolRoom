import { describe, expect, it } from 'vitest';
import { CatalogService } from '../src/modules/catalog/catalog.service.js';
import type {
  CatalogProjectRecord,
  CatalogRepository,
} from '../src/modules/catalog/catalog.repository.js';

const project: CatalogProjectRecord = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'son-i-pamyat',
  title: 'Как сон влияет на память подростков',
  subject: 'Биология',
  description: 'Описание проекта.',
  keywords: ['сон', 'память'],
  coverUrl: null,
  coverKey: 'biology-neural',
  priceMinor: 99_900,
  currency: 'RUB',
  includedMaterials: ['Проект', 'Презентация', 'Продукт', 'Речь'],
  purchaseCount: 0,
  featured: true,
};

class MemoryCatalogRepository implements CatalogRepository {
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
}

describe('CatalogService', () => {
  const service = new CatalogService(new MemoryCatalogRepository());

  it('maps money and exposes only the public catalog shape', async () => {
    const result = await service.list({ offset: 0, limit: 24 });

    expect(result.items[0]).toEqual({
      id: project.id,
      slug: project.slug,
      title: project.title,
      subject: project.subject,
      cover: {
        key: project.coverKey,
        alt: `Обложка проекта «${project.title}»`,
        url: null,
      },
      price: {
        amountMinor: 99_900,
        currency: 'RUB',
        formatted: '999 ₽',
      },
      featured: true,
    });
    expect(result.items[0]).not.toHaveProperty('purchaseCount');
    expect(result.items[0]).not.toHaveProperty('keywords');
    expect(result.items[0]).not.toHaveProperty('isFavorite');
  });

  it('returns the complete project detail', async () => {
    await expect(service.getBySlug(project.slug)).resolves.toMatchObject({
      description: project.description,
      includedMaterials: ['Проект', 'Презентация', 'Продукт', 'Речь'],
    });
  });

  it('returns a bounded popular collection without purchase counters', async () => {
    const result = await service.getPopular(8);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).not.toHaveProperty('purchaseCount');
  });

  it('rejects an unknown project', async () => {
    await expect(service.getBySlug('missing')).rejects.toMatchObject({
      name: 'CatalogNotFoundError',
    });
  });
});
