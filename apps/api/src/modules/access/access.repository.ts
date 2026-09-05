export interface ProjectAccessRecord {
  owned: boolean;
  materialsAvailable: boolean;
}

export interface ProjectAccessRepository {
  getProjectAccess(
    userId: string,
    projectId: string,
  ): Promise<ProjectAccessRecord | null>;
}
