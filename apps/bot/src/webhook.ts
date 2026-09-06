import { timingSafeEqual } from 'node:crypto';
import Fastify from 'fastify';
import { UpdateSchema, type UpdateHandler } from './handler.js';

export async function createWebhookServer(secret: string, handle: UpdateHandler) {
  if (!/^[A-Za-z0-9_-]{32,256}$/.test(secret)) throw new Error('Invalid webhook secret configuration');
  const expected = Buffer.from(secret);
  const completed = new Map<number, number>();
  const inflight = new Map<number, Promise<void>>();
  const app = Fastify({logger: false, bodyLimit: 64 * 1024, requestTimeout: 20_000});
  app.get('/health', async () => ({status: 'ok'}));
  app.post('/telegram/webhook', {
    onRequest: async (request, reply) => {
      const value = request.headers['x-telegram-bot-api-secret-token'];
      const actual = Buffer.from(typeof value === 'string' ? value : '');
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
        return reply.code(401).send({error: 'UNAUTHORIZED'});
      }
    },
  }, async (request, reply) => {
    const parsed = UpdateSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({error: 'INVALID_UPDATE'});
    const update = parsed.data;
    const now = Date.now();
    for (const [id, expires] of completed) if (expires <= now) completed.delete(id);
    if (completed.has(update.update_id)) return {ok: true};
    let task = inflight.get(update.update_id);
    if (!task) {
      if (inflight.size >= 100) return reply.code(503).send({error: 'BUSY'});
      task = Promise.resolve().then(() => handle(update)).then(() => {
        if (completed.size >= 10_000) completed.delete(completed.keys().next().value!);
        completed.set(update.update_id, Date.now() + 24 * 60 * 60 * 1000);
      }).finally(() => { inflight.delete(update.update_id); });
      inflight.set(update.update_id, task);
    }
    try {
      await task;
      return {ok: true};
    } catch {
      // A non-2xx response asks Telegram to retry. Do not log the update or exception.
      return reply.code(503).send({error: 'RETRY_LATER'});
    }
  });
  app.setErrorHandler((error, _request, reply) => {
    const status = error instanceof Error && 'statusCode' in error &&
      typeof error.statusCode === 'number' && error.statusCode >= 400 && error.statusCode < 500
      ? error.statusCode : 500;
    return reply.code(status).send({error: status === 413 ? 'PAYLOAD_TOO_LARGE' : 'INVALID_REQUEST'});
  });
  return app;
}
