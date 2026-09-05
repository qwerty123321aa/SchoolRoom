import { CatalogQuerySchema } from '@schoolroom/contracts';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  CatalogNotFoundError,
  CatalogService,
} from './catalog.service.js';
import type { AuthenticatedUser } from '../auth/authenticator.js';
import {
  setPrivateNoStore,
  setPublicCache,
} from '../../shared/http/cache.js';

const ProjectIdentifierSchema = z.uuid();
const ProjectSlugSchema = z.string().trim().min(1).max(160);

interface CatalogRoutesOptions {
  service: CatalogService;
  authenticate: (request: FastifyRequest) => Promise<AuthenticatedUser>;
}

export async function registerCatalogRoutes(
  app: FastifyInstance,
  options: CatalogRoutesOptions,
) {
  app.get('/api/v1/catalog/meta', async (_request, reply) => {
    setPublicCache(reply);
    return options.service.getMeta();
  });

  app.get('/api/v1/catalog/popular', async (_request, reply) => {
    setPublicCache(reply);
    return options.service.getPopular();
  });

  app.get('/api/v1/projects', async (request, reply) => {
    const query = CatalogQuerySchema.parse(request.query);
    setPublicCache(reply);
    return options.service.list(query);
  });

  app.get<{ Params: { slug: string } }>(
    '/api/v1/projects/:slug',
    async (request, reply) => {
      const slug = ProjectSlugSchema.parse(request.params.slug);
      setPublicCache(reply);
      return options.service.getBySlug(slug);
    },
  );

  app.get('/api/v1/favorites', async (request, reply) => {
    setPrivateNoStore(reply);
    const { userId } = await options.authenticate(request);
    return { items: await options.service.getFavorites(userId) };
  });

  app.put<{ Params: { projectId: string } }>(
    '/api/v1/favorites/:projectId',
    async (request, reply) => {
      setPrivateNoStore(reply);
      const { userId } = await options.authenticate(request);
      const projectId = ProjectIdentifierSchema.parse(request.params.projectId);
      return options.service.addFavorite(userId, projectId);
    },
  );

  app.delete<{ Params: { projectId: string } }>(
    '/api/v1/favorites/:projectId',
    async (request, reply) => {
      setPrivateNoStore(reply);
      const { userId } = await options.authenticate(request);
      const projectId = ProjectIdentifierSchema.parse(request.params.projectId);
      return options.service.removeFavorite(userId, projectId);
    },
  );
}

export function isCatalogError(error: unknown) {
  return (
    error instanceof CatalogNotFoundError
  );
}
