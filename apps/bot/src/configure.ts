import { loadBotEnvironment } from './env.js';
import { BotInfoSchema, createTelegramClient, TelegramApiError, WebhookInfoSchema, type TelegramClient } from './telegram.js';

export async function configureBot(client: TelegramClient, command: string, env: ReturnType<typeof loadBotEnvironment>) {
  if (command === 'webhook:set') {
    if (env.TELEGRAM_BOT_MODE !== 'webhook' || !env.TELEGRAM_WEBHOOK_URL || !env.TELEGRAM_WEBHOOK_SECRET) {
      throw new Error('Webhook mode and configuration are required');
    }
    await client.call('setWebhook', {url: env.TELEGRAM_WEBHOOK_URL, secret_token: env.TELEGRAM_WEBHOOK_SECRET,
      allowed_updates: ['message'], max_connections: 1, drop_pending_updates: false});
  } else if (command === 'webhook:delete') {
    await client.call('deleteWebhook', {drop_pending_updates: false});
  } else if (command === 'menu') {
    if (!env.TELEGRAM_MINI_APP_URL) throw new Error('Mini App URL is required');
    await client.call('setMyCommands', {commands: [
      {command: 'start', description: 'Открыть SchoolRoom'},
      {command: 'id', description: 'Узнать свой Telegram ID'},
      {command: 'help', description: 'Помощь по боту'},
    ]});
    await client.call('setChatMenuButton', {menu_button: {type: 'web_app', text: 'SchoolRoom', web_app: {url: env.TELEGRAM_MINI_APP_URL}}});
  } else if (command === 'status') {
    const bot = BotInfoSchema.parse(await client.call('getMe'));
    const webhook = WebhookInfoSchema.parse(await client.call('getWebhookInfo'));
    // Do not print the webhook URL, secret, or Telegram's error descriptions.
    return {username: bot.username, webhookActive: Boolean(webhook.url), pendingUpdates: webhook.pending_update_count};
  } else { throw new Error('Unknown command'); }
  return {ok: true, command};
}

// Kept separate from the normal bot lifecycle: no automatic webhook deletion/registration.
if (process.argv[1]?.endsWith('/configure.ts') || process.argv[1]?.endsWith('/configure.js')) {
  try {
    const env = loadBotEnvironment();
    if (!env.TELEGRAM_BOT_TOKEN) throw new Error('Bot token required');
    console.info(await configureBot(createTelegramClient(env.TELEGRAM_BOT_TOKEN), process.argv[2] ?? 'status', env));
  } catch (error) {
    console.error(error instanceof TelegramApiError ? `Telegram API error ${error.code}` :
      'Bot configuration failed. Check environment and command: status | menu | webhook:set | webhook:delete');
    process.exitCode = 1;
  }
}
