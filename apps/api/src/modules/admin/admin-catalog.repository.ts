import type {
  AdminProjectListQuery,
  ProjectCreateInput,
  ProjectPatchInput,
} from '@schoolroom/contracts';

export interface AdminProjectRecord extends ProjectCreateInput {
  id: string;
  currency: 'RUB';
  purchaseCount: number;
  isPublished: boolean;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export type AdminProjectUpdateResult =
  | { status: 'ok'; project: AdminProjectRecord }
  | { status: 'missing' }
  | { status: 'conflict' };

export interface AdminCatalogRepository {
  listProjects(query: AdminProjectListQuery): Promise<AdminProjectRecord[]>;
  findProjectById(id: string): Promise<AdminProjectRecord | null>;
  findProjectBySlug(slug: string): Promise<AdminProjectRecord | null>;
  createProject(
    input: ProjectCreateInput,
    actorUserId: string,
  ): Promise<AdminProjectRecord>;
  updateProject(
    id: string,
    input: ProjectPatchInput,
    actorUserId: string,
  ): Promise<AdminProjectUpdateResult>;
  archiveProject(
    id: string,
    actorUserId: string,
  ): Promise<AdminProjectRecord | null>;
}
