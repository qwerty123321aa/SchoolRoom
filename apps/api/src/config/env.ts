import { z } from 'zod';

const BooleanEnvironmentSchema = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const OptionalSecretSchema = z.preprocess(
  (value) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  z.string().trim().min(20).optional(),
);

const EnvironmentSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    API_HOST: z.string().default('0.0.0.0'),
    API_PORT: z.coerce.number().int().min(1).max(65_535).default(4100),
    DATABASE_URL: z.url(),
    CORS_ORIGINS: z.string().default('http://localhost:5173'),
    DEV_AUTH_ENABLED: BooleanEnvironmentSchema,
    TELEGRAM_BOT_TOKEN: OptionalSecretSchema,
    TELEGRAM_AUTH_MAX_AGE_SECONDS: z.coerce
      .number()
      .int()
      .min(60)
      .max(86_400)
      .default(3600),
    ADMIN_TELEGRAM_IDS: z
      .string()
      .default('')
      .refine(
        (value) =>
          value.trim() === '' ||
          value
            .split(',')
            .map((item) => item.trim())
            .every((item) => /^\d{1,16}$/.test(item)),
        'Admin Telegram IDs must be comma-separated positive integers',
      ),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
  })
  .superRefine((environment, context) => {
    if (environment.NODE_ENV === 'production' && environment.DEV_AUTH_ENABLED) {
      context.addIssue({
        code: 'custom',
        path: ['DEV_AUTH_ENABLED'],
        message: 'Development authentication cannot be enabled in production',
      });
    }
    if (
      environment.NODE_ENV === 'production' &&
      !environment.TELEGRAM_BOT_TOKEN
    ) {
      context.addIssue({
        code: 'custom',
        path: ['TELEGRAM_BOT_TOKEN'],
        message: 'Telegram bot token is required in production',
      });
    }
    if (
      environment.NODE_ENV === 'production' &&
      environment.ADMIN_TELEGRAM_IDS.trim() === ''
    ) {
      context.addIssue({
        code: 'custom',
        path: ['ADMIN_TELEGRAM_IDS'],
        message: 'At least one administrator is required in production',
      });
    }
  });

export type Environment = z.infer<typeof EnvironmentSchema> & {
  corsOrigins: string[];
  adminTelegramIds: bigint[];
};

export function readEnvironment(
  source: NodeJS.ProcessEnv = process.env,
): Environment {
  const parsed = EnvironmentSchema.parse(source);

  return {
    ...parsed,
    corsOrigins: parsed.CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    adminTelegramIds: parsed.ADMIN_TELEGRAM_IDS.split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => BigInt(item)),
  };
}
