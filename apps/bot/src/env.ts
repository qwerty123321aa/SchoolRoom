import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const optional = (schema: z.ZodType<string>) => z.preprocess(
  (value) => typeof value === 'string' && !value.trim() ? undefined : value,
  schema.optional(),
);
const httpsUrl = z.url().refine((value) => {
  const url = new URL(value);
  return url.protocol === 'https:' && !url.username && !url.password && !url.hash;
}, 'Use an HTTPS URL without credentials or a fragment');

const schema = z.object({
  TELEGRAM_BOT_MODE: z.enum(['disabled', 'polling', 'webhook']).default('disabled'),
  TELEGRAM_BOT_TOKEN: optional(z.string().trim().regex(/^\d+:[A-Za-z0-9_-]{20,}$/)),
  TELEGRAM_MINI_APP_URL: optional(httpsUrl),
  TELEGRAM_WEBHOOK_URL: optional(httpsUrl.refine((value) => {
    const url = new URL(value);
    return url.pathname === '/telegram/webhook' && !url.search &&
      ['', '443', '80', '88', '8443'].includes(url.port);
  }, 'Webhook URL must end in /telegram/webhook on a Telegram-supported port')),
  TELEGRAM_WEBHOOK_SECRET: optional(z.string().regex(/^[A-Za-z0-9_-]{32,256}$/)),
  BOT_HOST: z.string().default('127.0.0.1'),
  BOT_PORT: z.coerce.number().int().min(1).max(65535).default(4200),
}).superRefine((env, context) => {
  if (env.TELEGRAM_BOT_MODE === 'disabled') return;
  for (const field of ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_MINI_APP_URL'] as const) {
    if (!env[field]) context.addIssue({code: 'custom', path: [field], message: 'Required for an active bot'});
  }
  if (env.TELEGRAM_BOT_MODE === 'webhook') {
    for (const field of ['TELEGRAM_WEBHOOK_URL', 'TELEGRAM_WEBHOOK_SECRET'] as const) {
      if (!env[field]) context.addIssue({code: 'custom', path: [field], message: 'Required for webhook mode'});
    }
  }
});

export function readBotEnvironment(source: NodeJS.ProcessEnv = process.env) {
  const result = schema.safeParse(source);
  if (!result.success) {
    // Never print Zod's raw issues or environment values: they may contain secrets.
    const fields = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))];
    throw new Error(`Invalid bot configuration: ${fields.join(', ')}`);
  }
  return result.data;
}

export function loadBotEnvironment() {
  config({path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true});
  return readBotEnvironment();
}
