import {
  and,
  desc,
  eq,
  ilike,
  isNotNull,
  isNull,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import type {
  AdminProjectListQuery,
  ProjectCreateInput,
  ProjectPatchInput,
} from '@schoolroom/contracts';
import type { Database } from '../../db/client.js';
import { auditLogs, projects, type ProjectRow } from '../../db/schema.js';
import type {
  AdminCatalogRepository,
  AdminProjectRecord,
  AdminProjectUpdateResult,
} from './admin-catalog.repository.js';

export class DrizzleAdminCatalogRepository
  implements AdminCatalogRepository
{
  constructor(private readonly db: Database) {}

  async listProjects(query: AdminProjectListQuery) {
    const conditions: SQL[] = [];

    if (query.status === 'published') {
      conditions.push(eq(projects.isPublished, true), isNull(projects.archivedAt));
    } else if (query.status === 'draft') {
      conditions.push(eq(projects.isPublished, false), isNull(projects.archivedAt));
    } else if (query.status === 'archived') {
      conditions.push(isNotNull(projects.archivedAt));
    }

    if (query.q) {
      const pattern = `%${escapeLike(query.q)}%`;
      conditions.push(
        or(
          ilike(projects.title, pattern),
          ilike(projects.slug, pattern),
          ilike(projects.subject, pattern),
        )!,
      );
    }

    const rows = await this.db
      .select()
      .from(projects)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(projects.updatedAt), desc(projects.id));

    return rows.map(toAdminRecord);
  }

  async findProjectById(id: string) {
    const rows = await this.db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);
    return rows[0] ? toAdminRecord(rows[0]) : null;
  }

  async findProjectBySlug(slug: string) {
    const rows = await this.db
      .select()
      .from(projects)
      .where(eq(projects.slug, slug))
      .limit(1);
    return rows[0] ? toAdminRecord(rows[0]) : null;
  }

  async createProject(input: ProjectCreateInput, actorUserId: string) {
    return this.db.transaction(async (transaction) => {
      const rows = await transaction
        .insert(projects)
        .values({
          ...input,
          currency: 'RUB',
          purchaseCount: 0,
          isPublished: false,
          version: 1,
        })
        .returning();
      const row = rows[0];
      if (!row) throw new Error('Project insert did not return a row');

      await transaction.insert(auditLogs).values({
        actorUserId,
        action: 'project.created',
        entityType: 'project',
        entityId: row.id,
        beforeState: null,
        afterState: toAuditSnapshot(row),
      });
      return toAdminRecord(row);
    });
  }

  async updateProject(
    id: string,
    input: ProjectPatchInput,
    actorUserId: string,
  ): Promise<AdminProjectUpdateResult> {
    return this.db.transaction(async (transaction) => {
      const beforeRows = await transaction
        .select()
        .from(projects)
        .where(eq(projects.id, id))
        .limit(1);
      const before = beforeRows[0];
      if (!before || before.archivedAt) return { status: 'missing' };
      if (before.version !== input.expectedVersion) return { status: 'conflict' };

      const { expectedVersion, ...changes } = input;
      const rows = await transaction
        .update(projects)
        .set({
          ...changes,
          updatedAt: new Date(),
          version: sql`${projects.version} + 1`,
        })
        .where(
          and(
            eq(projects.id, id),
            eq(projects.version, expectedVersion),
            isNull(projects.archivedAt),
          ),
        )
        .returning();
      const after = rows[0];
      if (!after) return { status: 'conflict' };

      await transaction.insert(auditLogs).values({
        actorUserId,
        action: 'project.updated',
        entityType: 'project',
        entityId: after.id,
        beforeState: toAuditSnapshot(before),
        afterState: toAuditSnapshot(after),
      });
      return { status: 'ok', project: toAdminRecord(after) };
    });
  }

  async archiveProject(id: string, actorUserId: string) {
    return this.db.transaction(async (transaction) => {
      const beforeRows = await transaction
        .select()
        .from(projects)
        .where(and(eq(projects.id, id), isNull(projects.archivedAt)))
        .limit(1);
      const before = beforeRows[0];
      if (!before) return null;

      const rows = await transaction
        .update(projects)
        .set({
          archivedAt: new Date(),
          isPublished: false,
          updatedAt: new Date(),
          version: sql`${projects.version} + 1`,
        })
        .where(and(eq(projects.id, id), isNull(projects.archivedAt)))
        .returning();
      const after = rows[0];
      if (!after) return null;

      await transaction.insert(auditLogs).values({
        actorUserId,
        action: 'project.archived',
        entityType: 'project',
        entityId: after.id,
        beforeState: toAuditSnapshot(before),
        afterState: toAuditSnapshot(after),
      });
      return toAdminRecord(after);
    });
  }
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, '\\$&');
}

function toAdminRecord(project: ProjectRow): AdminProjectRecord {
  return {
    id: project.id,
    title: project.title,
    slug: project.slug,
    subject: project.subject as AdminProjectRecord['subject'],
    description: project.description,
    keywords: project.keywords,
    coverUrl: project.coverUrl,
    coverKey: project.coverKey,
    priceMinor: project.priceMinor,
    currency: 'RUB',
    includedMaterials: project.includedMaterials,
    purchaseCount: project.purchaseCount,
    featured: project.featured,
    isPublished: project.isPublished,
    archivedAt: project.archivedAt,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    version: project.version,
  };
}

function toAuditSnapshot(project: ProjectRow): Record<string, unknown> {
  return {
    id: project.id,
    title: project.title,
    slug: project.slug,
    subject: project.subject,
    description: project.description,
    keywords: project.keywords,
    coverUrl: project.coverUrl,
    coverKey: project.coverKey,
    priceMinor: project.priceMinor,
    currency: project.currency,
    includedMaterials: project.includedMaterials,
    purchaseCount: project.purchaseCount,
    featured: project.featured,
    isPublished: project.isPublished,
    archivedAt: project.archivedAt?.toISOString() ?? null,
    version: project.version,
  };
}
