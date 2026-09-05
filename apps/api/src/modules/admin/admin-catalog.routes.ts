import {
  AdminProjectListQuerySchema,
  ProjectCreateInputSchema,
  ProjectPatchInputSchema,
} from '@schoolroom/contracts';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { setPrivateNoStore } from '../../shared/http/cache.js';
import type { AuthenticatedUser } from '../auth/authenticator.js';
import { AdminCatalogService } from './admin-catalog.service.js';

export class AdminForbiddenError extends Error {
  constructor() {
    super('Недостаточно прав для управления каталогом');
    this.name = 'AdminForbiddenError';
  }
}

interface AdminCatalogRoutesOptions {
  service: AdminCatalogService;
  authenticate: (request: FastifyRequest) => Promise<AuthenticatedUser>;
  ownerTelegramIds: ReadonlySet<bigint>;
}

export async function registerAdminCatalogRoutes(
  app: FastifyInstance,
  options: AdminCatalogRoutesOptions,
) {
  const authorizeOwner = async (request: FastifyRequest) => {
    const authenticated = await options.authenticate(request);
    if (!options.ownerTelegramIds.has(authenticated.identity.telegramId)) {
      throw new AdminForbiddenError();
    }
    return authenticated;
  };

  app.get('/api/v1/admin/projects', async (request, reply) => {
    setPrivateNoStore(reply);
    await authorizeOwner(request);
    const query = AdminProjectListQuerySchema.parse(request.query);
    return options.service.list(query);
  });

  app.post('/api/v1/admin/projects', async (request, reply) => {
    setPrivateNoStore(reply);
    const { userId } = await authorizeOwner(request);
    const body = ProjectCreateInputSchema.parse(request.body);
    const result = await options.service.create(body, userId);
    return reply.status(201).send(result);
  });

  app.get<{ Params: { projectId: string } }>(
    '/api/v1/admin/projects/:projectId',
    async (request, reply) => {
      setPrivateNoStore(reply);
      await authorizeOwner(request);
      const projectId = z.uuid().parse(request.params.projectId);
      return options.service.get(projectId);
    },
  );

  app.patch<{ Params: { projectId: string } }>(
    '/api/v1/admin/projects/:projectId',
    async (request, reply) => {
      setPrivateNoStore(reply);
      const { userId } = await authorizeOwner(request);
      const projectId = z.uuid().parse(request.params.projectId);
      const body = ProjectPatchInputSchema.parse(request.body);
      return options.service.update(projectId, body, userId);
    },
  );

  app.delete<{ Params: { projectId: string } }>(
    '/api/v1/admin/projects/:projectId',
    async (request, reply) => {
      setPrivateNoStore(reply);
      const { userId } = await authorizeOwner(request);
      const projectId = z.uuid().parse(request.params.projectId);
      return options.service.archive(projectId, userId);
    },
  );
}
