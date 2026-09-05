import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="page placeholder-page">
      <section>
        <p className="eyebrow">404</p>
        <h1>Такой страницы нет</h1>
        <p>Вернитесь к проектам — поиск и фильтры помогут продолжить.</p>
        <Link className="primary-button" to="/catalog">
          Открыть каталог <ArrowRight size={18} />
        </Link>
      </section>
    </div>
  );
}
