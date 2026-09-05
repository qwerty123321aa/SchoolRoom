import { z } from 'zod';
import { MoneySchema } from './common.js';

export const CATALOG_SUBJECTS = [
  'История',
  'Биология',
  'География',
  'Обществознание',
  'Литература',
  'Английский язык',
  'Информатика',
  'Другое',
] as const;

export const CatalogSubjectSchema = z.enum(CATALOG_SUBJECTS);
export type CatalogSubject = z.infer<typeof CatalogSubjectSchema>;

const BooleanQuerySchema = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

export const CatalogQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  subject: CatalogSubjectSchema.optional(),
  featured: BooleanQuerySchema.optional(),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(48).default(24),
});

export type CatalogQuery = z.infer<typeof CatalogQuerySchema>;

export const ProjectCoverSchema = z.object({
  key: z.string().min(1),
  alt: z.string().min(1),
  url: z.url().nullable(),
});

export const ProjectSummarySchema = z.object({
  id: z.uuid(),
  slug: z.string().min(1),
  title: z.string().min(1),
  subject: CatalogSubjectSchema,
  cover: ProjectCoverSchema,
  price: MoneySchema,
  featured: z.boolean(),
});

export type ProjectSummary = z.infer<typeof ProjectSummarySchema>;

export const ProjectDetailSchema = ProjectSummarySchema.extend({
  description: z.string().nullable(),
  includedMaterials: z.array(z.string().min(1)),
});

export type ProjectDetail = z.infer<typeof ProjectDetailSchema>;

export const CatalogResponseSchema = z.object({
  items: z.array(ProjectSummarySchema),
  pagination: z.object({
    offset: z.number().int().nonnegative(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    hasMore: z.boolean(),
  }),
});

export type CatalogResponse = z.infer<typeof CatalogResponseSchema>;

export const CatalogMetaResponseSchema = z.object({
  subjects: z.array(CatalogSubjectSchema),
});

export const FavoriteMutationResponseSchema = z.object({
  projectId: z.uuid(),
  isFavorite: z.boolean(),
});

export const FavoritesResponseSchema = z.object({
  items: z.array(ProjectSummarySchema),
});

export type FavoriteMutationResponse = z.infer<
  typeof FavoriteMutationResponseSchema
>;
