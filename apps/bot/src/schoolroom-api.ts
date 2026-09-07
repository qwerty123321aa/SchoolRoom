import { createHmac } from 'node:crypto';
import type { RegisterTelegramBotUser } from './handler.js';

const SIGNATURE_CONTEXT = 'SchoolRoomBotIdentity';

export class SchoolRoomApiError extends Error {
  constructor() {
    super('SchoolRoom API user registration failed');
  }
}

export function createSchoolRoomUserRegistrar(apiOrigin: string, botToken: string,
  transport: typeof fetch = fetch, now: () => number = Date.now): RegisterTelegramBotUser {
  const signingKey = createHmac('sha256', SIGNATURE_CONTEXT).update(botToken).digest();
  const endpoint = new URL('/internal/v1/telegram/users', apiOrigin);

  return async (user, signal) => {
    const timestamp = String(now());
    const body = JSON.stringify(user);
    const signature = createHmac('sha256', signingKey).update(timestamp + '.' + body).digest('hex');
    try {
      const response = await transport(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SchoolRoom-Timestamp': timestamp,
          'X-SchoolRoom-Signature': signature,
        },
        body,
        redirect: 'error',
        signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10_000)]) : AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new SchoolRoomApiError();
    } catch (error) {
      if (error instanceof SchoolRoomApiError) throw error;
      throw new SchoolRoomApiError();
    }
  };
}
