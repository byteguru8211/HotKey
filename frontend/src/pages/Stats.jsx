import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BarChart3,
  CalendarDays,
  Flame,
  Gauge,
  Keyboard,
  Medal,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  Trophy,
  Zap,
} from 'lucide-react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge, EmptyState, PageLoader, ProgressBar } from '../components/Ui';
import { api } from '../lib/api';
import { DIFFICULTY_LABELS, MODE_LABELS, formatDuration, formatNumber, formatShortDate, plural } from '../lib/format';

const AXIS = '#6f7c95';
const GRID = 'rgba(255,255,255,0.06)';

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      <span className="chart-tip__label">{label}</span>
      {payload.map((item) => (
        <span className="chart-tip__row" key={item.dataKey}>
          <span className="dot" style={{ background: item.color }} />
          {item.name}: <strong>{formatNumber(item.value, item.dataKey === 'accuracy' ? 1 : 0)}</strong>
          {item.dataKey === 'accuracy' ? '%' : ''}
        </span>
      ))}
    </div>
  );
}

export default function Stats() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      api.stats.overview(),
      api.stats.daily(14),
      api.stats.characters({ limit: 10, min_attempts: 3 }),
      api.stats.sessions(8),
      api.stats.activity(),
    ])
      .then(([overview, daily, characters, sessions, activity]) => {
        if (active) setData({ overview, daily, characters, sessions, activity });
      })
      .catch((err) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, []);

  const chartData = useMemo(
    () =>
      (data?.daily.days || []).map((day) => ({
        ...day,
        cpm: day.sessions ? day.cpm : null,
        accuracy: day.sessions ? day.accuracy : null,
      })),
    [data],
  );

  if (error) {
    return (
      <div className="page">
        <EmptyState
          icon={BarChart3}
          title="Статистика временно недоступна"
          description={error}
          action={
            <button type="button" className="btn btn--soft" onClick={() => window.location.reload()}>
              Обновить страницу
            </button>
          }
        />
      </div>
    );
  }

  if (!data) return <PageLoader label="Собираем статистику" />;

  const { overview, daily, characters, sessions, activity } = data;
  const { totals, averages, bests, level, today, week, modes, achievements } = overview;
  const hasSessions = totals.sessions > 0;

  if (!hasSessions) {
    return (
      <div className="page">
        <header className="page__head">
          <div>
            <span className="eyebrow">
              <BarChart3 size={14} /> Статистика
            </span>
            <h1>Здесь появится ваш прогресс</h1>
            <p>Каждый забег добавляет данные: скорость, точность, опыт и слабые места.</p>
          </div>
        </header>
        <EmptyState
          icon={Keyboard}
          title="Пока ни одной тренировки"
          description="Первый забег займёт всего 30 секунд — и здесь сразу появятся графики, рекорды и разбор символов."
          action={
            <Link to="/train" className="btn btn--primary">
              <Sparkles size={17} /> Начать первый забег
            </Link>
          }
        />
      </div>
    );
  }

  const maxModeSessions = Math.max(...modes.map((mode) => mode.sessions), 1);
  const bestChars = characters.strongest || [];

  return (
    <div className="page stats-page">
      <header className="page__head">
        <div>
          <span className="eyebrow">
            <BarChart3 size={14} /> Статистика
          </span>
          <h1>Прогресс героя</h1>
          <p>Динамика за последние две недели, сильные стороны и точки роста.</p>
        </div>
        <Link to="/train" className="btn btn--primary btn--sm">
          Новый забег <ArrowRight size={16} />
        </Link>
      </header>

      <section className="stats-top">
        <article className="levelcard card">
          <div
            className="levelring"
            style={{ '--percent': `${level.percent}%` }}
            aria-label={`Уровень ${level.level}`}
          >
            <div className="levelring__inner">
              <span>уровень</span>
              <strong>{level.level}</strong>
            </div>
          </div>
          <div className="levelcard__body">
            <div className="levelcard__rank">
              <Medal size={16} />
              {level.rank}
            </div>
            <p>
              {level.xp_to_next > 0
                ? `Ещё ${formatNumber(level.xp_to_next)} XP до уровня ${level.level + 1}`
                : 'Максимальный уровень достигнут'}
            </p>
            <ProgressBar value={level.xp_into_level} max={level.xp_for_level} tone="amber" />
            <div className="levelcard__meta">
              <span>
                <Zap size={14} /> {formatNumber(totals.xp)} XP
              </span>
              <span>
                <Flame size={14} /> {totals.streak_days} {plural(totals.streak_days, ['день', 'дня', 'дней'])} подряд
              </span>
              <span>
                <Trophy size={14} /> {achievements.unlocked}/{achievements.total} наград
              </span>
            </div>
          </div>
        </article>

        <div className="kpi-grid">
          <article className="kpi card">
            <span className="kpi__icon kpi__icon--amber">
              <Gauge size={18} />
            </span>
            <span className="kpi__label">Лучшая скорость</span>
            <strong>{formatNumber(bests.cpm)}</strong>
            <span className="kpi__foot">зн/мин · {formatNumber(bests.wpm)} слов/мин</span>
          </article>
          <article className="kpi card">
            <span className="kpi__icon kpi__icon--mint">
              <Target size={18} />
            </span>
            <span className="kpi__label">Точность</span>
            <strong>{averages.accuracy.toFixed(1)}%</strong>
            <span className="kpi__foot">лучшая — {bests.accuracy.toFixed(1)}%</span>
          </article>
          <article className="kpi card">
            <span className="kpi__icon kpi__icon--violet">
              <Timer size={18} />
            </span>
            <span className="kpi__label">Время в практике</span>
            <strong>{formatDuration(totals.seconds)}</strong>
            <span className="kpi__foot">{totals.sessions} {plural(totals.sessions, ['тренировка', 'тренировки', 'тренировок'])}</span>
          </article>
          <article className="kpi card">
            <span className="kpi__icon kpi__icon--rose">
              <Flame size={18} />
            </span>
            <span className="kpi__label">Лучшее комбо</span>
            <strong>{formatNumber(bests.combo)}</strong>
            <span className="kpi__foot">символов без ошибок</span>
          </article>
        </div>
      </section>

      <section className="stats-chart-grid">
        <article className="card chart-card chart-card--wide">
          <div className="card__head">
            <div>
              <h2>Скорость и точность</h2>
              <p>Средние значения за каждый активный день</p>
            </div>
            <Badge tone="amber" dot>
              {daily.summary.active_days} активных {plural(daily.summary.active_days, ['день', 'дня', 'дней'])}
            </Badge>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartData} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="cpmFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffb547" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#ffb547" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="label" stroke={AXIS} tickLine={false} axisLine={false} fontSize={11} dy={6} />
                <YAxis stroke={AXIS} tickLine={false} axisLine={false} fontSize={11} width={46} />
                <YAxis
                  yAxisId="accuracy"
                  orientation="right"
                  domain={[70, 100]}
                  stroke={AXIS}
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  width={40}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.15)' }} />
                <Area
                  type="monotone"
                  dataKey="cpm"
                  name="Скорость"
                  stroke="#ffb547"
                  strokeWidth={2.5}
                  fill="url(#cpmFill)"
                  connectNulls
                  dot={{ r: 3, fill: '#ffb547', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  yAxisId="accuracy"
                  type="monotone"
                  dataKey="accuracy"
                  name="Точность"
                  stroke="#61d9a0"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  connectNulls
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-legend">
            <span><i style={{ background: '#ffb547' }} /> Скорость, зн/мин</span>
            <span><i style={{ background: '#61d9a0' }} /> Точность, %</span>
          </div>
        </article>

        <article className="card goal-card">
          <div className="card__head">
            <div>
              <h2>Дневная цель</h2>
              <p>{formatNumber(today.chars)} из {formatNumber(today.goal)} символов</p>
            </div>
            <span className={`goal-card__badge ${today.goal_reached ? 'is-done' : ''}`}>
              {today.goal_reached ? <Award size={16} /> : <Target size={16} />}
            </span>
          </div>
          <div className="goal-card__value">
            <strong>{Math.round(today.percent)}<small>%</small></strong>
            <span>
              {today.goal_reached
                ? 'Цель дня закрыта. Отличная серия!'
                : `Ещё ${formatNumber(Math.max(0, today.goal - today.chars))} символов`}
            </span>
          </div>
          <ProgressBar value={today.chars} max={today.goal} tone="mint" />
          <div className="goal-card__grid">
            <div>
              <span>Сегодня</span>
              <strong>{today.sessions} {plural(today.sessions, ['забег', 'забега', 'забегов'])}</strong>
            </div>
            <div>
              <span>За неделю</span>
              <strong>{formatNumber(week.chars)} зн.</strong>
            </div>
            <div>
              <span>Точность недели</span>
              <strong>{week.accuracy.toFixed(1)}%</strong>
            </div>
            <div>
              <span>Активных дней</span>
              <strong>{totals.activity_days}</strong>
            </div>
          </div>
          <Link to="/train" className="btn btn--soft btn--sm goal-card__cta">
            <Zap size={15} /> Закрыть цель
          </Link>
        </article>
      </section>

      <section className="stats-mid-grid">
        <article className="card chart-card">
          <div className="card__head">
            <div>
              <h2>Объём по дням</h2>
              <p>Сколько символов набрано</p>
            </div>
            <BarChart3 size={17} className="card__icon" />
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={daily.days} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="weekday" stroke={AXIS} tickLine={false} axisLine={false} fontSize={11} />
                <YAxis stroke={AXIS} tickLine={false} axisLine={false} fontSize={11} width={48} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="chars" name="Символы" fill="#6f8cff" radius={[6, 6, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="card modes-card">
          <div className="card__head">
            <div>
              <h2>Режимы</h2>
              <p>Распределение тренировок</p>
            </div>
            <Keyboard size={17} className="card__icon" />
          </div>
          <div className="mode-bars">
            {modes.map((mode) => (
              <div className="mode-bar" key={mode.mode}>
                <div className="mode-bar__top">
                  <strong>{MODE_LABELS[mode.mode] || mode.title}</strong>
                  <span>
                    {formatNumber(mode.sessions)} {plural(mode.sessions, ['забег', 'забега', 'забегов'])} ·{' '}
                    {formatNumber(mode.avg_cpm)} зн/мин
                  </span>
                </div>
                <div className="mode-bar__track">
                  <span style={{ width: `${(mode.sessions / maxModeSessions) * 100}%` }} />
                </div>
                <div className="mode-bar__foot">
                  <span>точность {mode.avg_accuracy.toFixed(1)}%</span>
                  <span>{formatNumber(mode.chars)} символов</span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="card activity-card">
          <div className="card__head">
            <div>
              <h2>Активность</h2>
              <p>Последние 12 недель</p>
            </div>
            <CalendarDays size={17} className="card__icon" />
          </div>
          <div className="heatmap">
            <div className="heatmap__days">
              {['Пн', 'Ср', 'Пт'].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="heatmap__grid">
              {activity.weeks.map((week, weekIndex) => (
                <div className="heatmap__week" key={weekIndex}>
                  {week.map((day, dayIndex) =>
                    day ? (
                      <span
                        key={day.date}
                        className={`heatmap__cell level-${day.level}`}
                        title={`${formatShortDate(day.date)}: ${formatNumber(day.chars)} символов`}
                      />
                    ) : (
                      <span className="heatmap__cell is-empty" key={`empty-${dayIndex}`} />
                    ),
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="heatmap__legend">
            <span>меньше</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <i className={`heatmap__cell level-${level}`} key={level} />
            ))}
            <span>больше</span>
          </div>
        </article>
      </section>

      <section className="stats-bottom-grid">
        <article className="card chars-card">
          <div className="card__head">
            <div>
              <h2>Сложные символы</h2>
              <p>Где чаще всего случаются ошибки</p>
            </div>
            <Target size={17} className="card__icon" />
          </div>
          {characters.hardest.length ? (
            <div className="chars-list">
              {characters.hardest.map((item) => (
                <div className="char-row" key={item.symbol}>
                  <span className="char-row__symbol">
                    {item.symbol === '␠' || item.symbol === 'пробел' ? '␣' : item.symbol}
                  </span>
                  <div className="char-row__body">
                    <div className="char-row__top">
                      <strong>{item.label}</strong>
                      <span>{item.accuracy.toFixed(1)}%</span>
                    </div>
                    <div className="char-row__track">
                      <span style={{ width: `${item.accuracy}%` }} data-low={item.accuracy < 92} />
                    </div>
                    <div className="char-row__foot">
                      {item.attempts} нажатий · {item.errors} {plural(item.errors, ['ошибка', 'ошибки', 'ошибок'])}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted-note">Наберите больше символов, чтобы увидеть разбор ошибок.</p>
          )}
          {bestChars.length ? (
            <div className="chars-strong">
              <span>Лучше всего даются:</span>
              {bestChars.map((item) => (
                <span className="symbol-chip" key={item.symbol}>
                  {item.symbol === '␠' || item.symbol === 'пробел' ? '␣' : item.symbol}
                </span>
              ))}
            </div>
          ) : null}
        </article>

        <article className="card sessions-card">
          <div className="card__head">
            <div>
              <h2>Последние забеги</h2>
              <p>Свежие результаты</p>
            </div>
            <TrendingUp size={17} className="card__icon" />
          </div>
          <div className="sessions-table">
            <div className="sessions-table__head">
              <span>Режим</span>
              <span>Скорость</span>
              <span>Точность</span>
              <span>XP</span>
              <span>Дата</span>
            </div>
            {sessions.items.map((session) => (
              <div className="sessions-table__row" key={session.id}>
                <span>
                  <strong>{MODE_LABELS[session.mode] || session.mode}</strong>
                  <small>{DIFFICULTY_LABELS[session.difficulty] || session.difficulty}</small>
                </span>
                <span>{formatNumber(session.cpm)} <small>зн/мин</small></span>
                <span>{session.accuracy.toFixed(1)}%</span>
                <span className="is-xp">+{formatNumber(session.xp_earned)}</span>
                <span>{formatShortDate(session.created_at)}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="stats-tip card">
        <div className="stats-tip__icon">
          <Sparkles size={18} />
        </div>
        <p>
          <strong>Совет:</strong> тренируйте самые слабые символы короткими забегами по 15 секунд. Точность важнее
          скорости — множитель опыта растёт, когда ошибок почти нет.
        </p>
      </section>
    </div>
  );
}

