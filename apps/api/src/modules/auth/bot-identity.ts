import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { TelegramIdentity } from './telegram-init-data.js';

const SIGNATURE_CONTEXT = 'SchoolRoomBotIdentity';
const MAX_CLOCK_SKEW_MS = 30_000;

const TelegramBotUserSchema = z.object({
  telegramId: z.string().regex(/^[1-9]\d{0,15}$/),
  username: z.string().trim().min(1).max(64).nullable(),
  name: z.string().trim().min(1).max(257),
}).strict();

export class BotIdentityAuthenticationError extends Error {
  constructor() {
    super('Bot identity authentication failed');
  }
}

export interface BotIdentityVerifierOptions {
  botToken: string;
  now?: () => number;
}

export type BotIdentityVerifier = (
  body: unknown,
  timestampHeader: string | string[] | undefined,
  signatureHeader: string | string[] | undefined,
) => TelegramIdentity;

export function createBotIdentityVerifier(options: BotIdentityVerifierOptions): BotIdentityVerifier {
  const signingKey = createHmac('sha256', SIGNATURE_CONTEXT).update(options.botToken).digest();
  return (body, timestampHeader, signatureHeader) => {
    if (typeof timestampHeader !== 'string' || typeof signatureHeader !== 'string' ||
      !/^\d{13}$/.test(timestampHeader) || !/^[a-f\d]{64}$/i.test(signatureHeader)) {
      throw new BotIdentityAuthenticationError();
    }
    const timestamp = Number(timestampHeader);
    if (!Number.isSafeInteger(timestamp) || Math.abs((options.now?.() ?? Date.now()) - timestamp) > MAX_CLOCK_SKEW_MS) {
      throw new BotIdentityAuthenticationError();
    }

    const parsed = TelegramBotUserSchema.safeParse(body);
    if (!parsed.success || BigInt(parsed.data.telegramId) > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new BotIdentityAuthenticationError();
    }
    const serialized = JSON.stringify(parsed.data);
    const expected = createHmac('sha256', signingKey).update(timestampHeader + '.' + serialized).digest();
    const provided = Buffer.from(signatureHeader, 'hex');
    if (provided.length !== expected.length || !timingSafeEqual(expected, provided)) {
      throw new BotIdentityAuthenticationError();
    }

    return {
      telegramId: BigInt(parsed.data.telegramId),
      username: parsed.data.username,
      name: parsed.data.name,
      authDate: new Date(timestamp),
    };
  };
}
