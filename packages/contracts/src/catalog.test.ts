import { describe, expect, it } from 'vitest';
import { CatalogQuerySchema } from './catalog.js';

describe('CatalogQuerySchema', () => {
  it('coerces pagination and keeps the supported subject', () => {
    expect(
      CatalogQuerySchema.parse({
        subject: 'История',
        offset: '24',
        limit: '12',
      }),
    ).toEqual({ subject: 'История', offset: 24, limit: 12 });
  });

  it('rejects class as an unsupported catalog filter', () => {
    const parsed = CatalogQuerySchema.strict().safeParse({
      class: 10,
      offset: 0,
      limit: 24,
    });
    expect(parsed.success).toBe(false);
  });
});
