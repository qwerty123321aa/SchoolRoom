import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  CatalogSubject,
  FavoritesResponseSchema,
  ProjectSummary,
} from '@schoolroom/contracts';
import type { z } from 'zod';
import { showToast } from '../../shared/lib/toast.js';
import {
  getCatalog,
  getCatalogMeta,
  getFavorites,
  getPopularProjects,
  getProject,
  getProjectAccess,
  updateFavorite,
} from './api.js';

type FavoritesResponse = z.infer<typeof FavoritesResponseSchema>;

export const catalogKeys = {
  root: ['catalog'] as const,
  list: (q: string, subject?: CatalogSubject) =>
    ['catalog', 'list', q, subject ?? 'all'] as const,
  popular: ['catalog', 'popular'] as const,
  detail: (slug: string) => ['catalog', 'detail', slug] as const,
  meta: ['catalog', 'meta'] as const,
  favorites: ['favorites'] as const,
  access: (projectId: string) => ['project-access', projectId] as const,
};

export function useCatalogQuery(q: string, subject?: CatalogSubject) {
  return useInfiniteQuery({
    queryKey: catalogKeys.list(q, subject),
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => {
      const filters = {
        ...(q ? { q } : {}),
        ...(subject ? { subject } : {}),
        offset: pageParam,
        limit: 24,
      };
      return getCatalog(filters, signal);
    },
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore
        ? lastPage.pagination.offset + lastPage.items.length
        : undefined,
  });
}

export function usePopularQuery(enabled: boolean) {
  return useQuery({
    queryKey: catalogKeys.popular,
    queryFn: ({ signal }) => getPopularProjects(signal),
    enabled,
    staleTime: 60_000,
  });
}

export function useCatalogMetaQuery() {
  return useQuery({
    queryKey: catalogKeys.meta,
    queryFn: ({ signal }) => getCatalogMeta(signal),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useProjectQuery(slug: string) {
  return useQuery({
    queryKey: catalogKeys.detail(slug),
    queryFn: ({ signal }) => getProject(slug, signal),
    enabled: Boolean(slug),
  });
}

export function useProjectAccessQuery(projectId: string) {
  return useQuery({
    queryKey: catalogKeys.access(projectId),
    queryFn: ({ signal }) => getProjectAccess(projectId, signal),
    enabled: Boolean(projectId),
    retry: false,
  });
}

export function useFavoritesQuery() {
  return useQuery({
    queryKey: catalogKeys.favorites,
    queryFn: ({ signal }) => getFavorites(signal),
    retry: false,
  });
}

export function useFavorite(project: ProjectSummary) {
  const queryClient = useQueryClient();
  const favorites = useFavoritesQuery();
  const isFavorite =
    favorites.data?.items.some((item) => item.id === project.id) ?? false;

  const mutation = useMutation({
    mutationFn: (nextFavorite: boolean) =>
      updateFavorite(project.id, nextFavorite),
    onMutate: async (nextFavorite) => {
      await queryClient.cancelQueries({ queryKey: catalogKeys.favorites });
      const previous = queryClient.getQueryData<FavoritesResponse>(
        catalogKeys.favorites,
      );

      queryClient.setQueryData<FavoritesResponse>(catalogKeys.favorites, (old) => {
        const items = old?.items ?? [];
        return {
          items: nextFavorite
            ? items.some((item) => item.id === project.id)
              ? items
              : [project, ...items]
            : items.filter((item) => item.id !== project.id),
        };
      });

      return { previous };
    },
    onError: (error, _nextFavorite, context) => {
      queryClient.setQueryData(catalogKeys.favorites, context?.previous);
      showToast(
        error instanceof Error
          ? error.message
          : 'Не удалось обновить избранное',
      );
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: catalogKeys.favorites }),
  });

  return {
    isFavorite,
    isPending: mutation.isPending,
    toggle: () => mutation.mutate(!isFavorite),
  };
}
