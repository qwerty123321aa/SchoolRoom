import type { FastifyInstance } from 'fastify';
import type { UserRepository } from './auth.repository.js';
import type { BotIdentityVerifier } from './bot-identity.js';

export async function registerBotIdentityRoutes(app: FastifyInstance, options: {
  users: UserRepository;
  verify: BotIdentityVerifier;
}) {
  app.post('/internal/v1/telegram/users', async (request, reply) => {
    const identity = options.verify(
      request.body,
      request.headers['x-schoolroom-timestamp'],
      request.headers['x-schoolroom-signature'],
    );
    await options.users.upsertTelegramUser(identity);
    return reply.status(204).send();
  });
}
