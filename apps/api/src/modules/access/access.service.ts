import type { ProjectAccessResponse } from '@schoolroom/contracts';
import type { ProjectAccessRepository } from './access.repository.js';

export class ProjectAccessNotFoundError extends Error {
  constructor() {
    super('Проект не найден');
    this.name = 'ProjectAccessNotFoundError';
  }
}

export class ProjectAccessService {
  constructor(private readonly repository: ProjectAccessRepository) {}

  async get(
    userId: string,
    projectId: string,
  ): Promise<ProjectAccessResponse> {
    const access = await this.repository.getProjectAccess(userId, projectId);
    if (!access) throw new ProjectAccessNotFoundError();

    return {
      projectId,
      state: access.owned ? 'owned' : 'not_owned',
      materialsAvailable: access.materialsAvailable,
    };
  }
}
