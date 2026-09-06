import { z } from 'zod';

export class TelegramApiError extends Error {
  constructor(readonly code: number, readonly retryAfterSeconds = 0) {
    // Telegram errors and fetch exceptions can contain the token-bearing URL.
    super(`Telegram API request failed (${code})`);
  }
}

export interface TelegramClient {
  call(method: string, payload?: Record<string, unknown>, signal?: AbortSignal): Promise<unknown>;
}

const envelope = z.object({
  ok: z.boolean(),
  result: z.unknown().optional(),
  error_code: z.number().int().optional(),
  parameters: z.object({retry_after: z.number().int().nonnegative().optional()}).optional(),
});

export function createTelegramClient(token: string, transport: typeof fetch = fetch): TelegramClient {
  return {
    async call(method, payload = {}, signal) {
      if (!/^[A-Za-z]+$/.test(method)) throw new TelegramApiError(0);
      try {
        const response = await transport(`https://api.telegram.org/bot${token}/${method}`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(payload),
          redirect: 'error',
          signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(40_000)]) : AbortSignal.timeout(15_000),
        });
        const body = envelope.safeParse(await response.json());
        if (!body.success) throw new TelegramApiError(response.ok ? 0 : response.status);
        if (!response.ok || !body.data.ok) {
          throw new TelegramApiError(body.data.error_code ?? response.status,
            body.data.parameters?.retry_after ?? 0);
        }
        return body.data.result;
      } catch (error) {
        if (error instanceof TelegramApiError) throw error;
        throw new TelegramApiError(0);
      }
    },
  };
}

export const BotInfoSchema = z.object({id: z.number().int().positive().safe(), is_bot: z.literal(true), username: z.string()});
export const WebhookInfoSchema = z.object({url: z.string(), pending_update_count: z.number().int().nonnegative()});
