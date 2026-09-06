import { CurrentUserResponseSchema } from '@schoolroom/contracts';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { AuthenticatedUser } from './authenticator.js';
import { setPrivateNoStore } from '../../shared/http/cache.js';

export async function registerAuthRoutes(app: FastifyInstance,
  authenticate: (request: FastifyRequest) => Promise<AuthenticatedUser>) {
  app.get('/api/v1/me', async (request, reply) => {
    setPrivateNoStore(reply);
    const {userId, identity} = await authenticate(request);
    return CurrentUserResponseSchema.parse({user: {
      id: userId,
      telegramId: identity.telegramId.toString(),
      name: identity.name,
      username: identity.username,
    }});
  });
}
