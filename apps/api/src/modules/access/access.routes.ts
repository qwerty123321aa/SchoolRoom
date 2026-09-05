import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { setPrivateNoStore } from '../../shared/http/cache.js';
import type { AuthenticatedUser } from '../auth/authenticator.js';
import { ProjectAccessService } from './access.service.js';

interface AccessRoutesOptions {
  service: ProjectAccessService;
  authenticate: (request: FastifyRequest) => Promise<AuthenticatedUser>;
}

export async function registerProjectAccessRoutes(
  app: FastifyInstance,
  options: AccessRoutesOptions,
) {
  app.get<{ Params: { projectId: string } }>(
    '/api/v1/me/projects/:projectId/access',
    async (request, reply) => {
      setPrivateNoStore(reply);
      const { userId } = await options.authenticate(request);
      const projectId = z.uuid().parse(request.params.projectId);
      return options.service.get(userId, projectId);
    },
  );
}
