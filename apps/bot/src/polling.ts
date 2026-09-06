import { setTimeout as delay } from 'node:timers/promises';
import { z } from 'zod';
import { UpdateSchema, type UpdateHandler } from './handler.js';
import { TelegramApiError, WebhookInfoSchema, type TelegramClient } from './telegram.js';

export async function assertPollingAvailable(client: TelegramClient, signal?: AbortSignal) {
  const info = WebhookInfoSchema.parse(await client.call('getWebhookInfo', {}, signal));
  if (info.url) throw new Error('Webhook is active. Stop webhook delivery explicitly before starting polling.');
}

export async function runPolling(client: TelegramClient, handle: UpdateHandler, signal: AbortSignal,
  report: (message: string) => void = console.warn,
  sleep: (ms: number) => Promise<void> = (ms) => delay(ms, undefined, {signal})) {
  let offset = 0;
  let failures = 0;
  while (!signal.aborted) {
    try {
      const updates = z.array(UpdateSchema).parse(await client.call('getUpdates', {
        offset, timeout: 25, limit: 100, allowed_updates: ['message'],
      }, signal));
      for (const update of updates) {
        if (signal.aborted) return;
        if (update.update_id < offset) continue;
        await handle(update, signal);
        // Acknowledge only completed updates in the NEXT getUpdates request.
        offset = update.update_id + 1;
      }
      failures = 0;
    } catch (error) {
      if (signal.aborted) return;
      if (error instanceof TelegramApiError && [401, 404, 409].includes(error.code)) throw error;
      const retrySeconds = error instanceof TelegramApiError ? error.retryAfterSeconds : 0;
      const wait = Math.max(Math.min(1000 * 2 ** Math.min(failures++, 5), 30_000), Math.min(retrySeconds, 3600) * 1000);
      report('Telegram polling paused after an error; retrying without acknowledging unfinished updates.');
      try { await sleep(wait); } catch { if (signal.aborted) return; throw new Error('Polling retry interrupted'); }
    }
  }
}
