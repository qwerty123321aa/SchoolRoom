import type {
  CatalogQuery,
  CatalogSubject,
} from '@schoolroom/contracts';

export interface CatalogProjectRecord {
  id: string;
  slug: string;
  title: string;
  subject: CatalogSubject;
  description: string | null;
  keywords: string[];
  coverUrl: string | null;
  coverKey: string;
  priceMinor: number;
  currency: 'RUB';
  includedMaterials: string[];
  purchaseCount: number;
  featured: boolean;
}

export interface CatalogRepository {
  list(
    query: CatalogQuery,
  ): Promise<{ items: CatalogProjectRecord[]; total: number }>;
  findBySlug(slug: string): Promise<CatalogProjectRecord | null>;
  listPopular(limit: number): Promise<CatalogProjectRecord[]>;
  listFavorites(userId: string): Promise<CatalogProjectRecord[]>;
  addFavorite(userId: string, projectId: string): Promise<boolean>;
  removeFavorite(userId: string, projectId: string): Promise<boolean>;
}
