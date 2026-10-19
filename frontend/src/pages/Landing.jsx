import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Crown,
  Flame,
  Hand,
  Hash,
  Keyboard,
  LineChart,
  Medal,
  Timer,
  Trophy,
  Zap,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatNumber } from '../lib/format';
import { Badge, Skeleton } from '../components/Ui';

const HERO_PHRASE = 'Точность. Ритм. Скорость. Твой новый рекорд начинается здесь.';

const FEATURES = [
  {
    icon: Keyboard,
    title: 'Четыре режима',
    text: 'Слова, связные фразы, реальный код и россыпь символов — от разминки до испытания.',
    tone: 'amber',
  },
  {
    icon: Hand,
    title: 'Подсказка пальцев',
    text: 'Раскладка подсвечивает следующую клавишу и подсказывает, каким пальцем её нажимать.',
    tone: 'sky',
  },
  {
    icon: Zap,
    title: 'Комбо и бонусы',
    text: 'Серия без ошибок включает множитель x2, x3 и x5, а бонусы добавляют опыт на лету.',
    tone: 'violet',
  },
  {
    icon: Trophy,
    title: 'Уровни и награды',
    text: 'Двадцать достижений, семь рангов и новые режимы, которые открываются с опытом.',
    tone: 'gold',
  },
  {
    icon: LineChart,
    title: 'Живая статистика',
    text: 'Скорость, точность и динамика по дням. Видно, какие буквы и сочетания даются сложнее.',
    tone: 'mint',
  },
  {
    icon: Medal,
    title: 'Честный рейтинг',
    text: 'Соревнуйтесь по скорости, точности и опыту за день, неделю или всё время.',
    tone: 'rose',
  },
];

const STEPS = [
  { icon: Timer, title: 'Выберите забег', text: 'Режим, раскладка, сложность и длительность — от 15 секунд до двух минут.' },
  { icon: Keyboard, title: 'Печатайте в ритме', text: 'Держите комбо, ловите бонусы и следите за подсказками пальцев.' },
  { icon: Crown, title: 'Забирайте опыт', text: 'Результат сохраняется в профиле, открывает уровни и двигает вас в рейтинге.' },
];

const RANKS = [
  { level: 1, title: 'Новобранец', detail: 'Слова и фразы' },
  { level: 4, title: 'Печатник', detail: 'Режимы «Символы» и «Код»' },
  { level: 9, title: 'Мастер', detail: 'Сложность «Испытание»' },
  { level: 18, title: 'Легенда', detail: 'Вершина рейтинга' },
];

function useHeroTyping() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current > HERO_PHRASE.length + 18 ? 0 : current + 1));
    }, 62);
    return () => window.clearInterval(timer);
  }, []);
  return index;
}

function HeroCard() {
  const index = useHeroTyping();
  const visible = index % (HERO_PHRASE.length + 26);
  const typed = HERO_PHRASE.slice(0, Math.min(visible, HERO_PHRASE.length));
  const current = HERO_PHRASE[Math.min(visible, HERO_PHRASE.length)];
  const progress = Math.min(100, (typed.length / HERO_PHRASE.length) * 100);

  const chars = useMemo(() => HERO_PHRASE.split(''), []);

  return (
    <div className="hero-card">
      <div className="hero-card__bar">
        <span className="hero-card__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="hero-card__label">Свободный забег · Русский</span>
        <span className="hero-card__live">
          <span className="live-dot" /> LIVE
        </span>
      </div>

      <div className="hero-card__stats">
        <div>
          <span className="hero-card__stat-label">Скорость</span>
          <strong>
            312<small>зн/мин</small>
          </strong>
        </div>
        <div>
          <span className="hero-card__stat-label">Точность</span>
          <strong>
            98.7<small>%</small>
          </strong>
        </div>
        <div>
          <span className="hero-card__stat-label">Комбо</span>
          <strong className="is-flame">
            <Flame size={16} /> 64
          </strong>
        </div>
        <div className="hero-card__multiplier">x3</div>
      </div>

      <div className="hero-card__text" aria-hidden="true">
        {chars.map((char, position) => {
          let className = 'hero-char';
          if (position < typed.length) className += ' is-done';
          if (position === typed.length && visible <= HERO_PHRASE.length) className += ' is-current';
          return (
            <span className={className} key={position}>
              {char}
            </span>
          );
        })}
        {!current && visible > HERO_PHRASE.length ? <span className="hero-char is-current"> </span> : null}
      </div>

      <div className="hero-card__progress">
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className="hero-card__bottom">
        <div className="hero-card__keys" aria-hidden="true">
          {'фывапрол'.split('').map((key, position) => (
            <span className={`minikey ${position === typed.length % 8 ? 'is-active' : ''}`} key={key}>
              {key}
            </span>
          ))}
        </div>
        <span className="hero-card__hint">
          <Hand size={15} /> указательный палец
        </span>
      </div>
    </div>
  );
}

function SectionHead({ eyebrow, title, description, align = 'left' }) {
  return (
    <div className={`section-head section-head--${align}`}>
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const [leaders, setLeaders] = useState(null);

  useEffect(() => {
    let active = true;
    api
      .leaderboard({ period: 'all', metric: 'cpm' })
      .then((data) => active && setLeaders(data))
      .catch(() => active && setLeaders({ entries: [] }));
    return () => {
      active = false;
    };
  }, []);

  const top = (leaders?.entries || []).slice(0, 5);

  return (
    <div className="landing">
      <section className="hero">
        <div className="hero__copy">
          <Badge tone="amber" dot>
            Клавиатурная арена
          </Badge>
          <h1>
            Печать
            <span className="text-gradient"> героя</span>
            <span className="hero__line">Скорость, которую видно.</span>
          </h1>
          <p className="hero__lead">
            Тренажёр слепой печати, который считает каждый символ, зажигает комбо и превращает
            ежедневную практику в игру. Слова, фразы, код и символы — на русском и английском.
          </p>
          <div className="hero__actions">
            <Link to={user ? '/train' : '/register'} className="btn btn--primary btn--lg">
              {user ? 'Продолжить тренировку' : 'Начать бесплатно'}
              <ArrowRight size={18} />
            </Link>
            <Link to="/leaderboard" className="btn btn--ghost btn--lg">
              <Trophy size={18} />
              Рейтинг героев
            </Link>
          </div>
          <div className="hero__meta">
            <span>
              <Keyboard size={16} /> 4 режима
            </span>
            <span>
              <Hash size={16} /> 2 раскладки
            </span>
            <span>
              <Trophy size={16} /> 20 достижений
            </span>
            <span>
              <Zap size={16} /> комбо до x5
            </span>
          </div>
        </div>

        <div className="hero__visual">
          <div className="hero__glow" aria-hidden="true" />
          <HeroCard />
        </div>
      </section>

      <section className="features">
        <SectionHead
          eyebrow="Возможности"
          title="Всё, чтобы печатать не глядя"
          description="Слепая печать — это навык, а не талант. Мы разложили его на понятные шаги и добавили азарт."
        />
        <div className="feature-grid">
          {FEATURES.map(({ icon: Icon, title, text, tone }) => (
            <article className={`feature-card feature-card--${tone}`} key={title}>
              <span className="feature-card__icon">
                <Icon size={21} />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="steps">
        <SectionHead
          eyebrow="Как это работает"
          title="Один забег — три шага"
          description="Без курсов и домашних заданий. Открыли, выбрали, напечатали."
        />
        <div className="steps__grid">
          {STEPS.map(({ icon: Icon, title, text }, index) => (
            <article className="step-card" key={title}>
              <span className="step-card__num">0{index + 1}</span>
              <span className="step-card__icon">
                <Icon size={20} />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ranks">
        <div className="ranks__copy">
          <SectionHead
            eyebrow="Путь героя"
            title="Растите от новобранца до легенды"
            description="Опыт начисляется за каждый правильный символ, а точность и комбо увеличивают награду. Новые уровни открывают режимы и сложности."
          />
          <Link to={user ? '/train' : '/register'} className="btn btn--soft">
            Начать путь <ArrowRight size={16} />
          </Link>
        </div>
        <div className="ranks__track">
          {RANKS.map((rank, index) => (
            <div className="rank-node" key={rank.title}>
              <span className="rank-node__level">{rank.level}</span>
              <div>
                <strong>{rank.title}</strong>
                <span>{rank.detail}</span>
              </div>
              {index < RANKS.length - 1 ? <span className="rank-node__line" /> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="landing-board">
        <div className="landing-board__head">
          <SectionHead
            eyebrow="Рейтинг"
            title="Герои недели"
            description="Лучшие результаты по скорости среди всех участников арены."
          />
          <Link to="/leaderboard" className="btn btn--ghost btn--sm">
            Весь рейтинг <ArrowRight size={15} />
          </Link>
        </div>

        <div className="mini-board">
          {leaders === null
            ? Array.from({ length: 5 }).map((_, index) => (
                <div className="mini-board__row" key={index}>
                  <Skeleton width={28} height={28} radius={10} />
                  <Skeleton width="40%" height={14} />
                  <Skeleton width={70} height={14} />
                </div>
              ))
            : top.map((entry) => (
                <div className="mini-board__row" key={entry.user_id}>
                  <span className={`mini-board__rank rank-${entry.rank}`}>{entry.rank}</span>
                  <span className="mini-board__name">
                    {entry.username}
                    <span className="mini-board__level">ур. {entry.level}</span>
                  </span>
                  <span className="mini-board__value">
                    {formatNumber(entry.cpm)}
                    <small>зн/мин</small>
                  </span>
                </div>
              ))}
          {leaders && top.length === 0 ? (
            <p className="mini-board__empty">Рейтинг только начинается — станьте первым.</p>
          ) : null}
        </div>
      </section>

      <section className="cta">
        <div className="cta__glow" aria-hidden="true" />
        <div>
          <Badge tone="gold">
            <Flame size={13} /> Рекорд ждёт
          </Badge>
          <h2>Следующая клавиша — ваша</h2>
          <p>Пятнадцать секунд на разминку. Дальше — только ритм, точность и опыт.</p>
        </div>
        <div className="cta__actions">
          <Link to={user ? '/train' : '/register'} className="btn btn--primary btn--lg">
            {user ? 'В тренажёр' : 'Создать аккаунт'} <ArrowRight size={18} />
          </Link>
          {!user ? (
            <Link to="/login" className="btn btn--ghost btn--lg">
              У меня есть аккаунт
            </Link>
          ) : null}
        </div>
      </section>
    </div>
  );
}

