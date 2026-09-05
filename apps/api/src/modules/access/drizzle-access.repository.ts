import { and, eq, isNull } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import { projectEntitlements, projects } from '../../db/schema.js';
import type {
  ProjectAccessRecord,
  ProjectAccessRepository,
} from './access.repository.js';

export class DrizzleProjectAccessRepository
  implements ProjectAccessRepository
{
  constructor(private readonly db: Database) {}

  async getProjectAccess(
    userId: string,
    projectId: string,
  ): Promise<ProjectAccessRecord | null> {
    const entitlementRows = await this.db
      .select({ materialsAvailable: projectEntitlements.materialsAvailable })
      .from(projectEntitlements)
      .where(
        and(
          eq(projectEntitlements.userId, userId),
          eq(projectEntitlements.projectId, projectId),
        ),
      )
      .limit(1);

    const entitlement = entitlementRows[0];
    if (entitlement) {
      return { owned: true, materialsAvailable: entitlement.materialsAvailable };
    }

    const publicProject = await this.db
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

    return publicProject[0]
      ? { owned: false, materialsAvailable: false }
      : null;
  }
}
