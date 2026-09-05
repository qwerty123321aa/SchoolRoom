import { ArrowRight, SearchX } from 'lucide-react';
import { Link } from 'react-router-dom';

export function EmptyState({
  mode,
  onReset,
}: {
  mode: 'search' | 'category' | 'global';
  onReset: () => void;
}) {
  const copy = {
    search: {
      title: 'Ничего не нашли',
      text: 'Попробуйте другой запрос или закажите проект по своей теме.',
    },
    category: {
      title: 'В этой категории пока нет проектов',
      text: 'Покажем весь каталог — возможно, нужная тема уже есть рядом.',
    },
    global: {
      title: 'Каталог скоро наполнится',
      text: 'Можно начать с индивидуального проекта под вашу тему и требования.',
    },
  }[mode];

  return (
    <section className="empty-state">
      <SearchX size={32} aria-hidden="true" />
      <h2>{copy.title}</h2>
      <p>{copy.text}</p>
      <div className="empty-actions">
        <Link className="primary-button" to="/custom-order">
          Заказать индивидуальный <ArrowRight size={18} />
        </Link>
        {mode !== 'global' ? (
          <button className="secondary-button" type="button" onClick={onReset}>
            {mode === 'search' ? 'Очистить поиск' : 'Показать все проекты'}
          </button>
        ) : null}
      </div>
    </section>
  );
}
