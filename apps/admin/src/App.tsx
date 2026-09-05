import {
  CATALOG_SUBJECTS,
  ProjectCreateInputSchema,
  ProjectPatchInputSchema,
  type AdminProject,
  type CatalogSubject,
  type ProjectCreateInput,
  type ProjectPatchInput,
} from '@schoolroom/contracts';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AdminApiError,
  archiveAdminProject,
  createAdminProject,
  listAdminProjects,
  updateAdminProject,
  type ProjectStatus,
} from './admin-api.js';

const STATUS_OPTIONS: ReadonlyArray<{ value: ProjectStatus; label: string }> = [
  { value: 'all', label: 'Все' },
  { value: 'published', label: 'Опубликованы' },
  { value: 'draft', label: 'Черновики' },
  { value: 'archived', label: 'Архив' },
];

const DEFAULT_MATERIALS = ['Проект', 'Презентация', 'Продукт', 'Речь'];

interface ProjectFormState {
  title: string;
  slug: string;
  subject: CatalogSubject;
  description: string;
  keywords: string;
  coverUrl: string;
  coverKey: string;
  priceRubles: string;
  includedMaterials: string;
  featured: boolean;
  isPublished: boolean;
}

const EMPTY_FORM: ProjectFormState = {
  title: '',
  slug: '',
  subject: 'История',
  description: '',
  keywords: '',
  coverUrl: '',
  coverKey: 'project-default',
  priceRubles: '999',
  includedMaterials: DEFAULT_MATERIALS.join('\n'),
  featured: false,
  isPublished: false,
};

export function App() {
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('all');
  const [selectedProject, setSelectedProject] = useState<AdminProject | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const timeout = window.setTimeout(() => setQuery(search.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    listAdminProjects({ q: query, status }, controller.signal)
      .then(setProjects)
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
        setError(toMessage(requestError));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [query, status, reloadKey]);

  const editorOpen = creating || selectedProject !== null;
  const refresh = () => setReloadKey((value) => value + 1);

  async function archive(project: AdminProject) {
    const confirmed = window.confirm(
      `Переместить проект «${project.title}» в архив? Он исчезнет из публичного каталога.`,
    );
    if (!confirmed) return;

    try {
      await archiveAdminProject(project.id);
      if (selectedProject?.id === project.id) setSelectedProject(null);
      refresh();
    } catch (archiveError) {
      window.alert(toMessage(archiveError));
    }
  }

  return (
    <div className="admin-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="SchoolRoom Admin">
          <span className="brand-mark" aria-hidden="true">SR</span>
          <span>
            <strong>SchoolRoom</strong>
            <small>Управление каталогом</small>
          </span>
        </a>
        <button
          className="primary-button compact"
          type="button"
          onClick={() => {
            setSelectedProject(null);
            setCreating(true);
          }}
        >
          <span aria-hidden="true">＋</span> Новый проект
        </button>
      </header>

      <main>
        <section className="page-heading">
          <div>
            <p className="eyebrow">Каталог</p>
            <h1>Готовые проекты</h1>
            <p>Черновики, публикация и подборка «Часто выбирают».</p>
          </div>
          <span className="project-total" aria-live="polite">
            {loading ? 'Обновляем…' : `${projects.length} ${projectWord(projects.length)}`}
          </span>
        </section>

        <section className="filters" aria-label="Фильтры каталога">
          <label className="search-field">
            <span className="sr-only">Поиск проектов</span>
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={search}
              placeholder="Название, предмет или slug"
              maxLength={120}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search ? (
              <button type="button" aria-label="Очистить поиск" onClick={() => setSearch('')}>
                ×
              </button>
            ) : null}
          </label>

          <div className="status-tabs" role="group" aria-label="Статус проекта">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                className={status === option.value ? 'is-active' : ''}
                type="button"
                aria-pressed={status === option.value}
                onClick={() => setStatus(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        {loading ? <ProjectSkeleton /> : null}

        {!loading && error ? (
          <section className="state-card" role="alert">
            <strong>Не удалось загрузить каталог</strong>
            <p>{error}</p>
            <button className="secondary-button" type="button" onClick={refresh}>
              Повторить
            </button>
          </section>
        ) : null}

        {!loading && !error && projects.length === 0 ? (
          <section className="state-card">
            <strong>Проекты не найдены</strong>
            <p>Измените фильтр или создайте новый черновик.</p>
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                setSelectedProject(null);
                setCreating(true);
              }}
            >
              Создать проект
            </button>
          </section>
        ) : null}

        {!loading && !error && projects.length ? (
          <section className="project-list" aria-label="Проекты">
            {projects.map((project) => (
              <ProjectRow
                key={project.id}
                project={project}
                onEdit={() => {
                  setCreating(false);
                  setSelectedProject(project);
                }}
                onArchive={() => void archive(project)}
              />
            ))}
          </section>
        ) : null}
      </main>

      {editorOpen ? (
        <ProjectEditor
          project={selectedProject}
          onClose={() => {
            setCreating(false);
            setSelectedProject(null);
          }}
          onSaved={() => {
            setCreating(false);
            setSelectedProject(null);
            refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function ProjectRow({ project, onEdit, onArchive }: {
  project: AdminProject;
  onEdit(): void;
  onArchive(): void;
}) {
  const archived = Boolean(project.archivedAt);
  const status = archived ? 'В архиве' : project.isPublished ? 'Опубликован' : 'Черновик';

  return (
    <article className="project-row">
      <div className={`cover-preview cover-${project.subject.length % 4}`} aria-hidden="true">
        <span>{project.subject.slice(0, 1)}</span>
      </div>
      <div className="project-main">
        <div className="project-title-row">
          <div>
            <span className="subject">{project.subject}</span>
            <h2>{project.title}</h2>
            <code>/{project.slug}</code>
          </div>
          <div className="badges">
            {project.featured ? <span className="badge featured">Featured</span> : null}
            <span className={`badge ${archived ? 'archived' : project.isPublished ? 'published' : 'draft'}`}>
              {status}
            </span>
          </div>
        </div>
        <dl className="project-stats">
          <div><dt>Цена</dt><dd>{formatPrice(project.priceMinor, project.currency)}</dd></div>
          <div><dt>Покупок</dt><dd>{project.purchaseCount}</dd></div>
          <div><dt>Изменён</dt><dd>{formatDate(project.updatedAt)}</dd></div>
        </dl>
      </div>
      <div className="row-actions">
        <button className="secondary-button" type="button" onClick={onEdit}>
          {archived ? 'Открыть' : 'Редактировать'}
        </button>
        {!archived ? (
          <button className="danger-button" type="button" onClick={onArchive}>В архив</button>
        ) : null}
      </div>
    </article>
  );
}

function ProjectEditor({ project, onClose, onSaved }: {
  project: AdminProject | null;
  onClose(): void;
  onSaved(): void;
}) {
  const [form, setForm] = useState<ProjectFormState>(() => toForm(project));
  const [slugTouched, setSlugTouched] = useState(Boolean(project));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const archived = Boolean(project?.archivedAt);
  const priceMinor = useMemo(
    () => Math.round(Number(form.priceRubles.replace(',', '.')) * 100),
    [form.priceRubles],
  );

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose, saving]);

  function update<K extends keyof ProjectFormState>(key: K, value: ProjectFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateTitle(title: string) {
    setForm((current) => ({
      ...current,
      title,
      slug: slugTouched ? current.slug : slugify(title),
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const editable = {
      title: form.title.trim(),
      slug: form.slug.trim(),
      subject: form.subject,
      description: form.description.trim() || null,
      keywords: splitValues(form.keywords),
      coverUrl: form.coverUrl.trim() || null,
      coverKey: form.coverKey.trim(),
      priceMinor,
      includedMaterials: splitValues(form.includedMaterials),
      featured: form.featured,
    };

    const parsed = project
      ? ProjectPatchInputSchema.safeParse({
          ...editable,
          isPublished: form.isPublished,
          expectedVersion: project.version,
        })
      : ProjectCreateInputSchema.safeParse(editable);

    if (!parsed.success) {
      setError(parsed.error.issues.map((issue) => issue.message).join(' · '));
      return;
    }

    setSaving(true);
    try {
      if (project) {
        await updateAdminProject(project.id, parsed.data as ProjectPatchInput);
      } else {
        await createAdminProject(parsed.data as ProjectCreateInput);
      }
      onSaved();
    } catch (saveError) {
      setError(
        saveError instanceof AdminApiError && saveError.status === 409
          ? 'Проект уже изменил другой администратор. Закройте форму и откройте проект заново.'
          : toMessage(saveError),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="editor-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) onClose();
    }}>
      <section className="editor-panel" role="dialog" aria-modal="true" aria-labelledby="editor-title">
        <header className="editor-header">
          <div>
            <p className="eyebrow">{project ? 'Проект' : 'Новый черновик'}</p>
            <h2 id="editor-title">{project?.title ?? 'Создать проект'}</h2>
          </div>
          <button className="close-button" type="button" aria-label="Закрыть" disabled={saving} onClick={onClose}>×</button>
        </header>

        <form onSubmit={(event) => void submit(event)}>
          {archived ? <p className="form-notice">Проект находится в архиве и доступен только для просмотра.</p> : null}

          <div className="form-grid">
            <label className="wide">
              <span>Название</span>
              <input required value={form.title} maxLength={180} disabled={archived || saving} onChange={(event) => updateTitle(event.target.value)} />
            </label>
            <label>
              <span>Slug</span>
              <input
                required
                value={form.slug}
                maxLength={160}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                disabled={archived || saving}
                onChange={(event) => {
                  setSlugTouched(true);
                  update('slug', event.target.value.toLowerCase());
                }}
              />
            </label>
            <label>
              <span>Предмет</span>
              <select value={form.subject} disabled={archived || saving} onChange={(event) => update('subject', event.target.value as CatalogSubject)}>
                {CATALOG_SUBJECTS.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
              </select>
            </label>
            <label className="wide">
              <span>Описание</span>
              <textarea value={form.description} rows={5} maxLength={2_000} disabled={archived || saving} placeholder="Два–четыре предложения о проекте" onChange={(event) => update('description', event.target.value)} />
            </label>
            <label className="wide">
              <span>Ключевые слова</span>
              <input value={form.keywords} disabled={archived || saving} placeholder="сон, память, подростки" onChange={(event) => update('keywords', event.target.value)} />
              <small>Разделяйте запятыми.</small>
            </label>
            <label>
              <span>Ключ обложки</span>
              <input required value={form.coverKey} maxLength={120} disabled={archived || saving} onChange={(event) => update('coverKey', event.target.value)} />
            </label>
            <label>
              <span>URL обложки</span>
              <input value={form.coverUrl} type="url" disabled={archived || saving} placeholder="https://…" onChange={(event) => update('coverUrl', event.target.value)} />
            </label>
            <label>
              <span>Цена, ₽</span>
              <input required value={form.priceRubles} type="number" inputMode="decimal" min="0" step="1" disabled={archived || saving} onChange={(event) => update('priceRubles', event.target.value)} />
            </label>
            <label>
              <span>Покупок</span>
              <input value={project?.purchaseCount ?? 0} readOnly aria-readonly="true" />
              <small>Обновляется только после подтверждённой оплаты.</small>
            </label>
            <label className="wide">
              <span>Материалы комплекта</span>
              <textarea required value={form.includedMaterials} rows={4} disabled={archived || saving} onChange={(event) => update('includedMaterials', event.target.value)} />
              <small>Один пункт на строку.</small>
            </label>
          </div>

          <div className="switches">
            <label className="switch-row">
              <input type="checkbox" checked={form.featured} disabled={archived || saving} onChange={(event) => update('featured', event.target.checked)} />
              <span><strong>Featured</strong><small>Включить в редакционную подборку.</small></span>
            </label>
            {project ? (
              <label className="switch-row">
                <input type="checkbox" checked={form.isPublished} disabled={archived || saving} onChange={(event) => update('isPublished', event.target.checked)} />
                <span><strong>Опубликован</strong><small>Показывать проект в клиентском каталоге.</small></span>
              </label>
            ) : (
              <div className="switch-row is-readonly">
                <span><strong>Будет создан как черновик</strong><small>Опубликовать проект можно после первого сохранения.</small></span>
              </div>
            )}
          </div>

          {error ? <p className="form-error" role="alert">{error}</p> : null}

          <footer className="editor-actions">
            <button className="secondary-button" type="button" disabled={saving} onClick={onClose}>{archived ? 'Закрыть' : 'Отмена'}</button>
            {!archived ? (
              <button className="primary-button" type="submit" disabled={saving}>{saving ? 'Сохраняем…' : project ? 'Сохранить' : 'Создать черновик'}</button>
            ) : null}
          </footer>
        </form>
      </section>
    </div>
  );
}

function ProjectSkeleton() {
  return (
    <section className="project-list" aria-label="Загрузка проектов" aria-busy="true">
      {[0, 1, 2, 3].map((item) => <div className="project-row skeleton" key={item} />)}
    </section>
  );
}

function toForm(project: AdminProject | null): ProjectFormState {
  if (!project) return { ...EMPTY_FORM };
  return {
    title: project.title,
    slug: project.slug,
    subject: project.subject,
    description: project.description ?? '',
    keywords: project.keywords.join(', '),
    coverUrl: project.coverUrl ?? '',
    coverKey: project.coverKey,
    priceRubles: String(project.priceMinor / 100),
    includedMaterials: project.includedMaterials.join('\n'),
    featured: project.featured,
    isPublished: project.isPublished,
  };
}

function splitValues(value: string) {
  return value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
}

function slugify(value: string) {
  const transliteration: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
    и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
    с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch',
    ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  };

  return value
    .toLocaleLowerCase('ru-RU')
    .split('')
    .map((character) => transliteration[character] ?? character)
    .join('')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160);
}

function formatPrice(amountMinor: number, currency: string) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amountMinor / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function projectWord(count: number) {
  const remainder = count % 100;
  const last = count % 10;
  if (remainder >= 11 && remainder <= 14) return 'проектов';
  if (last === 1) return 'проект';
  if (last >= 2 && last <= 4) return 'проекта';
  return 'проектов';
}

function toMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Произошла неизвестная ошибка';
}
