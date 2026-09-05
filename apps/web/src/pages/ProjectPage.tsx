import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Layers3,
  Mic2,
  MonitorPlay,
  PackageCheck,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { ProjectDetail } from '@schoolroom/contracts';
import { CoverArtwork } from '../features/catalog/components/CoverArtwork.js';
import { FavoriteButton } from '../features/catalog/components/FavoriteButton.js';
import {
  useProjectAccessQuery,
  useProjectQuery,
} from '../features/catalog/queries.js';
import {
  bindTelegramBackButton,
  isTelegramMiniApp,
} from '../shared/telegram/bridge.js';

const materialIcons = [FileText, MonitorPlay, Layers3, Mic2];

export function ProjectPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const project = useProjectQuery(slug);
  const access = useProjectAccessQuery(project.data?.id ?? '');

  useEffect(() => bindTelegramBackButton(() => navigate(-1)), [navigate]);

  if (project.isPending) {
    return (
      <div className="page project-detail-page" aria-busy="true">
        <div className="detail-skeleton skeleton" />
      </div>
    );
  }

  if (project.isError || !project.data) {
    return (
      <div className="page">
        <section className="error-state detail-error">
          <h1>Проект не открылся</h1>
          <p>Возможно, он снят с публикации или соединение прервалось.</p>
          <button
            className="primary-button"
            type="button"
            onClick={() => project.refetch()}
          >
            <RefreshCw size={18} /> Повторить
          </button>
          <Link className="secondary-button" to="/catalog">
            Вернуться в каталог
          </Link>
        </section>
      </div>
    );
  }

  const item = project.data;

  return (
    <div className="page project-detail-page">
      {!isTelegramMiniApp() ? (
        <button className="back-button" type="button" onClick={() => navigate(-1)}>
          <ArrowLeft size={19} /> Назад
        </button>
      ) : null}

      <div className="project-detail-layout">
        <section className="project-detail-visual">
          <CoverArtwork cover={item.cover} subject={item.subject} eager />
        </section>

        <section className="project-detail-content">
          <div className="detail-heading-row">
            <div>
              <span className="subject-label">{item.subject}</span>
              <h1>{item.title}</h1>
            </div>
            <FavoriteButton project={item} />
          </div>

          {item.description ? (
            <p className="project-description">{item.description}</p>
          ) : null}

          <section className="materials-section">
            <div className="materials-heading">
              <PackageCheck size={20} aria-hidden="true" />
              <div>
                <span>Комплект</span>
                <strong>Всё для проекта и защиты</strong>
              </div>
            </div>
            <ul>
              {item.includedMaterials.map((material, index) => {
                const Icon = materialIcons[index] ?? Check;
                return (
                  <li key={material}>
                    <span>
                      <Icon size={18} />
                    </span>
                    {material}
                  </li>
                );
              })}
            </ul>
          </section>

          <PurchasePanel item={item} access={access} />

          <section className="cross-sell">
            <span className="eyebrow">Не нашли точное совпадение?</span>
            <h2>Сделаем проект по вашей теме</h2>
            <p>Поможем выбрать направление и учтём требования преподавателя.</p>
            <Link to="/custom-order">
              Индивидуальный проект <ArrowRight size={17} />
            </Link>
          </section>
        </section>
      </div>

      <div className="mobile-purchase-bar">
        <div>
          <span>Готовый комплект</span>
          <strong>{item.price.formatted}</strong>
        </div>
        <PurchaseAction item={item} access={access} compact />
      </div>
    </div>
  );
}

function PurchasePanel({
  item,
  access,
}: {
  item: ProjectDetail;
  access: ReturnType<typeof useProjectAccessQuery>;
}) {
  return (
    <aside className="purchase-panel" aria-live="polite">
      <div>
        <span>Готовый комплект</span>
        <strong>{item.price.formatted}</strong>
      </div>
      <PurchaseAction item={item} access={access} />
      <p>{purchaseHint(access)}</p>
    </aside>
  );
}

function PurchaseAction({
  item,
  access,
  compact = false,
}: {
  item: ProjectDetail;
  access: ReturnType<typeof useProjectAccessQuery>;
  compact?: boolean;
}) {
  const className = compact
    ? 'primary-button mobile-purchase-button'
    : 'primary-button purchase-button';

  if (access.isPending) {
    return (
      <button className={className} type="button" disabled>
        Проверяем доступ…
      </button>
    );
  }

  if (access.isError) {
    return (
      <button
        className={`${className} access-retry-button`}
        type="button"
        onClick={() => access.refetch()}
      >
        <RefreshCw size={18} /> Повторить проверку
      </button>
    );
  }

  if (access.data?.state === 'owned') {
    if (access.data.materialsAvailable) {
      return (
        <Link className={className} to={`/library/${encodeURIComponent(item.id)}`}>
          <Check size={19} /> Открыть материалы
        </Link>
      );
    }
    return (
      <button className={className} type="button" disabled>
        <Check size={19} /> Проект куплен
      </button>
    );
  }

  return (
    <Link
      className={className}
      to={`/orders/new?project=${encodeURIComponent(item.id)}`}
    >
      <ShoppingBag size={19} /> Купить проект
    </Link>
  );
}

function purchaseHint(access: ReturnType<typeof useProjectAccessQuery>) {
  if (access.isPending) return 'Проверяем, покупали ли вы этот проект раньше.';
  if (access.isError) {
    return 'Не удалось проверить доступ. Новая покупка временно заблокирована.';
  }
  if (access.data?.state === 'owned') {
    return access.data.materialsAvailable
      ? 'Проект уже куплен — повторная оплата недоступна.'
      : 'Покупка подтверждена. Материалы ещё готовятся к выдаче.';
  }
  return 'Доступ откроется после серверного подтверждения оплаты.';
}
