import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

const MAX_INIT_DATA_LENGTH = 16 * 1024;
const ALLOWED_FUTURE_SKEW_SECONDS = 30;

const TelegramUserSchema = z.object({
  id: z.number().int().positive().safe(),
  first_name: z.string().trim().min(1).max(128),
  last_name: z.string().trim().max(128).optional(),
  username: z.string().trim().min(1).max(64).optional(),
});

export interface TelegramIdentity {
  telegramId: bigint;
  username: string | null;
  name: string;
  authDate: Date;
}

export type TelegramInitDataErrorCode = 'INVALID' | 'EXPIRED';

export class TelegramInitDataError extends Error {
  constructor(readonly code: TelegramInitDataErrorCode) {
    super(
      code === 'EXPIRED'
        ? 'Telegram authentication data has expired'
        : 'Telegram authentication data is invalid',
    );
    this.name = 'TelegramInitDataError';
  }
}

export interface TelegramInitDataOptions {
  botToken: string;
  maxAgeSeconds: number;
  now?: () => Date;
}

export type TelegramInitDataVerifier = (
  rawInitData: string,
) => TelegramIdentity;

export function createTelegramInitDataVerifier(
  options: TelegramInitDataOptions,
): TelegramInitDataVerifier {
  return (rawInitData) => verifyTelegramInitData(rawInitData, options);
}

export function verifyTelegramInitData(
  rawInitData: string,
  options: TelegramInitDataOptions,
): TelegramIdentity {
  if (!rawInitData || rawInitData.length > MAX_INIT_DATA_LENGTH) {
    throw new TelegramInitDataError('INVALID');
  }

  const parameters = new URLSearchParams(rawInitData);
  const entries = [...parameters.entries()];
  const seen = new Set<string>();

  for (const [key] of entries) {
    if (seen.has(key)) {
      throw new TelegramInitDataError('INVALID');
    }
    seen.add(key);
  }

  const hash = parameters.get('hash');
  const authDateRaw = parameters.get('auth_date');
  const userRaw = parameters.get('user');

  if (!hash || !/^[a-f\d]{64}$/i.test(hash) || !authDateRaw || !userRaw) {
    throw new TelegramInitDataError('INVALID');
  }

  const dataCheckString = entries
    .filter(([key]) => key !== 'hash')
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secretKey = createHmac('sha256', 'WebAppData')
    .update(options.botToken)
    .digest();
  const expectedHash = createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest();
  const providedHash = Buffer.from(hash, 'hex');

  if (
    providedHash.length !== expectedHash.length ||
    !timingSafeEqual(expectedHash, providedHash)
  ) {
    throw new TelegramInitDataError('INVALID');
  }

  if (!/^\d{1,12}$/.test(authDateRaw)) {
    throw new TelegramInitDataError('INVALID');
  }

  const authDateSeconds = Number(authDateRaw);
  const nowSeconds = Math.floor((options.now?.() ?? new Date()).getTime() / 1000);
  if (
    authDateSeconds > nowSeconds + ALLOWED_FUTURE_SKEW_SECONDS ||
    nowSeconds - authDateSeconds > options.maxAgeSeconds
  ) {
    throw new TelegramInitDataError('EXPIRED');
  }

  let telegramUser: z.infer<typeof TelegramUserSchema>;
  try {
    telegramUser = TelegramUserSchema.parse(JSON.parse(userRaw));
  } catch {
    throw new TelegramInitDataError('INVALID');
  }

  return {
    telegramId: BigInt(telegramUser.id),
    username: telegramUser.username ?? null,
    name: [telegramUser.first_name, telegramUser.last_name]
      .filter(Boolean)
      .join(' '),
    authDate: new Date(authDateSeconds * 1000),
  };
}
