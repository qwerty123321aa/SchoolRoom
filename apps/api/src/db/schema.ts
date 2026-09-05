import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    telegramId: bigint('telegram_id', { mode: 'bigint' }).notNull(),
    username: text('username'),
    telegramName: text('telegram_name'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex('users_telegram_id_uq').on(table.telegramId)],
);

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    subject: text('subject').notNull(),
    description: text('description'),
    keywords: text('keywords').array().default([]).notNull(),
    coverUrl: text('cover_url'),
    coverKey: text('cover_key').notNull(),
    priceMinor: integer('price_minor').notNull(),
    currency: text('currency').default('RUB').notNull(),
    includedMaterials: text('included_materials').array().default([]).notNull(),
    purchaseCount: integer('purchase_count').default(0).notNull(),
    featured: boolean('featured').default(false).notNull(),
    isPublished: boolean('is_published').default(false).notNull(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    version: integer('version').default(1).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('projects_slug_uq').on(table.slug),
    index('projects_catalog_idx').on(
      table.isPublished,
      table.subject,
      table.featured,
    ),
    check('projects_price_minor_nonnegative', sql`${table.priceMinor} >= 0`),
    check(
      'projects_purchase_count_nonnegative',
      sql`${table.purchaseCount} >= 0`,
    ),
    check('projects_version_positive', sql`${table.version} > 0`),
    check('projects_currency_rub', sql`${table.currency} = 'RUB'`),
    check(
      'projects_subject_supported',
      sql`${table.subject} in ('История', 'Биология', 'География', 'Обществознание', 'Литература', 'Английский язык', 'Информатика', 'Другое')`,
    ),
  ],
);

export const favorites = pgTable(
  'favorites',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.projectId] }),
    index('favorites_project_idx').on(table.projectId),
  ],
);

export const projectEntitlements = pgTable(
  'project_entitlements',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'restrict' }),
    materialsAvailable: boolean('materials_available').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.projectId] }),
    index('project_entitlements_project_idx').on(table.projectId),
  ],
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actorUserId: uuid('actor_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    beforeState: jsonb('before_state').$type<Record<string, unknown> | null>(),
    afterState: jsonb('after_state').$type<Record<string, unknown> | null>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('audit_logs_entity_idx').on(table.entityType, table.entityId),
    index('audit_logs_actor_idx').on(table.actorUserId, table.createdAt),
  ],
);

export type ProjectRow = typeof projects.$inferSelect;
