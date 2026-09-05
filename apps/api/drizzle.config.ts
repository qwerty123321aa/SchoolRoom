import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';
import { fileURLToPath } from 'node:url';

config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required for database commands');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
