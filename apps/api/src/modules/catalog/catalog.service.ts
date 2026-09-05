import {
  CATALOG_SUBJECTS,
  type CatalogQuery,
  type CatalogResponse,
  type FavoriteMutationResponse,
  type ProjectDetail,
  type ProjectSummary,
} from '@schoolroom/contracts';
import type {
  CatalogProjectRecord,
  CatalogRepository,
} from './catalog.repository.js';

export class CatalogNotFoundError extends Error {
  constructor() {
    super('Проект не найден');
    this.name = 'CatalogNotFoundError';
  }
}

export class CatalogService {
  constructor(private readonly repository: CatalogRepository) {}

  getMeta() {
    return { subjects: [...CATALOG_SUBJECTS] };
  }

  async list(query: CatalogQuery): Promise<CatalogResponse> {
    const { items, total } = await this.repository.list(query);

    return {
      items: items.map(toSummary),
      pagination: {
        offset: query.offset,
        limit: query.limit,
        total,
        hasMore: query.offset + items.length < total,
      },
    };
  }

  async getBySlug(slug: string): Promise<ProjectDetail> {
    const project = await this.repository.findBySlug(slug);
    if (!project) {
      throw new CatalogNotFoundError();
    }

    return {
      ...toSummary(project),
      description: project.description,
      includedMaterials: project.includedMaterials,
    };
  }

  async getPopular(limit = 8): Promise<CatalogResponse> {
    const items = await this.repository.listPopular(limit);
    return {
      items: items.map(toSummary),
      pagination: {
        offset: 0,
        limit,
        total: items.length,
        hasMore: false,
      },
    };
  }

  async getFavorites(userId: string): Promise<ProjectSummary[]> {
    const items = await this.repository.listFavorites(userId);
    return items.map(toSummary);
  }

  async addFavorite(
    userId: string,
    projectId: string,
  ): Promise<FavoriteMutationResponse> {
    const exists = await this.repository.addFavorite(userId, projectId);
    if (!exists) {
      throw new CatalogNotFoundError();
    }
    return { projectId, isFavorite: true };
  }

  async removeFavorite(
    userId: string,
    projectId: string,
  ): Promise<FavoriteMutationResponse> {
    const exists = await this.repository.removeFavorite(userId, projectId);
    if (!exists) {
      throw new CatalogNotFoundError();
    }
    return { projectId, isFavorite: false };
  }
}

function toSummary(project: CatalogProjectRecord): ProjectSummary {
  return {
    id: project.id,
    slug: project.slug,
    title: project.title,
    subject: project.subject,
    cover: {
      key: project.coverKey,
      alt: `Обложка проекта «${project.title}»`,
      url: project.coverUrl,
    },
    price: {
      amountMinor: project.priceMinor,
      currency: project.currency,
      formatted: new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: project.currency,
        maximumFractionDigits: 0,
      }).format(project.priceMinor / 100),
    },
    featured: project.featured,
  };
}
