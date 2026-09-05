import {
  and,
  desc,
  eq,
  isNull,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import {
  CatalogSubjectSchema,
  type CatalogQuery,
} from '@schoolroom/contracts';
import type { Database } from '../../db/client.js';
import { favorites, projects, users, type ProjectRow } from '../../db/schema.js';
import type { TelegramIdentity } from '../auth/telegram-init-data.js';
import type { UserRepository } from '../auth/auth.repository.js';
import type {
  CatalogProjectRecord,
  CatalogRepository,
} from './catalog.repository.js';

export class DrizzleSchoolRoomRepository
  implements CatalogRepository, UserRepository
{
  constructor(private readonly db: Database) {}

  async list(query: CatalogQuery) {
    const conditions = buildCatalogConditions(query);
    const where = and(...conditions);

    const [rows, countRows] = await Promise.all([
      this.db
        .select()
        .from(projects)
        .where(where)
        .orderBy(
          desc(projects.featured),
          desc(projects.purchaseCount),
          desc(projects.createdAt),
          desc(projects.id),
        )
        .limit(query.limit)
        .offset(query.offset),
      this.db
        .select({ total: sql<number>`count(*)::int` })
        .from(projects)
        .where(where),
    ]);

    return {
      items: rows.map(toRecord),
      total: countRows[0]?.total ?? 0,
    };
  }

  async findBySlug(slug: string) {
    const rows = await this.db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.slug, slug),
          eq(projects.isPublished, true),
          isNull(projects.archivedAt),
        ),
      )
      .limit(1);

    const project = rows[0];
    if (!project) return null;

    return toRecord(project);
  }

  async listPopular(limit: number) {
    const rows = await this.db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.isPublished, true),
          isNull(projects.archivedAt),
          or(eq(projects.featured, true), sql`${projects.purchaseCount} > 0`),
        ),
      )
      .orderBy(
        desc(projects.purchaseCount),
        desc(projects.featured),
        desc(projects.createdAt),
        desc(projects.id),
      )
      .limit(limit);

    return rows.map(toRecord);
  }

  async listFavorites(userId: string) {
    const rows = await this.db
      .select({ project: projects })
      .from(favorites)
      .innerJoin(projects, eq(favorites.projectId, projects.id))
      .where(
        and(
          eq(favorites.userId, userId),
          eq(projects.isPublished, true),
          isNull(projects.archivedAt),
        ),
      )
      .orderBy(desc(favorites.createdAt));

    return rows.map(({ project }) => toRecord(project));
  }

  async addFavorite(userId: string, projectId: string) {
    const project = await this.db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.isPublished, true),
          isNull(projects.archivedAt),
        ),
      )
      .limit(1);

    if (!project[0]) return false;

    await this.db
      .insert(favorites)
      .values({ userId, projectId })
      .onConflictDoNothing();
    return true;
  }

  async removeFavorite(userId: string, projectId: string) {
    const project = await this.db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project[0]) return false;

    await this.db
      .delete(favorites)
      .where(
        and(
          eq(favorites.userId, userId),
          eq(favorites.projectId, projectId),
        ),
      );
    return true;
  }

  async upsertTelegramUser(identity: TelegramIdentity) {
    const rows = await this.db
      .insert(users)
      .values({
        telegramId: identity.telegramId,
        username: identity.username,
        telegramName: identity.name,
      })
      .onConflictDoUpdate({
        target: users.telegramId,
        set: {
          username: identity.username,
          telegramName: identity.name,
          updatedAt: new Date(),
        },
      })
      .returning({ id: users.id });

    const user = rows[0];
    if (!user) {
      throw new Error('Failed to resolve the development user');
    }
    return user.id;
  }
}

function buildCatalogConditions(query: CatalogQuery): SQL[] {
  const conditions: SQL[] = [
    eq(projects.isPublished, true),
    isNull(projects.archivedAt),
  ];

  if (query.subject) {
    conditions.push(eq(projects.subject, query.subject));
  }

  if (query.featured) {
    conditions.push(
      or(eq(projects.featured, true), sql`${projects.purchaseCount} > 0`)!,
    );
  }

  if (query.q) {
    const normalizedQuery = query.q
      .normalize('NFKC')
      .toLocaleLowerCase('ru-RU')
      .replaceAll('ё', 'е');
    const escaped = normalizedQuery.replace(/[\\%_]/g, '\\$&');
    const pattern = `%${escaped}%`;
    conditions.push(
      or(
        sql`translate(lower(${projects.title}), 'ё', 'е') like ${pattern} escape '\\'`,
        sql`translate(lower(${projects.subject}), 'ё', 'е') like ${pattern} escape '\\'`,
        sql`translate(lower(coalesce(${projects.description}, '')), 'ё', 'е') like ${pattern} escape '\\'`,
        sql`translate(lower(array_to_string(${projects.keywords}, ' ')), 'ё', 'е') like ${pattern} escape '\\'`,
      )!,
    );
  }

  return conditions;
}

function toRecord(project: ProjectRow): CatalogProjectRecord {
  return {
    id: project.id,
    slug: project.slug,
    title: project.title,
    subject: CatalogSubjectSchema.parse(project.subject),
    description: project.description,
    keywords: project.keywords,
    coverUrl: project.coverUrl,
    coverKey: project.coverKey,
    priceMinor: project.priceMinor,
    currency: 'RUB',
    includedMaterials: project.includedMaterials,
    purchaseCount: project.purchaseCount,
    featured: project.featured,
  };
}
