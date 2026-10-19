import { LogOut, Keyboard, BarChart3, Trophy, Medal, UserRound, LogIn } from 'lucide-react';
import { NavLink, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import Logo from './Logo';

const NAV_ITEMS = [
  { to: '/train', label: 'Тренажёр', icon: Keyboard, authOnly: false },
  { to: '/stats', label: 'Статистика', icon: BarChart3, authOnly: true },
  { to: '/leaderboard', label: 'Рейтинг', icon: Trophy, authOnly: false },
  { to: '/achievements', label: 'Достижения', icon: Medal, authOnly: false },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const links = NAV_ITEMS.filter((item) => !item.authOnly || user);
  const isAuthPage = ['/login', '/register'].includes(location.pathname);
  const progress = user?.xp_progress;
  const initial = user?.username?.trim()?.[0]?.toUpperCase() || 'Г';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="app">
      <div className="ambient" aria-hidden="true">
        <span className="ambient__orb ambient__orb--amber" />
        <span className="ambient__orb ambient__orb--teal" />
        <span className="ambient__grid" />
      </div>

      <header className="nav">
        <div className="nav__inner">
          <Logo />
          <nav className="nav__links" aria-label="Основная навигация">
            {links.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav__link ${isActive ? 'is-active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="nav__actions">
            {user ? (
              <>
                <Link to="/profile" className="userchip" title="Профиль и настройки">
                  <span className="userchip__avatar">
                    {initial}
                    <span className="userchip__level">{user.level}</span>
                  </span>
                  <span className="userchip__meta">
                    <span className="userchip__name">{user.username}</span>
                    <span className="userchip__bar">
                      <span style={{ width: `${progress?.percent || 0}%` }} />
                    </span>
                  </span>
                </Link>
                <button type="button" className="iconbtn" onClick={handleLogout} title="Выйти" aria-label="Выйти">
                  <LogOut size={18} />
                </button>
              </>
            ) : !isAuthPage ? (
              <>
                <Link to="/login" className="btn btn--ghost btn--sm" state={{ from: location.pathname }}>
                  <LogIn size={16} />
                  <span>Войти</span>
                </Link>
                <Link to="/register" className="btn btn--primary btn--sm">
                  Начать
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <main className="main">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="footer__inner">
          <Logo />
          <p className="footer__note">
            Тренажёр слепой печати для тех, кто хочет печатать быстро, точно и с удовольствием.
          </p>
          <div className="footer__links">
            <Link to="/train">Тренажёр</Link>
            <Link to="/leaderboard">Рейтинг</Link>
            <Link to="/achievements">Достижения</Link>
          </div>
          <span className="footer__copy">© {new Date().getFullYear()} Печать героя</span>
        </div>
      </footer>

      <nav className="mobile-tabs" aria-label="Мобильная навигация">
        {links.slice(0, 4).map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `mobile-tabs__item ${isActive ? 'is-active' : ''}`}
            >
              <Icon size={19} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
        <NavLink
          to={user ? '/profile' : '/login'}
          className={({ isActive }) => `mobile-tabs__item ${isActive ? 'is-active' : ''}`}
        >
          <UserRound size={19} />
          <span>{user ? 'Профиль' : 'Войти'}</span>
        </NavLink>
      </nav>
    </div>
  );
}
