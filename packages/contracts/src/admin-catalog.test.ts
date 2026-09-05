import { describe, expect, it } from 'vitest';
import {
  ProjectCreateInputSchema,
  ProjectPatchInputSchema,
} from './admin-catalog.js';

const project = {
  title: 'Тестовый школьный проект',
  slug: 'testovyy-shkolnyy-proekt',
  subject: 'История',
  description: null,
  keywords: ['история'],
  coverUrl: null,
  coverKey: 'history-archive',
  priceMinor: 99_900,
  includedMaterials: ['Проект', 'Презентация', 'Продукт', 'Речь'],
  featured: false,
} as const;

describe('admin catalog contracts', () => {
  it('accepts a valid draft and rejects write access to purchase count', () => {
    expect(ProjectCreateInputSchema.parse(project).slug).toBe(project.slug);
    expect(
      ProjectCreateInputSchema.safeParse({ ...project, purchaseCount: 50 })
        .success,
    ).toBe(false);
  });

  it('requires optimistic concurrency and a real change for patches', () => {
    expect(
      ProjectPatchInputSchema.safeParse({
        expectedVersion: 2,
        isPublished: true,
      }).success,
    ).toBe(true);
    expect(
      ProjectPatchInputSchema.safeParse({ expectedVersion: 2 }).success,
    ).toBe(false);
  });
});
