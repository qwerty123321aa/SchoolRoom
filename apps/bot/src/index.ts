import { loadBotEnvironment } from './env.js';
import { BotInfoSchema, createTelegramClient, TelegramApiError } from './telegram.js';
import { createUpdateHandler } from './handler.js';
import { assertPollingAvailable, runPolling } from './polling.js';
import { createWebhookServer } from './webhook.js';

async function main() {
  const env = loadBotEnvironment();
  if (env.TELEGRAM_BOT_MODE === 'disabled') {
    console.info('SchoolRoom bot is disabled. Set TELEGRAM_BOT_MODE after configuring secrets.');
    return;
  }
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  const client = createTelegramClient(env.TELEGRAM_BOT_TOKEN!);
  try {
    const bot = BotInfoSchema.parse(await client.call('getMe', {}, controller.signal));
    const handle = createUpdateHandler(client, env.TELEGRAM_MINI_APP_URL!, bot.username);
    if (env.TELEGRAM_BOT_MODE === 'polling') {
      await assertPollingAvailable(client, controller.signal);
      console.info('SchoolRoom bot: long polling started');
      await runPolling(client, handle, controller.signal);
    } else {
      const app = await createWebhookServer(env.TELEGRAM_WEBHOOK_SECRET!, handle);
      try {
        await app.listen({host: env.BOT_HOST, port: env.BOT_PORT});
        console.info(`SchoolRoom bot: webhook listener on port ${env.BOT_PORT}. Register webhook separately.`);
        if (!controller.signal.aborted) {
          await new Promise<void>((resolve) => controller.signal.addEventListener('abort', () => resolve(), {once: true}));
        }
      } finally { await app.close(); }
    }
  } finally {
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
  }
}

main().catch((error: unknown) => {
  const detail = error instanceof TelegramApiError ? `Telegram API error ${error.code}` :
    error instanceof Error && /^(Invalid bot configuration:|Webhook is active\.)/.test(error.message)
      ? error.message : 'Check bot configuration, network access and port availability';
  console.error(`SchoolRoom bot stopped: ${detail}`);
  process.exitCode = 1;
});
