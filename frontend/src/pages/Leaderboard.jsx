import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Crown, Flame, Gauge, Medal, Sparkles, Target, Trophy, Zap } from 'lucide-react';
import { Badge, EmptyState, Segmented, Skeleton } from '../components/Ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatNumber, plural } from '../lib/format';

const PERIODS = [
  { value: 'today', label: 'Сегодня' },
  { value: 'week', label: 'Неделя' },
  { value: 'all', label: 'Всё время' },
];

const METRICS = [
  { value: 'cpm', label: 'Скорость', unit: 'зн/мин', icon: Gauge },
  { value: 'accuracy', label: 'Точность', unit: '%', icon: Target },
  { value: 'xp', label: 'Опыт', unit: 'XP', icon: Zap },
];

const MEDALS = ['', 'gold', 'silver', 'bronze'];

export default function Leaderboard() {
  const { user } = useAuth();
  const [period, setPeriod] = useState('week');
  const [metric, setMetric] = useState('cpm');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api
      .leaderboard({ period, metric })
      .then((payload) => active && setData(payload))
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [period, metric]);

  const metricMeta = METRICS.find((item) => item.value === metric);
  const entries = data?.entries || [];
  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);
  const me = data?.me;

  return (
    <div className="page board-page">
      <header className="page__head">
        <div>
          <span className="eyebrow">
            <Trophy size={14} /> Рейтинг
          </span>
          <h1>Арена героев</h1>
          <p>Лучшие результаты по скорости, точности и опыту. Фильтруйте период и метрику.</p>
        </div>
        {!user ? (
          <Link to="/register" className="btn btn--primary btn--sm">
            <Sparkles size={16} /> Заявить о себе
          </Link>
        ) : (
          <Link to="/train" className="btn btn--soft btn--sm">
            Улучшить результат <ArrowRight size={16} />
          </Link>
        )}
      </header>

      <div className="board-filters card">
        <Segmented options={PERIODS} value={period} onChange={setPeriod} />
        <div className="metric-tabs">
          {METRICS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.value}
                type="button"
                className={`metric-tab ${metric === item.value ? 'is-active' : ''}`}
                onClick={() => setMetric(item.value)}
              >
                <Icon size={15} />
                {item.label}
              </button>
            );
          })}
        </div>
        <span className="board-filters__count">
          {data ? `${data.participants} ${plural(data.participants, ['участник', 'участника', 'участников'])}` : '…'}
        </span>
      </div>

      {loading && !data ? (
        <div className="podium">
          {[1, 2, 3].map((item) => (
            <div className="podium__card card" key={item}>
              <Skeleton width={64} height={64} radius={20} />
              <Skeleton width="60%" height={16} />
              <Skeleton width="40%" height={32} />
            </div>
          ))}
        </div>
      ) : error ? (
        <EmptyState icon={Trophy} title="Рейтинг не загрузился" description={error} />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Пока пусто"
          description="За этот период ещё нет результатов. Станьте первым героем на арене."
          action={
            <Link to={user ? '/train' : '/register'} className="btn btn--primary">
              {user ? 'Начать забег' : 'Создать аккаунт'}
            </Link>
          }
        />
      ) : (
        <>
          <section className="podium" aria-label="Тройка лидеров">
            {[podium[1], podium[0], podium[2]].filter(Boolean).map((entry) => {
              const isFirst = entry.rank === 1;
              return (
                <article
                  className={`podium__card card rank-${entry.rank} ${entry.is_me ? 'is-me' : ''}`}
                  key={entry.user_id}
                >
                  <span className={`podium__crown medal-${MEDALS[entry.rank]}`}>
                    {isFirst ? <Crown size={22} /> : <Medal size={20} />}
                  </span>
                  <span className="podium__avatar">
                    {entry.username.trim()[0]?.toUpperCase() || '?'}
                    <span className="podium__level">{entry.level}</span>
                  </span>
                  <div className="podium__name">
                    <strong>{entry.username}</strong>
                    <span>
                      {entry.is_me ? 'это вы · ' : ''}
                      {entry.streak_days > 0 ? (
                        <>
                          <Flame size={12} /> {entry.streak_days} дн.
                        </>
                      ) : (
                        'на арене'
                      )}
                    </span>
                  </div>
                  <div className="podium__value">
                    {formatNumber(entry.value, metric === 'accuracy' ? 1 : 0)}
                    <small>{metricMeta.unit}</small>
                  </div>
                  <div className="podium__meta">
                    <span>{formatNumber(entry.cpm)} зн/мин</span>
                    <span>{entry.accuracy.toFixed(1)}%</span>
                  </div>
                </article>
              );
            })}
          </section>

          <section className="board-table card">
            <div className="board-table__head">
              <span>#</span>
              <span>Герой</span>
              <span>Уровень</span>
              <span>Скорость</span>
              <span>Точность</span>
              <span>Опыт</span>
              <span>Забеги</span>
            </div>
            {rest.map((entry) => (
              <div className={`board-table__row ${entry.is_me ? 'is-me' : ''}`} key={entry.user_id}>
                <span className="board-table__rank">{entry.rank}</span>
                <span className="board-table__hero">
                  <span className="board-table__avatar">{entry.username.trim()[0]?.toUpperCase() || '?'}</span>
                  <span className="board-table__hero-name">
                    <strong>{entry.username}</strong>
                    <small className="board-table__mobile-value">
                      {formatNumber(entry.value, metric === 'accuracy' ? 1 : 0)} {metricMeta.unit}
                    </small>
                  </span>
                  {entry.is_me ? <Badge tone="amber">вы</Badge> : null}
                </span>
                <span>
                  <Badge tone="muted">{entry.level}</Badge>
                </span>
                <span className={metric === 'cpm' ? 'is-metric' : ''}>{formatNumber(entry.cpm)}</span>
                <span className={metric === 'accuracy' ? 'is-metric' : ''}>{entry.accuracy.toFixed(1)}%</span>
                <span className={metric === 'xp' ? 'is-metric' : ''}>{formatNumber(entry.xp)}</span>
                <span>{entry.sessions}</span>
              </div>
            ))}
            {!rest.length ? (
              <div className="board-table__row board-table__row--empty">Больше участников пока нет.</div>
            ) : null}
          </section>

          {me && !data.my_in_top ? (
            <div className="my-rank card">
              <span className="my-rank__label">Ваша позиция</span>
              <span className="my-rank__rank">#{me.rank}</span>
              <span className="my-rank__name">{me.username}</span>
              <span className="my-rank__value">
                {formatNumber(me.value, metric === 'accuracy' ? 1 : 0)} {metricMeta.unit}
              </span>
              <Link to="/train" className="btn btn--soft btn--sm">
                Подняться выше <ArrowRight size={15} />
              </Link>
            </div>
          ) : null}

          {me && data.my_in_top ? (
            <div className="my-rank my-rank--compact">
              <Zap size={15} /> Ваша позиция — #{me.rank}. Продолжайте в том же ритме.
            </div>
          ) : null}
        </>
      )}

      <section className="board-note card">
        <div className="board-note__icon">
          <Target size={18} />
        </div>
        <p>
          В зачёт идут только завершённые забеги. Для точности учитываются тренировки от 20 секунд и не менее
          40 символов, для скорости — от 10 секунд.
        </p>
      </section>
    </div>
  );
}

