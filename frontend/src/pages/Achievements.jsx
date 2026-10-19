import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  CalendarDays,
  Code2,
  Crown,
  Flame,
  Fingerprint,
  Gauge,
  Hash,
  Keyboard,
  Lock,
  Medal,
  Moon,
  Rocket,
  Shield,
  Sparkles,
  Sun,
  Swords,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import { Badge, EmptyState, PageLoader, ProgressBar } from '../components/Ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { TIER_LABELS, formatNumber, formatShortDate } from '../lib/format';

const ICONS = {
  spark: Sparkles,
  keyboard: Keyboard,
  calendar: CalendarDays,
  medal: Medal,
  flame: Flame,
  target: Target,
  crosshair: Target,
  zap: Zap,
  fingerprint: Fingerprint,
  gauge: Gauge,
  rocket: Rocket,
  crown: Crown,
  code: Code2,
  hash: Hash,
  swords: Swords,
  moon: Moon,
  sun: Sun,
  shield: Shield,
};

const FILTERS = ['Все', 'Путь', 'Скорость', 'Точность', 'Комбо', 'Режимы', 'Серии', 'Объём', 'Секреты'];

export default function Achievements() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('Все');
  const [onlyUnlocked, setOnlyUnlocked] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.achievements()
      .then((payload) => active && setData(payload))
      .catch((err) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, [user?.id]);

  const items = useMemo(() => {
    if (!data) return [];
    return data.items.filter((item) => {
      if (filter !== 'Все' && item.category !== filter) return false;
      if (onlyUnlocked && !item.unlocked) return false;
      return true;
    });
  }, [data, filter, onlyUnlocked]);

  if (error) {
    return (
      <div className="page">
        <EmptyState icon={Award} title="Достижения не загрузились" description={error} />
      </div>
    );
  }

  if (!data) return <PageLoader label="Открываем список наград" />;

  const percent = data.total_count ? (data.unlocked_count / data.total_count) * 100 : 0;

  return (
    <div className="page achievements-page">
      <header className="page__head">
        <div>
          <span className="eyebrow">
            <Award size={14} /> Достижения
          </span>
          <h1>Коллекция героя</h1>
          <p>Двадцать целей: от первой тренировки до тысячи нажатий без единой ошибки.</p>
        </div>
        {user ? (
          <Link to="/train" className="btn btn--soft btn--sm">
            <Zap size={16} /> Заработать опыт
          </Link>
        ) : (
          <Link to="/register" className="btn btn--primary btn--sm">
            <Sparkles size={16} /> Начать коллекцию
          </Link>
        )}
      </header>

      <section className="ach-summary card">
        <div
          className="ach-ring"
          style={{ '--percent': `${percent}%` }}
          aria-label={`Открыто ${data.unlocked_count} из ${data.total_count}`}
        >
          <div className="ach-ring__inner">
            <strong>{data.unlocked_count}</strong>
            <span>из {data.total_count}</span>
          </div>
        </div>
        <div className="ach-summary__body">
          <h2>
            {data.unlocked_count === 0
              ? 'Коллекция только начинается'
              : data.unlocked_count === data.total_count
                ? 'Все награды собраны!'
                : `Открыто ${data.unlocked_count} ${data.unlocked_count === 1 ? 'награда' : data.unlocked_count < 5 ? 'награды' : 'наград'}`}
          </h2>
          <p>
            {data.unlocked_count === 0
              ? 'Завершите первый забег — и первая награда уже ждёт в коллекции.'
              : 'Каждая награда приносит дополнительный опыт. Следующая цель — совсем рядом.'}
          </p>
          <ProgressBar value={data.unlocked_count} max={data.total_count} tone="amber" showLabel />
          <div className="ach-summary__meta">
            <span>
              <Trophy size={15} /> {data.unlocked_count} из {data.total_count}
            </span>
            <span>
              <Zap size={15} /> {formatNumber(data.xp_from_achievements)} XP за награды
            </span>
            {!user ? (
              <span className="ach-summary__guest">
                <Lock size={14} /> Войдите, чтобы открывать награды
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <div className="ach-filters">
        <div className="chip-row chip-row--wrap">
          {FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              className={`chip ${filter === item ? 'is-active' : ''}`}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <label className="switch">
          <input
            type="checkbox"
            checked={onlyUnlocked}
            onChange={(event) => setOnlyUnlocked(event.target.checked)}
          />
          <span className="switch__track" />
          <span>Только открытые</span>
        </label>
      </div>

      {items.length ? (
        <section className="ach-grid">
          {items.map((item) => {
            const Icon = ICONS[item.icon] || Award;
            const progress = item.progress || { current: 0, target: 1, percent: 0 };
            return (
              <article
                className={`ach-card card tier-${item.tier} ${item.unlocked ? 'is-unlocked' : 'is-locked'}`}
                key={item.code}
              >
                <div className="ach-card__top">
                  <span className="ach-card__icon">
                    <Icon size={22} />
                  </span>
                  <div className="ach-card__tier">
                    <Badge tone={item.tier === 'legend' ? 'violet' : item.tier === 'gold' ? 'amber' : 'muted'}>
                      {TIER_LABELS[item.tier] || item.tier}
                    </Badge>
                    <span className="ach-card__xp">+{item.xp} XP</span>
                  </div>
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                {item.unlocked ? (
                  <div className="ach-card__unlocked">
                    <span className="ach-card__check">✓</span>
                    {item.unlocked_at ? `Открыто ${formatShortDate(item.unlocked_at)}` : 'Открыто'}
                  </div>
                ) : (
                  <div className="ach-card__progress">
                    <div className="ach-card__progress-top">
                      <span>{progress.label || item.hint}</span>
                      <strong>
                        {formatNumber(progress.current)} / {formatNumber(progress.target)}
                      </strong>
                    </div>
                    <ProgressBar
                      value={progress.current}
                      max={progress.target}
                      tone={item.tier === 'legend' ? 'violet' : 'amber'}
                    />
                  </div>
                )}
                {!item.unlocked ? (
                  <span className="ach-card__lock">
                    <Lock size={12} /> закрыто
                  </span>
                ) : null}
              </article>
            );
          })}
        </section>
      ) : (
        <EmptyState
          icon={Award}
          title="В этой категории пока пусто"
          description="Попробуйте сбросить фильтр или выбрать другую категорию."
          action={
            <button type="button" className="btn btn--soft" onClick={() => { setFilter('Все'); setOnlyUnlocked(false); }}>
              Показать все
            </button>
          }
        />
      )}

      {!user ? (
        <section className="ach-guest card">
          <div>
            <h3>Награды ждут своего героя</h3>
            <p>Создайте аккаунт, чтобы открывать достижения, копить опыт и сохранять прогресс.</p>
          </div>
          <Link to="/register" className="btn btn--primary">
            Создать аккаунт
          </Link>
        </section>
      ) : null}
    </div>
  );
}
