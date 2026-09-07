import { z } from 'zod';
import { TelegramApiError, type TelegramClient } from './telegram.js';

export const UpdateSchema = z.object({
  update_id: z.number().int().nonnegative().safe(),
  message: z.object({
    from: z.object({
      id: z.number().int().positive().safe(),
      is_bot: z.boolean(),
      first_name: z.string().trim().min(1).max(128).optional(),
      last_name: z.string().trim().max(128).optional(),
      username: z.string().trim().min(1).max(64).optional(),
    }).optional(),
    chat: z.object({id: z.number().int().safe(), type: z.string()}),
    text: z.string().optional(),
  }).optional(),
});
export type TelegramUpdate = z.infer<typeof UpdateSchema>;

export interface TelegramBotUser {
  telegramId: string;
  username: string | null;
  name: string;
}

export type RegisterTelegramBotUser = (user: TelegramBotUser, signal?: AbortSignal) => Promise<void>;

export function createUpdateHandler(client: TelegramClient, miniAppUrl: string, botUsername: string,
  registerUser: RegisterTelegramBotUser = async () => {}) {
  return async (update: TelegramUpdate, signal?: AbortSignal) => {
    const message = update.message;
    if (!message?.from || message.from.is_bot || message.chat.type !== 'private') return;
    const match = /^\/(start|id|help)(?:@([A-Za-z0-9_]+))?(?:\s|$)/.exec(message.text ?? '');
    if (!match || (match[2] && match[2].toLowerCase() !== botUsername.toLowerCase())) return;

    let payload: Record<string, unknown>;
    if (match[1] === 'id') {
      payload = {chat_id: message.chat.id, text: `Ваш Telegram ID: ${String(message.from.id)}`};
    } else if (match[1] === 'help') {
      payload = {
        chat_id: message.chat.id,
        text: 'SchoolRoom помогает открыть каталог готовых школьных проектов.\n\n/start — открыть Mini App\n/id — показать ваш Telegram ID\n/help — показать эту справку',
        reply_markup: {inline_keyboard: [[{text: 'Открыть SchoolRoom', web_app: {url: miniAppUrl}}]]},
      };
    } else {
      const name = [message.from.first_name, message.from.last_name].filter(Boolean).join(' ') || 'Telegram user';
      await registerUser({
        telegramId: String(message.from.id),
        username: message.from.username ?? null,
        name,
      }, signal);
      payload = {
        chat_id: message.chat.id,
        text: 'Добро пожаловать в SchoolRoom! Откройте приложение, чтобы посмотреть готовые проекты.',
        reply_markup: {inline_keyboard: [[{text: 'Открыть SchoolRoom', web_app: {url: miniAppUrl}}]]},
      };
    }
    try {
      await client.call('sendMessage', payload, signal);
    } catch (error) {
      // A user blocking the bot must not hold up the polling queue indefinitely.
      if (error instanceof TelegramApiError && error.code === 403) return;
      throw error;
    }
  };
}

export type UpdateHandler = (update: TelegramUpdate, signal?: AbortSignal) => Promise<void>;
