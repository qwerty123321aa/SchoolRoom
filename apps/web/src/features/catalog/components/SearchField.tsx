import { Search, X } from 'lucide-react';

export function SearchField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="search-field">
      <span className="sr-only">Найти проект</span>
      <Search aria-hidden="true" size={20} />
      <input
        type="search"
        value={value}
        placeholder="Найти проект..."
        maxLength={120}
        onChange={(event) => onChange(event.target.value)}
      />
      {value ? (
        <button
          type="button"
          aria-label="Очистить поиск"
          onClick={() => onChange('')}
        >
          <X size={18} />
        </button>
      ) : null}
    </label>
  );
}
