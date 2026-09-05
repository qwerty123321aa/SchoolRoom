import { ChevronRight, RefreshCw, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CatalogSubjectSchema,
  type CatalogSubject,
  type ProjectSummary,
} from '@schoolroom/contracts';
import { CatalogSkeleton } from '../features/catalog/components/CatalogSkeleton.js';
import { CategoryRail } from '../features/catalog/components/CategoryRail.js';
import { EmptyState } from '../features/catalog/components/EmptyState.js';
import { ProjectCard } from '../features/catalog/components/ProjectCard.js';
import { SearchField } from '../features/catalog/components/SearchField.js';
import {
  useCatalogMetaQuery,
  useCatalogQuery,
  usePopularQuery,
} from '../features/catalog/queries.js';
import { useDebouncedValue } from '../shared/lib/debounce.js';

const STATE_KEY_PREFIX = 'schoolroom:catalog';

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q')?.trim() ?? '';
  const parsedSubject = CatalogSubjectSchema.safeParse(
    searchParams.get('subject'),
  );
  const subject = parsedSubject.success ? parsedSubject.data : undefined;
  const [searchValue, setSearchValue] = useState(query);
  const debouncedSearch = useDebouncedValue(searchValue.trim(), 300);
  const catalog = useCatalogQuery(query, subject);
  const popular = usePopularQuery(!query && !subject);
  const meta = useCatalogMetaQuery();
  const stateKey = useMemo(
    () => `${STATE_KEY_PREFIX}:${subject ?? 'all'}:${query || 'none'}`,
    [query, subject],
  );
  const didRestoreScroll = useRef(false);
  const restoreStateKey = useRef(stateKey);
  const pendingRestore = useRef<{ top: number; focus: string | null } | null>(
    null,
  );
  const syncingSearchFromUrl = useRef(false);

  const projects = useMemo(
    () => catalog.data?.pages.flatMap((page) => page.items) ?? [],
    [catalog.data],
  );
  const total = catalog.data?.pages[0]?.pagination.total ?? 0;

  useEffect(() => {
    if (searchValue.trim() === query) return;
    syncingSearchFromUrl.current = true;
    setSearchValue(query);
  }, [query]);

  useEffect(() => {
    if (syncingSearchFromUrl.current) {
      if (debouncedSearch === query) syncingSearchFromUrl.current = false;
      return;
    }
    if (debouncedSearch === query) return;
    const next = new URLSearchParams(searchParams);
    if (debouncedSearch) next.set('q', debouncedSearch);
    else next.delete('q');
    setSearchParams(next, { replace: true });
  }, [debouncedSearch, query, searchParams, setSearchParams]);

  useEffect(() => {
    if (restoreStateKey.current === stateKey) return;
    restoreStateKey.current = stateKey;
    didRestoreScroll.current = false;
    pendingRestore.current = null;
  }, [stateKey]);

  useEffect(() => {
    if (!catalog.data || didRestoreScroll.current) return;
    if (!pendingRestore.current) {
      const savedScroll = Number(
        sessionStorage.getItem(`${stateKey}:scroll`) ?? 0,
      );
      pendingRestore.current = {
        top: Number.isFinite(savedScroll)
          ? Math.max(0, Math.min(savedScroll, 100_000))
          : 0,
        focus: sessionStorage.getItem(`${stateKey}:focus`),
      };
    }

    const frame = requestAnimationFrame(() => {
      const pending = pendingRestore.current;
      if (!pending) return;
      const focusTarget = pending.focus
        ? document.querySelector<HTMLElement>(
            `[data-project-id="${pending.focus}"] a`,
          )
        : null;
      const needsMoreContent =
        document.documentElement.scrollHeight < pending.top + window.innerHeight;
      if (
        catalog.hasNextPage &&
        !catalog.isFetchingNextPage &&
        (needsMoreContent || (pending.focus && !focusTarget))
      ) {
        void catalog.fetchNextPage();
        return;
      }

      window.scrollTo({ top: pending.top });
      focusTarget?.focus({ preventScroll: true });
      if (pending.focus) sessionStorage.removeItem(`${stateKey}:focus`);
      pendingRestore.current = null;
      didRestoreScroll.current = true;
    });

    return () => cancelAnimationFrame(frame);
  }, [
    catalog.data,
    catalog.fetchNextPage,
    catalog.hasNextPage,
    catalog.isFetchingNextPage,
    stateKey,
  ]);

  useEffect(() => {
    const saveScroll = () =>
      sessionStorage.setItem(`${stateKey}:scroll`, String(window.scrollY));
    window.addEventListener('scroll', saveScroll, { passive: true });
    return () => {
      saveScroll();
      window.removeEventListener('scroll', saveScroll);
    };
  }, [stateKey]);

  const selectSubject = (nextSubject?: CatalogSubject) => {
    const next = new URLSearchParams(searchParams);
    if (nextSubject) next.set('subject', nextSubject);
    else next.delete('subject');
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const rememberProject = (projectId: string) => {
    sessionStorage.setItem(`${stateKey}:scroll`, String(window.scrollY));
    sessionStorage.setItem(`${stateKey}:focus`, projectId);
  };

  const reset = () => {
    if (query) setSearchValue('');
    else selectSubject();
  };

  return (
    <div className="page catalog-page">
      <section className="catalog-intro">
        <p className="eyebrow">Готовые проекты</p>
        <h1>Найди тему, которую захочется защитить</h1>
        <p>
          Проект, презентация, продукт и речь — в одном комплекте.
        </p>
      </section>

      <SearchField
        value={searchValue}
        onChange={(value) => {
          syncingSearchFromUrl.current = false;
          setSearchValue(value);
        }}
      />

      {meta.isError ? (
        <div className="metadata-error" role="status">
          <span>Категории временно недоступны.</span>
          <button type="button" onClick={() => meta.refetch()}>
            Повторить
          </button>
        </div>
      ) : null}

      <CategoryRail
        subjects={meta.data?.subjects ?? []}
        selected={subject}
        onSelect={selectSubject}
      />

      {!query && !subject && popular.data?.items.length ? (
        <CatalogSection
          title="Часто выбирают"
          icon={<Sparkles size={18} />}
          className="popular-section"
        >
          <div className="popular-rail">
            {popular.data.items.map((project, index) => (
              <ProjectCard
                key={project.id}
                project={project}
                eager={index < 2}
                onOpen={rememberProject}
              />
            ))}
          </div>
        </CatalogSection>
      ) : null}

      <CatalogSection
        title={query ? 'Результаты' : subject ?? 'Все проекты'}
        aside={
          catalog.isFetching && !catalog.isPending ? (
            <span className="updating-indicator" role="status">
              Обновляем
            </span>
          ) : total ? (
            <span className="result-count" aria-live="polite">
              {formatProjectCount(total)}
            </span>
          ) : null
        }
      >
        {catalog.isPending ? <CatalogSkeleton /> : null}

        {catalog.isError ? (
          <section className="error-state">
            <h2>Не удалось загрузить каталог</h2>
            <p>Проверьте соединение и попробуйте ещё раз.</p>
            <button
              className="primary-button"
              type="button"
              onClick={() => catalog.refetch()}
            >
              <RefreshCw size={18} /> Повторить
            </button>
          </section>
        ) : null}

        {!catalog.isPending && !catalog.isError && projects.length === 0 ? (
          <EmptyState
            mode={query ? 'search' : subject ? 'category' : 'global'}
            onReset={reset}
          />
        ) : null}

        {projects.length ? (
          <>
            <div className="project-grid" aria-busy={catalog.isFetching}>
              {projects.map((project, index) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  eager={index < 4}
                  onOpen={rememberProject}
                />
              ))}
            </div>
            {catalog.hasNextPage ? (
              <button
                className="load-more-button"
                type="button"
                disabled={catalog.isFetchingNextPage}
                onClick={() => catalog.fetchNextPage()}
              >
                {catalog.isFetchingNextPage ? 'Загружаем...' : 'Показать ещё'}
                {!catalog.isFetchingNextPage ? <ChevronRight size={18} /> : null}
              </button>
            ) : null}
          </>
        ) : null}
      </CatalogSection>
    </div>
  );
}

function CatalogSection({
  title,
  icon,
  aside,
  className = '',
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`catalog-section ${className}`.trim()}>
      <div className="section-heading">
        <h2>
          {icon}
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function formatProjectCount(total: number) {
  const lastTwo = total % 100;
  const last = total % 10;
  const noun =
    lastTwo >= 11 && lastTwo <= 14
      ? 'проектов'
      : last === 1
        ? 'проект'
        : last >= 2 && last <= 4
          ? 'проекта'
          : 'проектов';
  return `${total} ${noun}`;
}
