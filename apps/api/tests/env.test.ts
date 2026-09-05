import { describe, expect, it } from 'vitest';
import { readEnvironment } from '../src/config/env.js';

const baseEnvironment = {
  DATABASE_URL: 'postgresql://schoolroom:schoolroom@localhost:5432/schoolroom',
};

describe('environment', () => {
  it('parses the CORS allowlist', () => {
    expect(
      readEnvironment({
        ...baseEnvironment,
        CORS_ORIGINS: 'https://schoolroom.example, https://admin.example',
      }).corsOrigins,
    ).toEqual(['https://schoolroom.example', 'https://admin.example']);
  });

  it('fails closed when development auth is enabled in production', () => {
    expect(() =>
      readEnvironment({
        ...baseEnvironment,
        NODE_ENV: 'production',
        DEV_AUTH_ENABLED: 'true',
      }),
    ).toThrow();
  });

  it('requires the Telegram bot token in production', () => {
    expect(() =>
      readEnvironment({
        ...baseEnvironment,
        NODE_ENV: 'production',
        DEV_AUTH_ENABLED: 'false',
      }),
    ).toThrow();
  });

  it('accepts a bounded Telegram authentication lifetime', () => {
    expect(
      readEnvironment({
        ...baseEnvironment,
        TELEGRAM_AUTH_MAX_AGE_SECONDS: '600',
      }).TELEGRAM_AUTH_MAX_AGE_SECONDS,
    ).toBe(600);
    expect(() =>
      readEnvironment({
        ...baseEnvironment,
        TELEGRAM_AUTH_MAX_AGE_SECONDS: '10',
      }),
    ).toThrow();
  });
});
