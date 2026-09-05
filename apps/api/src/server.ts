import { sql } from 'drizzle-orm';
import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { readEnvironment } from './config/env.js';
import { createDatabase } from './db/client.js';
import { DrizzleSchoolRoomRepository } from './modules/catalog/drizzle-catalog.repository.js';
import { createTelegramInitDataVerifier } from './modules/auth/telegram-init-data.js';
import { DrizzleProjectAccessRepository } from './modules/access/drizzle-access.repository.js';
import { DrizzleAdminCatalogRepository } from './modules/admin/drizzle-admin-catalog.repository.js';

config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) });

const environment = readEnvironment();
const database = createDatabase(environment.DATABASE_URL);
const repository = new DrizzleSchoolRoomRepository(database.db);
const accessRepository = new DrizzleProjectAccessRepository(database.db);
const adminCatalogRepository = new DrizzleAdminCatalogRepository(database.db);
const telegramInitDataVerifier = environment.TELEGRAM_BOT_TOKEN
  ? createTelegramInitDataVerifier({
      botToken: environment.TELEGRAM_BOT_TOKEN,
      maxAgeSeconds: environment.TELEGRAM_AUTH_MAX_AGE_SECONDS,
    })
  : undefined;
const redactedLogPaths = [
  'req.headers.authorization',
  'req.headers.x-dev-telegram-user-id',
];

const app = await createApp({
  catalogRepository: repository,
  userRepository: repository,
  corsOrigins: environment.corsOrigins,
  developmentAuthEnabled: environment.DEV_AUTH_ENABLED,
  telegramInitDataVerifier,
  accessRepository,
  adminCatalogRepository,
  adminTelegramIds: environment.adminTelegramIds,
  readinessCheck: async () => {
    await database.db.execute(sql`select 1`);
  },
  logger:
    environment.NODE_ENV === 'development'
      ? {
          level: environment.LOG_LEVEL,
          redact: redactedLogPaths,
          transport: { target: 'pino-pretty' },
        }
      : { level: environment.LOG_LEVEL, redact: redactedLogPaths },
});

async function close(signal: string) {
  app.log.info({ signal }, 'Stopping SchoolRoom API');
  await app.close();
  await database.close();
  process.exit(0);
}

process.once('SIGINT', () => void close('SIGINT'));
process.once('SIGTERM', () => void close('SIGTERM'));

try {
  await app.listen({
    host: environment.API_HOST,
    port: environment.API_PORT,
  });
} catch (error) {
  app.log.error(error);
  await database.close();
  process.exit(1);
}
