import type { CatalogSubject } from '@schoolroom/contracts';

export function CategoryRail({
  subjects,
  selected,
  onSelect,
}: {
  subjects: CatalogSubject[];
  selected: CatalogSubject | undefined;
  onSelect: (subject?: CatalogSubject) => void;
}) {
  return (
    <div className="category-rail" role="group" aria-label="Категории проектов">
      <button
        type="button"
        className={!selected ? 'is-active' : ''}
        aria-pressed={!selected}
        onClick={() => onSelect()}
      >
        Все
      </button>
      {subjects.map((subject) => (
        <button
          type="button"
          key={subject}
          className={selected === subject ? 'is-active' : ''}
          aria-pressed={selected === subject}
          onClick={() => onSelect(subject)}
        >
          {subject}
        </button>
      ))}
    </div>
  );
}
