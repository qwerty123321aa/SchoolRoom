import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export function PlaceholderPage({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  const navigate = useNavigate();

  return (
    <div className="page placeholder-page">
      <button className="back-button" type="button" onClick={() => navigate(-1)}>
        <ArrowLeft size={19} /> Назад
      </button>
      <section>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
        <Link className="primary-button" to="/catalog">
          Вернуться в каталог <ArrowRight size={18} />
        </Link>
      </section>
    </div>
  );
}
