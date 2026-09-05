import type { TelegramIdentity } from './telegram-init-data.js';

export interface UserRepository {
  upsertTelegramUser(identity: TelegramIdentity): Promise<string>;
}
