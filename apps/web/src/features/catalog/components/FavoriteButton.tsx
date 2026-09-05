import { Heart } from 'lucide-react';
import type { ProjectSummary } from '@schoolroom/contracts';
import { useFavorite } from '../queries.js';

export function FavoriteButton({ project }: { project: ProjectSummary }) {
  const favorite = useFavorite(project);
  const label = favorite.isFavorite
    ? `Удалить «${project.title}» из избранного`
    : `Добавить «${project.title}» в избранное`;

  return (
    <button
      className={`favorite-button${favorite.isFavorite ? ' is-active' : ''}`}
      type="button"
      aria-label={label}
      aria-pressed={favorite.isFavorite}
      disabled={favorite.isPending}
      onClick={favorite.toggle}
    >
      <Heart
        size={19}
        strokeWidth={2.2}
        fill={favorite.isFavorite ? 'currentColor' : 'none'}
      />
    </button>
  );
}
