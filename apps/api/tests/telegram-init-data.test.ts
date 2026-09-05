import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  TelegramInitDataError,
  verifyTelegramInitData,
} from '../src/modules/auth/telegram-init-data.js';

const BOT_TOKEN = '123456789:schoolroom-test-bot-token';
const NOW = new Date('2026-09-05T12:00:00.000Z');
const AUTH_DATE = Math.floor(NOW.getTime() / 1000);

function signInitData(
  values: Record<string, string>,
  botToken = BOT_TOKEN,
) {
  const entries = Object.entries(values);
  const dataCheckString = entries
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();
  const hash = createHmac('sha256', secret)
    .update(dataCheckString)
    .digest('hex');

  const parameters = new URLSearchParams(values);
  parameters.set('hash', hash);
  return parameters.toString();
}

function validValues(overrides: Record<string, string> = {}) {
  return {
    query_id: 'AAEAAAE',
    auth_date: String(AUTH_DATE),
    user: JSON.stringify({
      id: 100_000_001,
      first_name: 'Иван',
      last_name: 'Петров',
      username: 'student',
    }),
    ...overrides,
  };
}

const verifyOptions = {
  botToken: BOT_TOKEN,
  maxAgeSeconds: 3600,
  now: () => NOW,
};

describe('Telegram Mini App init data', () => {
  it('validates signed data and returns a normalized identity', () => {
    expect(
      verifyTelegramInitData(signInitData(validValues()), verifyOptions),
    ).toEqual({
      telegramId: 100_000_001n,
      username: 'student',
      name: 'Иван Петров',
      authDate: new Date(AUTH_DATE * 1000),
    });
  });

  it('includes the signature field in bot-token HMAC validation', () => {
    const raw = signInitData(
      validValues({ signature: 'telegram-third-party-signature' }),
    );
    expect(verifyTelegramInitData(raw, verifyOptions).telegramId).toBe(
      100_000_001n,
    );
  });

  it('rejects tampering, duplicates, and a missing hash', () => {
    const signed = signInitData(validValues());
    expect(() =>
      verifyTelegramInitData(`${signed}&user=%7B%7D`, verifyOptions),
    ).toThrow(TelegramInitDataError);
    expect(() =>
      verifyTelegramInitData(signed.replace('student', 'attacker'), verifyOptions),
    ).toThrow(TelegramInitDataError);
    expect(() =>
      verifyTelegramInitData(
        new URLSearchParams(validValues()).toString(),
        verifyOptions,
      ),
    ).toThrow(TelegramInitDataError);
  });

  it('rejects expired and implausibly future data', () => {
    const expired = signInitData(
      validValues({ auth_date: String(AUTH_DATE - 3601) }),
    );
    const future = signInitData(
      validValues({ auth_date: String(AUTH_DATE + 31) }),
    );

    expect(() => verifyTelegramInitData(expired, verifyOptions)).toThrowError(
      expect.objectContaining({ code: 'EXPIRED' }),
    );
    expect(() => verifyTelegramInitData(future, verifyOptions)).toThrowError(
      expect.objectContaining({ code: 'EXPIRED' }),
    );
  });

  it('rejects malformed user data after validating its signature', () => {
    const raw = signInitData(validValues({ user: '{"id":"not-a-number"}' }));
    expect(() => verifyTelegramInitData(raw, verifyOptions)).toThrowError(
      expect.objectContaining({ code: 'INVALID' }),
    );
  });
});
