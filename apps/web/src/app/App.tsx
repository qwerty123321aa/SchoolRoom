import {
  Bell,
  BookOpen,
  Heart,
  Home,
  Library,
  ShoppingBag,
  UserRound,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Link,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
} from 'react-router-dom';
import { CatalogPage } from '../pages/CatalogPage.js';
import { FavoritesPage } from '../pages/FavoritesPage.js';
import { NotFoundPage } from '../pages/NotFoundPage.js';
import { PlaceholderPage } from '../pages/PlaceholderPage.js';
import { ProjectPage } from '../pages/ProjectPage.js';

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/catalog" replace />} />
        <Route path="catalog" element={<CatalogPage />} />
        <Route path="projects/:slug" element={<ProjectPage />} />
        <Route path="favorites" element={<FavoritesPage />} />
        <Route
          path="custom-order"
          element={
            <PlaceholderPage
              eyebrow="Индивидуальный проект"
              title="Подберём тему и соберём проект под вас"
              description="Конструктор индивидуального заказа подключается следующим этапом. Каталог уже сохраняет контекст, чтобы вы могли вернуться без потери поиска."
            />
          }
        />
        <Route
          path="orders/*"
          element={
            <PlaceholderPage
              eyebrow="Заказы"
              title="Оформление заказа — следующий этап"
              description="Здесь появятся checkout, статусы и доступ к купленным материалам после серверного подтверждения оплаты."
            />
          }
        />
        <Route
          path="library/:projectId"
          element={
            <PlaceholderPage
              eyebrow="Материалы"
              title="Доступ к материалам подтверждён"
              description="Защищённая выдача файлов подключается на этапе файлов. Каталог уже блокирует повторную покупку по серверному праву доступа."
            />
          }
        />
        <Route
          path="profile"
          element={
            <PlaceholderPage
              eyebrow="Профиль"
              title="Профиль готовится"
              description="Мои заказы, скидки, уведомления и помощь будут добавлены отдельным модулем."
            />
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

function AppLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link className="brand" to="/" aria-label="SchoolRoom — каталог">
          <span className="brand-mark" aria-hidden="true">
            <BookOpen size={18} strokeWidth={2.4} />
          </span>
          <span>SchoolRoom</span>
        </Link>
        <div className="header-actions">
          <button
            className="icon-button"
            type="button"
            aria-label="Уведомления — скоро"
            title="Уведомления появятся на следующем этапе"
          >
            <Bell size={20} />
          </button>
          <Link className="icon-button" to="/favorites" aria-label="Избранное">
            <Heart size={20} />
          </Link>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Основная навигация">
        <NavItem to="/" icon={<Home size={20} />} label="Главная" end />
        <NavItem to="/catalog" icon={<Library size={20} />} label="Каталог" />
        <NavItem to="/orders" icon={<ShoppingBag size={20} />} label="Заказ" />
        <NavItem to="/profile" icon={<UserRound size={20} />} label="Профиль" />
      </nav>

      <ToastViewport />
    </div>
  );
}

function NavItem({
  to,
  icon,
  label,
  end = false,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `bottom-nav-item${isActive ? ' is-active' : ''}`
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}

function ToastViewport() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let timeout: number | undefined;
    const listener = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      setMessage(customEvent.detail);
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => setMessage(null), 3500);
    };

    window.addEventListener('schoolroom:toast', listener);
    return () => {
      window.removeEventListener('schoolroom:toast', listener);
      window.clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="toast-viewport" aria-live="polite" aria-atomic="true">
      {message ? <div className="toast">{message}</div> : null}
    </div>
  );
}
