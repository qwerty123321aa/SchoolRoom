import type { FastifyRequest } from 'fastify';
import type { UserRepository } from './auth.repository.js';
import type {
  TelegramIdentity,
  TelegramInitDataVerifier,
} from './telegram-init-data.js';

export class AuthenticationRequiredError extends Error {
  constructor() {
    super('Откройте SchoolRoom через Telegram, чтобы продолжить');
    this.name = 'AuthenticationRequiredError';
  }
}

export interface AuthenticatedUser {
  userId: string;
  identity: TelegramIdentity;
}

export interface RequestAuthenticatorOptions {
  users: UserRepository;
  developmentAuthEnabled: boolean;
  telegramInitDataVerifier?: TelegramInitDataVerifier | undefined;
}

export class RequestAuthenticator {
  constructor(private readonly options: RequestAuthenticatorOptions) {}

  async authenticate(request: FastifyRequest): Promise<AuthenticatedUser> {
    const authorization = request.headers.authorization;

    if (authorization) {
      const match = /^tma (.+)$/i.exec(authorization);
      if (!match?.[1] || !this.options.telegramInitDataVerifier) {
        throw new AuthenticationRequiredError();
      }

      let identity: TelegramIdentity;
      try {
        identity = this.options.telegramInitDataVerifier(match[1]);
      } catch {
        throw new AuthenticationRequiredError();
      }

      const userId = await this.options.users.upsertTelegramUser(identity);
      return { userId, identity };
    }

    const developmentUserId = request.headers['x-dev-telegram-user-id'];
    if (
      this.options.developmentAuthEnabled &&
      typeof developmentUserId === 'string' &&
      /^\d{1,16}$/.test(developmentUserId)
    ) {
      const identity: TelegramIdentity = {
        telegramId: BigInt(developmentUserId),
        username: null,
        name: 'Development user',
        authDate: new Date(),
      };
      const userId = await this.options.users.upsertTelegramUser(identity);
      return { userId, identity };
    }

    throw new AuthenticationRequiredError();
  }
}
