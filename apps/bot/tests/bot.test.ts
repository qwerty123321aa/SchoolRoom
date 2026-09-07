import { afterEach, describe, expect, it, vi } from 'vitest';
import { createUpdateHandler, type TelegramUpdate } from '../src/handler.js';
import { createWebhookServer } from '../src/webhook.js';
import { readBotEnvironment } from '../src/env.js';
import { configureBot } from '../src/configure.js';
import { createTelegramClient, TelegramApiError } from '../src/telegram.js';
import { createSchoolRoomUserRegistrar, SchoolRoomApiError } from '../src/schoolroom-api.js';

const secret = 'test-only-webhook-secret-0000000000000000';
const token = '123456:TEST_ONLY_TOKEN_NOT_A_REAL_CREDENTIAL';
const miniAppUrl = 'https://schoolroom.example/catalog';
const update: TelegramUpdate = {update_id: 41, message: {
  chat: {id: 900, type: 'private'}, from: {
    id: 4503599627370495, is_bot: false, first_name: 'Test', last_name: 'User', username: 'schoolroom_user',
  }, text: '/id',
}};
const apps: Awaited<ReturnType<typeof createWebhookServer>>[] = [];
afterEach(async () => { await Promise.all(apps.splice(0).map((app) => app.close())); });
async function server(handle = vi.fn(async () => {})) {
  const app = await createWebhookServer(secret, handle);
  apps.push(app);
  return {app, handle};
}
const request = {method: 'POST' as const, url: '/telegram/webhook', payload: update,
  headers: {'x-telegram-bot-api-secret-token': secret}};

describe('webhook authentication and delivery', () => {
  it('rejects missing, incorrect and equal-length incorrect secrets before handling', async () => {
    const {app, handle} = await server();
    for (const value of ['', 'wrong', 'x'.repeat(secret.length)]) {
      const response = await app.inject({...request, headers: {'x-telegram-bot-api-secret-token': value}});
      expect(response.statusCode).toBe(401);
    }
    expect(handle).not.toHaveBeenCalled();
  });
  it('rejects invalid and oversized bodies', async () => {
    const {app, handle} = await server();
    expect((await app.inject({...request, payload: {user: {id: 7}}})).statusCode).toBe(400);
    expect((await app.inject({...request, payload: {...update, padding: 'a'.repeat(70_000)}})).statusCode).toBe(413);
    expect(handle).not.toHaveBeenCalled();
  });
  it('deduplicates concurrent and completed deliveries', async () => {
    const {app, handle} = await server();
    const responses = await Promise.all([app.inject(request), app.inject(request)]);
    expect(responses.map((response) => response.statusCode)).toEqual([200, 200]);
    expect((await app.inject(request)).statusCode).toBe(200);
    expect(handle).toHaveBeenCalledTimes(1);
  });
  it('returns 503 on processing errors and retries the same update', async () => {
    const handle = vi.fn().mockRejectedValueOnce(new Error('private data')).mockResolvedValue(undefined);
    const {app} = await server(handle);
    const failed = await app.inject(request);
    expect(failed.statusCode).toBe(503);
    expect(failed.body).not.toContain('private data');
    expect((await app.inject(request)).statusCode).toBe(200);
    expect(handle).toHaveBeenCalledTimes(2);
  });
});

describe('bot commands', () => {
  it('uses the sender ID, not chat ID, and preserves a 52-bit ID', async () => {
    const call = vi.fn().mockResolvedValue(true);
    await createUpdateHandler({call}, miniAppUrl, 'SchoolRoomBot')(update);
    expect(call).toHaveBeenCalledWith('sendMessage', {chat_id: 900, text: 'Ваш Telegram ID: 4503599627370495'}, undefined);
  });
  it('opens the configured Mini App using an inline web_app button', async () => {
    const call = vi.fn().mockResolvedValue(true);
    const registerUser = vi.fn().mockResolvedValue(undefined);
    await createUpdateHandler({call}, miniAppUrl, 'SchoolRoomBot', registerUser)({...update, message: {...update.message!, text: '/start@SchoolRoomBot launch'}});
    expect(call.mock.calls[0]?.[1].reply_markup.inline_keyboard[0][0].web_app.url).toBe(miniAppUrl);
    expect(registerUser).toHaveBeenCalledWith({
      telegramId: '4503599627370495', username: 'schoolroom_user', name: 'Test User',
    }, undefined);
  });
  it('explains all commands and provides the Mini App button in /help', async () => {
    const call = vi.fn().mockResolvedValue(true);
    await createUpdateHandler({call}, miniAppUrl, 'SchoolRoomBot')({...update, message: {...update.message!, text: '/help'}});
    const payload = call.mock.calls[0]?.[1];
    expect(payload.text).toContain('/start');
    expect(payload.text).toContain('/id');
    expect(payload.text).toContain('/help');
    expect(payload.reply_markup.inline_keyboard[0][0].web_app.url).toBe(miniAppUrl);
  });
  it('ignores groups, bot senders, other commands and commands for other bots', async () => {
    const call = vi.fn();
    const handle = createUpdateHandler({call}, miniAppUrl, 'SchoolRoomBot');
    await handle({...update, message: {...update.message!, chat: {id: -1, type: 'group'}}});
    await handle({...update, message: {...update.message!, from: {id: 7, is_bot: true}}});
    await handle({...update, message: {...update.message!, text: '/id@AnotherBot'}});
    await handle({...update, message: {...update.message!, text: '/identity'}});
    await handle({update_id: 42});
    expect(call).not.toHaveBeenCalled();
  });
  it('skips blocked users but propagates transient failures for redelivery', async () => {
    const call = vi.fn().mockRejectedValueOnce(new TelegramApiError(403)).mockRejectedValueOnce(new TelegramApiError(500));
    const handle = createUpdateHandler({call}, miniAppUrl, 'SchoolRoomBot');
    await expect(handle(update)).resolves.toBeUndefined();
    await expect(handle(update)).rejects.toBeInstanceOf(TelegramApiError);
  });
});

describe('bot configuration', () => {
  const polling = {TELEGRAM_BOT_MODE: 'polling', TELEGRAM_BOT_TOKEN: token, TELEGRAM_MINI_APP_URL: miniAppUrl};
  it('defaults to disabled and requires secrets and HTTPS for active modes', () => {
    expect(readBotEnvironment({}).TELEGRAM_BOT_MODE).toBe('disabled');
    expect(() => readBotEnvironment({TELEGRAM_BOT_MODE: 'polling'})).toThrow('TELEGRAM_BOT_TOKEN');
    expect(() => readBotEnvironment({...polling, TELEGRAM_MINI_APP_URL: 'http://localhost:5173'})).toThrow();
    expect(() => readBotEnvironment({...polling, TELEGRAM_BOT_MODE: 'webhook'})).toThrow('TELEGRAM_WEBHOOK_SECRET');
    expect(() => readBotEnvironment({...polling, TELEGRAM_MINI_APP_URL: 'https://user:password@example.com'})).toThrow();
  });
  it('does not echo invalid credentials in errors', () => {
    expect(() => readBotEnvironment({...polling, TELEGRAM_BOT_TOKEN: 'private-token-invalid'})).toThrow(/^Invalid bot configuration: TELEGRAM_BOT_TOKEN$/);
  });
  it('registers webhook explicitly, with secret, without discarding pending updates', async () => {
    const call = vi.fn().mockResolvedValue(true);
    const env = readBotEnvironment({...polling, TELEGRAM_BOT_MODE: 'webhook', TELEGRAM_WEBHOOK_SECRET: secret,
      TELEGRAM_WEBHOOK_URL: 'https://bot.schoolroom.example/telegram/webhook'});
    await configureBot({call}, 'webhook:set', env);
    expect(call).toHaveBeenCalledWith('setWebhook', {url: env.TELEGRAM_WEBHOOK_URL,
      secret_token: secret, allowed_updates: ['message'], max_connections: 1, drop_pending_updates: false});
    await configureBot({call}, 'webhook:delete', env);
    expect(call).toHaveBeenLastCalledWith('deleteWebhook', {drop_pending_updates: false});
  });
  it('registers all user commands and the configured Mini App menu button', async () => {
    const call = vi.fn().mockResolvedValue(true);
    const env = readBotEnvironment(polling);
    await configureBot({call}, 'menu', env);
    expect(call).toHaveBeenNthCalledWith(1, 'setMyCommands', {commands: [
      {command: 'start', description: 'Открыть SchoolRoom'},
      {command: 'id', description: 'Узнать свой Telegram ID'},
      {command: 'help', description: 'Помощь по боту'},
    ]});
    expect(call).toHaveBeenNthCalledWith(2, 'setChatMenuButton', {menu_button: {
      type: 'web_app', text: 'SchoolRoom', web_app: {url: miniAppUrl},
    }});
  });
  it('rejects unexpected webhook paths, query parameters and ports', () => {
    for (const url of ['https://example.com/wrong', 'https://example.com/telegram/webhook?token=abc', 'https://example.com:4200/telegram/webhook']) {
      expect(() => readBotEnvironment({...polling, TELEGRAM_BOT_MODE: 'webhook', TELEGRAM_WEBHOOK_SECRET: secret, TELEGRAM_WEBHOOK_URL: url})).toThrow();
    }
  });
});

describe('Telegram client', () => {
  it('uses HTTPS POST and never follows redirects', async () => {
    const transport = vi.fn().mockResolvedValue(new Response(JSON.stringify({ok: true, result: []})));
    const client = createTelegramClient(token, transport);
    await expect(client.call('getUpdates', {timeout: 25})).resolves.toEqual([]);
    expect(transport.mock.calls[0]?.[0]).toBe(`https://api.telegram.org/bot${token}/getUpdates`);
    expect(transport.mock.calls[0]?.[1]).toMatchObject({method: 'POST', redirect: 'error', body: '{"timeout":25}'});
  });
  it('sanitizes network failures and Telegram response descriptions', async () => {
    const transport = vi.fn().mockRejectedValueOnce(new Error(`https://api.telegram.org/bot${token}/getMe`))
      .mockResolvedValueOnce(new Response(JSON.stringify({ok: false, error_code: 429,
        description: token, parameters: {retry_after: 12}}), {status: 429}));
    const client = createTelegramClient(token, transport);
    await expect(client.call('getMe')).rejects.toThrow('Telegram API request failed (0)');
    await expect(client.call('getMe')).rejects.toMatchObject({code: 429, retryAfterSeconds: 12, message: 'Telegram API request failed (429)'});
  });
});

describe('SchoolRoom API user registration', () => {
  it('sends a signed request without transmitting the bot token', async () => {
    const transport = vi.fn().mockResolvedValue(new Response(null, {status: 204}));
    const register = createSchoolRoomUserRegistrar('http://127.0.0.1:4100', token, transport, () => 1_780_000_000_000);
    await register({telegramId: '4503599627370495', username: 'schoolroom_user', name: 'Test User'});
    const [url, options] = transport.mock.calls[0]!;
    expect(String(url)).toBe('http://127.0.0.1:4100/internal/v1/telegram/users');
    expect(options.body).not.toContain(token);
    expect(JSON.stringify(options.headers)).not.toContain(token);
    expect(options.headers['X-SchoolRoom-Signature']).toMatch(/^[a-f\d]{64}$/);
  });
  it('sanitizes API and network failures', async () => {
    const failedResponse = vi.fn().mockResolvedValue(new Response('private', {status: 500}));
    const failedNetwork = vi.fn().mockRejectedValue(new Error(token));
    const user = {telegramId: '1', username: null, name: 'User'};
    await expect(createSchoolRoomUserRegistrar('http://127.0.0.1:4100', token, failedResponse)(user)).rejects.toBeInstanceOf(SchoolRoomApiError);
    await expect(createSchoolRoomUserRegistrar('http://127.0.0.1:4100', token, failedNetwork)(user)).rejects.toThrow('SchoolRoom API user registration failed');
  });
});
