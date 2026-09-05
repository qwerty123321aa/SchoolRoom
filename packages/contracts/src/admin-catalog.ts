import { z } from 'zod';
import { CatalogSubjectSchema } from './catalog.js';
import { CurrencySchema } from './common.js';

const ProjectEditableFieldsSchema = z.object({
  title: z.string().trim().min(3).max(180),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  subject: CatalogSubjectSchema,
  description: z.string().trim().max(5000).nullable(),
  keywords: z.array(z.string().trim().min(1).max(80)).max(24),
  coverUrl: z.url().nullable(),
  coverKey: z.string().trim().min(1).max(100),
  priceMinor: z.number().int().nonnegative().max(10_000_000),
  includedMaterials: z.array(z.string().trim().min(1).max(100)).min(1).max(12),
  featured: z.boolean(),
});

export const ProjectCreateInputSchema = ProjectEditableFieldsSchema.strict();
export type ProjectCreateInput = z.infer<typeof ProjectCreateInputSchema>;

export const ProjectPatchInputSchema = ProjectEditableFieldsSchema.partial()
  .extend({
    expectedVersion: z.number().int().positive(),
    isPublished: z.boolean().optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).some((key) => key !== 'expectedVersion'), {
    message: 'At least one project field must be changed',
  });
export type ProjectPatchInput = z.infer<typeof ProjectPatchInputSchema>;

export const AdminProjectSchema = ProjectEditableFieldsSchema.extend({
  id: z.uuid(),
  currency: CurrencySchema,
  purchaseCount: z.number().int().nonnegative(),
  isPublished: z.boolean(),
  archivedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  version: z.number().int().positive(),
});
export type AdminProject = z.infer<typeof AdminProjectSchema>;

export const AdminProjectListStatusSchema = z.enum([
  'all',
  'published',
  'draft',
  'archived',
]);

export const AdminProjectListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: AdminProjectListStatusSchema.default('all'),
});
export type AdminProjectListQuery = z.infer<
  typeof AdminProjectListQuerySchema
>;

export const AdminProjectListResponseSchema = z.object({
  items: z.array(AdminProjectSchema),
});

export const AdminProjectResponseSchema = z.object({
  project: AdminProjectSchema,
});
