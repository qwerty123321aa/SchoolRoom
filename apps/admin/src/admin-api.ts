import {
  AdminProjectListResponseSchema,
  AdminProjectResponseSchema,
  ProjectCreateInputSchema,
  ProjectPatchInputSchema,
  type AdminProject,
  type ProjectCreateInput,
  type ProjectPatchInput,
} from '@schoolroom/contracts';

export type ProjectStatus = 'all' | 'published' | 'draft' | 'archived';

const API_URL = (import.meta.env.VITE_API_URL ?? '/api/v1').replace(/\/$/, '');

export class AdminApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = 'AdminApiError';
  }
}

export async function listAdminProjects(
  filters: { q: string; status: ProjectStatus },
  signal?: AbortSignal,
): Promise<AdminProject[]> {
  const search = new URLSearchParams({ status: filters.status });
  if (filters.q) search.set('q', filters.q);

  const payload = await request(
    `/admin/projects?${search.toString()}`,
    signal ? { signal } : {},
  );
  return AdminProjectListResponseSchema.parse(payload).items;
}

export async function createAdminProject(
  input: ProjectCreateInput,
): Promise<AdminProject> {
  const body = ProjectCreateInputSchema.parse(input);
  const payload = await request('/admin/projects', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return AdminProjectResponseSchema.parse(payload).project;
}

export async function updateAdminProject(
  projectId: string,
  input: ProjectPatchInput,
): Promise<AdminProject> {
  const body = ProjectPatchInputSchema.parse(input);
  const payload = await request(`/admin/projects/${encodeURIComponent(projectId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return AdminProjectResponseSchema.parse(payload).project;
}

export async function archiveAdminProject(projectId: string): Promise<void> {
  await request(`/admin/projects/${encodeURIComponent(projectId)}`, {
    method: 'DELETE',
  });
}

async function request(path: string, options: RequestInit = {}): Promise<unknown> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body) headers.set('Content-Type', 'application/json');

  const initData = window.Telegram?.WebApp?.initData.trim();
  const developmentAdminId = import.meta.env.VITE_DEV_ADMIN_TELEGRAM_USER_ID;

  if (initData) {
    headers.set('Authorization', `tma ${initData}`);
  } else if (developmentAdminId) {
    headers.set('X-Dev-Telegram-User-Id', developmentAdminId);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    cache: 'no-store',
    credentials: 'same-origin',
    headers,
  });

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = readApiError(payload);
    throw new AdminApiError(error.message, response.status, error.code);
  }

  return payload;
}

function readApiError(payload: unknown) {
  if (
    payload &&
    typeof payload === 'object' &&
    'error' in payload &&
    payload.error &&
    typeof payload.error === 'object'
  ) {
    const error = payload.error;
    const message =
      'message' in error && typeof error.message === 'string'
        ? error.message
        : 'Не удалось выполнить запрос';
    const code =
      'code' in error && typeof error.code === 'string'
        ? error.code
        : 'REQUEST_FAILED';
    return { message, code };
  }

  return {
    message: 'Сервис временно недоступен. Попробуйте ещё раз',
    code: 'REQUEST_FAILED',
  };
}
