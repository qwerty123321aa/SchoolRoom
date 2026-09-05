import type { FastifyReply } from 'fastify';

export function setPublicCache(reply: FastifyReply) {
  reply.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  reply.header('Vary', 'Origin, Accept-Encoding');
}

export function setPrivateNoStore(reply: FastifyReply) {
  reply.header('Cache-Control', 'private, no-store');
  reply.header('Pragma', 'no-cache');
  reply.header('Vary', 'Authorization, X-Dev-Telegram-User-Id');
}
