import { z } from 'zod';
import { getTelegramWebApp } from '../telegram/bridge.js';

const API_URL = (import.meta.env.VITE_API_URL ?? '/api/v1').replace(/\/$/, '');

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

interface ApiRequestOptions extends RequestInit {
  authenticated?: boolean;
}

export async function apiRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  options: ApiRequestOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  const { authenticated: _authenticated, ...requestOptions } = options;
  headers.set('Accept', 'application/json');

  if (options.authenticated) {
    const initData = getTelegramWebApp()?.initData?.trim();
    const developmentUserId = import.meta.env.VITE_DEV_TELEGRAM_USER_ID;

    if (initData) {
      headers.set('Authorization', `tma ${initData}`);
    } else if (developmentUserId) {
      headers.set('X-Dev-Telegram-User-Id', developmentUserId);
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...requestOptions,
    headers,
  });
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const parsed = z
      .object({
        error: z.object({
          message: z.string(),
          code: z.string(),
        }),
      })
      .safeParse(payload);

    throw new ApiRequestError(
      parsed.success ? parsed.data.error.message : 'Сервис временно недоступен',
      response.status,
      parsed.success ? parsed.data.error.code : 'REQUEST_FAILED',
    );
  }

  return schema.parse(payload);
}
