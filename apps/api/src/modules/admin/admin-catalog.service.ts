import type {
  AdminProject,
  AdminProjectListQuery,
  ProjectCreateInput,
  ProjectPatchInput,
} from '@schoolroom/contracts';
import type {
  AdminCatalogRepository,
  AdminProjectRecord,
} from './admin-catalog.repository.js';

export class AdminProjectNotFoundError extends Error {
  constructor() {
    super('Проект не найден');
    this.name = 'AdminProjectNotFoundError';
  }
}

export class AdminProjectConflictError extends Error {
  constructor(readonly reason: 'VERSION' | 'SLUG') {
    super(
      reason === 'VERSION'
        ? 'Проект уже изменён другим пользователем. Обновите данные'
        : 'Проект с таким адресом уже существует',
    );
    this.name = 'AdminProjectConflictError';
  }
}

export class AdminCatalogService {
  constructor(private readonly repository: AdminCatalogRepository) {}

  async list(query: AdminProjectListQuery) {
    const items = await this.repository.listProjects(query);
    return { items: items.map(toAdminProject) };
  }

  async get(id: string) {
    const project = await this.repository.findProjectById(id);
    if (!project) throw new AdminProjectNotFoundError();
    return { project: toAdminProject(project) };
  }

  async create(input: ProjectCreateInput, actorUserId: string) {
    if (await this.repository.findProjectBySlug(input.slug)) {
      throw new AdminProjectConflictError('SLUG');
    }
    const project = await this.repository.createProject(input, actorUserId);
    return { project: toAdminProject(project) };
  }

  async update(id: string, input: ProjectPatchInput, actorUserId: string) {
    if (input.slug) {
      const projectWithSlug = await this.repository.findProjectBySlug(input.slug);
      if (projectWithSlug && projectWithSlug.id !== id) {
        throw new AdminProjectConflictError('SLUG');
      }
    }

    const result = await this.repository.updateProject(id, input, actorUserId);
    if (result.status === 'missing') throw new AdminProjectNotFoundError();
    if (result.status === 'conflict') {
      throw new AdminProjectConflictError('VERSION');
    }
    return { project: toAdminProject(result.project) };
  }

  async archive(id: string, actorUserId: string) {
    const project = await this.repository.archiveProject(id, actorUserId);
    if (!project) throw new AdminProjectNotFoundError();
    return { project: toAdminProject(project) };
  }
}

function toAdminProject(project: AdminProjectRecord): AdminProject {
  return {
    ...project,
    archivedAt: project.archivedAt?.toISOString() ?? null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}
