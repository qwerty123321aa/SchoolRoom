import { z } from 'zod';
import { TelegramApiError, type TelegramClient } from './telegram.js';

export const UpdateSchema = z.object({
  update_id: z.number().int().nonnegative().safe(),
  message: z.object({
    from: z.object({id: z.number().int().positive().safe(), is_bot: z.boolean()}).optional(),
    chat: z.object({id: z.number().int().safe(), type: z.string()}),
    text: z.string().optional(),
  }).optional(),
});
export type TelegramUpdate = z.infer<typeof UpdateSchema>;

export function createUpdateHandler(client: TelegramClient, miniAppUrl: string, botUsername: string) {
  return async (update: TelegramUpdate, signal?: AbortSignal) => {
    const message = update.message;
    if (!message?.from || message.from.is_bot || message.chat.type !== 'private') return;
    const match = /^\/(start|id)(?:@([A-Za-z0-9_]+))?(?:\s|$)/.exec(message.text ?? '');
    if (!match || (match[2] && match[2].toLowerCase() !== botUsername.toLowerCase())) return;

    const payload = match[1] === 'id'
      ? {chat_id: message.chat.id, text: `Ваш Telegram ID: ${String(message.from.id)}`}
      : {
          chat_id: message.chat.id,
          text: 'Добро пожаловать в SchoolRoom! Откройте приложение, чтобы посмотреть готовые проекты.',
          reply_markup: {inline_keyboard: [[{text: 'Открыть SchoolRoom', web_app: {url: miniAppUrl}}]]},
        };
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
