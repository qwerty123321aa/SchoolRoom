import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import Fastify, { type FastifyServerOptions } from 'fastify';
import { ZodError } from 'zod';
import {
  registerCatalogRoutes,
} from './modules/catalog/catalog.routes.js';
import { CatalogNotFoundError, CatalogService } from './modules/catalog/catalog.service.js';
import type {
  CatalogRepository,
} from './modules/catalog/catalog.repository.js';
import type { TelegramInitDataVerifier } from './modules/auth/telegram-init-data.js';
import type { UserRepository } from './modules/auth/auth.repository.js';
import { registerAuthRoutes } from './modules/auth/auth.routes.js';
import {
  AuthenticationRequiredError,
  RequestAuthenticator,
} from './modules/auth/authenticator.js';
import type { ProjectAccessRepository } from './modules/access/access.repository.js';
import { registerProjectAccessRoutes } from './modules/access/access.routes.js';
import {
  ProjectAccessNotFoundError,
  ProjectAccessService,
} from './modules/access/access.service.js';
import type { AdminCatalogRepository } from './modules/admin/admin-catalog.repository.js';
import {
  AdminForbiddenError,
  registerAdminCatalogRoutes,
} from './modules/admin/admin-catalog.routes.js';
import {
  AdminCatalogService,
  AdminProjectConflictError,
  AdminProjectNotFoundError,
} from './modules/admin/admin-catalog.service.js';

export interface CreateAppOptions {
  catalogRepository: CatalogRepository;
  userRepository: UserRepository;
  corsOrigins: string[];
  developmentAuthEnabled: boolean;
  telegramInitDataVerifier?: TelegramInitDataVerifier | undefined;
  accessRepository?: ProjectAccessRepository;
  adminCatalogRepository?: AdminCatalogRepository;
  adminTelegramIds?: bigint[];
  readinessCheck?: () => Promise<void>;
  logger?: FastifyServerOptions['logger'];
}

export async function createApp(options: CreateAppOptions) {
  const app = Fastify({
    logger: options.logger ?? false,
  });
  const authenticator = new RequestAuthenticator({
    users: options.userRepository,
    developmentAuthEnabled: options.developmentAuthEnabled,
    telegramInitDataVerifier: options.telegramInitDataVerifier,
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });
  await app.register(cors, {
    origin: options.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: [
      'Accept',
      'Content-Type',
      'Authorization',
      'X-Dev-Telegram-User-Id',
    ],
  });

  app.get('/health', async () => ({ status: 'ok' }));
  app.get('/health/live', async () => ({ status: 'ok' }));
  app.get('/health/ready', async (_request, reply) => {
    try {
      await options.readinessCheck?.();
      return { status: 'ready' };
    } catch {
      return reply.status(503).send({ status: 'unavailable' });
    }
  });

  await registerAuthRoutes(app, (request) => authenticator.authenticate(request));

  await registerCatalogRoutes(app, {
    service: new CatalogService(options.catalogRepository),
    authenticate: (request) => authenticator.authenticate(request),
  });

  if (options.accessRepository) {
    await registerProjectAccessRoutes(app, {
      service: new ProjectAccessService(options.accessRepository),
      authenticate: (request) => authenticator.authenticate(request),
    });
  }

  if (options.adminCatalogRepository) {
    await registerAdminCatalogRoutes(app, {
      service: new AdminCatalogService(options.adminCatalogRepository),
      authenticate: (request) => authenticator.authenticate(request),
      ownerTelegramIds: new Set(options.adminTelegramIds ?? []),
    });
  }

  app.setNotFoundHandler((request, reply) => {
    return reply.status(404).send({
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: 'Маршрут не найден',
        requestId: request.id,
      },
    });
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Проверьте параметры запроса',
          requestId: request.id,
        },
      });
    }

    if (error instanceof CatalogNotFoundError) {
      return reply.status(404).send({
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: error.message,
          requestId: request.id,
        },
      });
    }

    if (error instanceof ProjectAccessNotFoundError) {
      return reply.status(404).send({
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: error.message,
          requestId: request.id,
        },
      });
    }

    if (error instanceof AdminProjectNotFoundError) {
      return reply.status(404).send({
        error: {
          code: 'ADMIN_PROJECT_NOT_FOUND',
          message: error.message,
          requestId: request.id,
        },
      });
    }

    if (error instanceof AdminProjectConflictError) {
      return reply.status(409).send({
        error: {
          code:
            error.reason === 'VERSION'
              ? 'PROJECT_VERSION_CONFLICT'
              : 'PROJECT_SLUG_CONFLICT',
          message: error.message,
          requestId: request.id,
        },
      });
    }

    if (error instanceof AdminForbiddenError) {
      return reply.status(403).send({
        error: {
          code: 'ADMIN_FORBIDDEN',
          message: error.message,
          requestId: request.id,
        },
      });
    }

    if (error instanceof AuthenticationRequiredError) {
      return reply.status(401).send({
        error: {
          code: 'AUTH_REQUIRED',
          message: error.message,
          requestId: request.id,
        },
      });
    }

    request.log.error({ error }, 'Unhandled request error');
    return reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Не удалось выполнить запрос. Попробуйте ещё раз',
        requestId: request.id,
      },
    });
  });

  return app;
}
