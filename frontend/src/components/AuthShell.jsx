import { Link } from 'react-router-dom';
import { Flame, Sparkles, Zap } from 'lucide-react';
import Logo from './Logo';

export default function AuthShell({ eyebrow, title, subtitle, children, footer, side = 'login' }) {
  return (
    <div className="auth">
      <section className="auth__visual">
        <div className="auth__visual-top">
          <Logo />
          <span className="badge badge--amber">Клавиатурная арена</span>
        </div>

        <div className="auth__quote">
          <span className="eyebrow">
            <Sparkles size={14} /> {side === 'login' ? 'С возвращением' : 'Посвящение в герои'}
          </span>
          <h2>
            {side === 'login'
              ? 'Ваш прогресс на месте. Осталось размять пальцы.'
              : 'Один аккаунт — и рекорды остаются с вами.'}
          </h2>
          <p>
            Опыт, уровни, достижения и история тренировок синхронизируются между устройствами.
            Продолжайте с того места, где остановились.
          </p>

          <div className="auth__stats">
            <div>
              <Flame size={17} />
              <strong>7</strong>
              <span>рангов</span>
            </div>
            <div>
              <Zap size={17} />
              <strong>x5</strong>
              <span>комбо</span>
            </div>
            <div>
              <Sparkles size={17} />
              <strong>20</strong>
              <span>наград</span>
            </div>
          </div>
        </div>

        <div className="auth__keyboard" aria-hidden="true">
          {['й', 'ц', 'у', 'к', 'е', 'н', 'г', 'ш', 'щ'].map((key, index) => (
            <span className={`auth-key ${index === 4 ? 'is-active' : ''}`} key={key}>
              {key}
            </span>
          ))}
        </div>
      </section>

      <section className="auth__panel">
        <div className="auth__card">
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p className="auth__subtitle">{subtitle}</p>
          {children}
          {footer ? (
            <div className="auth__footer">
              {footer}
              <Link to="/train" className="auth__guest">
                Продолжить без аккаунта →
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
