import {
  CatalogResponseSchema,
  CatalogMetaResponseSchema,
  FavoriteMutationResponseSchema,
  FavoritesResponseSchema,
  ProjectDetailSchema,
  ProjectAccessResponseSchema,
  type CatalogQuery,
} from '@schoolroom/contracts';
import { apiRequest } from '../../shared/api/client.js';

export function getCatalog(
  query: CatalogQuery,
  signal?: AbortSignal,
) {
  const search = new URLSearchParams({
    offset: String(query.offset),
    limit: String(query.limit),
  });
  if (query.q) search.set('q', query.q);
  if (query.subject) search.set('subject', query.subject);
  if (query.featured !== undefined) {
    search.set('featured', String(query.featured));
  }

  return apiRequest(
    `/projects?${search.toString()}`,
    CatalogResponseSchema,
    signal ? { signal } : {},
  );
}

export function getCatalogMeta(signal?: AbortSignal) {
  return apiRequest(
    '/catalog/meta',
    CatalogMetaResponseSchema,
    signal ? { signal } : {},
  );
}

export function getPopularProjects(signal?: AbortSignal) {
  return apiRequest(
    '/catalog/popular',
    CatalogResponseSchema,
    signal ? { signal } : {},
  );
}

export function getProject(slug: string, signal?: AbortSignal) {
  return apiRequest(
    `/projects/${encodeURIComponent(slug)}`,
    ProjectDetailSchema,
    signal ? { signal } : {},
  );
}

export function getProjectAccess(projectId: string, signal?: AbortSignal) {
  return apiRequest(
    `/me/projects/${encodeURIComponent(projectId)}/access`,
    ProjectAccessResponseSchema,
    signal ? { authenticated: true, signal } : { authenticated: true },
  );
}

export function getFavorites(signal?: AbortSignal) {
  return apiRequest(
    '/favorites',
    FavoritesResponseSchema,
    signal ? { authenticated: true, signal } : { authenticated: true },
  );
}

export function updateFavorite(projectId: string, isFavorite: boolean) {
  return apiRequest(
    `/favorites/${encodeURIComponent(projectId)}`,
    FavoriteMutationResponseSchema,
    {
      authenticated: true,
      method: isFavorite ? 'PUT' : 'DELETE',
    },
  );
}
