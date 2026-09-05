import { ArrowLeft, Heart, RefreshCw } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { CatalogSkeleton } from '../features/catalog/components/CatalogSkeleton.js';
import { ProjectCard } from '../features/catalog/components/ProjectCard.js';
import { useFavoritesQuery } from '../features/catalog/queries.js';

export function FavoritesPage() {
  const favorites = useFavoritesQuery();
  const navigate = useNavigate();

  return (
    <div className="page favorites-page">
      <button className="back-button" type="button" onClick={() => navigate(-1)}>
        <ArrowLeft size={19} /> Назад
      </button>
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Сохранённое</p>
          <h1>Избранное</h1>
        </div>
        <Heart size={28} aria-hidden="true" />
      </div>

      {favorites.isPending ? <CatalogSkeleton /> : null}

      {favorites.isError ? (
        <section className="error-state">
          <h2>Не удалось загрузить избранное</h2>
          <p>{favorites.error.message}</p>
          <button
            className="primary-button"
            type="button"
            onClick={() => favorites.refetch()}
          >
            <RefreshCw size={18} /> Повторить
          </button>
        </section>
      ) : null}

      {favorites.data?.items.length ? (
        <div className="project-grid">
          {favorites.data.items.map((project, index) => (
            <ProjectCard key={project.id} project={project} eager={index < 4} />
          ))}
        </div>
      ) : null}

      {favorites.data && favorites.data.items.length === 0 ? (
        <section className="empty-state">
          <Heart size={32} aria-hidden="true" />
          <h2>Здесь пока пусто</h2>
          <p>Сохраняйте интересные проекты сердцем — они останутся здесь.</p>
          <Link className="primary-button" to="/catalog">
            Открыть каталог
          </Link>
        </section>
      ) : null}
    </div>
  );
}
