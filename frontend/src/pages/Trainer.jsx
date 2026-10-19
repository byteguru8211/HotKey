import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  Check,
  ChevronRight,
  Code2,
  Flame,
  Gauge,
  Hand,
  Hash,
  Keyboard as KeyboardIcon,
  Loader2,
  Lock,
  Pause,
  Play,
  Quote,
  RotateCcw,
  Sparkles,
  Target,
  Timer,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import Keyboard from '../components/Keyboard';
import { Badge, Button, Modal, ProgressBar, Segmented, Skeleton } from '../components/Ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { sound } from '../lib/audio';
import { formatDuration, formatNumber, formatTime, plural } from '../lib/format';
import { useToast } from '../lib/toast';

const MODE_ICONS = { words: KeyboardIcon, sentences: Quote, symbols: Hash, code: Code2 };

const BONUSES = [
  { id: 'double_xp', label: 'Двойной опыт', note: 'XP ×2 на 10 секунд', icon: Sparkles },
  { id: 'golden_flow', label: 'Золотой поток', note: 'Ритм приносит больше опыта', icon: Flame },
  { id: 'surge', label: 'Порыв скорости', note: 'Пальцы быстрее мысли', icon: Zap },
];

const DURATION_OPTIONS = [
  { value: 15, label: '15 с' },
  { value: 30, label: '30 с' },
  { value: 60, label: '60 с' },
  { value: 120, label: '2 мин' },
];

const EMPTY_ENGINE = () => ({
  typed: [],
  correct: 0,
  errors: 0,
  combo: 0,
  maxCombo: 0,
  startedAt: 0,
  pausedAt: 0,
  bonus: null,
  bonusCount: 0,
  nextBonusAt: 20,
  finished: false,
});

function multiplierFor(combo) {
  if (combo >= 100) return 5;
  if (combo >= 50) return 3;
  if (combo >= 25) return 2;
  return 1;
}

function buildCharStats(typed) {
  const stats = {};
  typed.forEach((entry) => {
    const key = entry.char === '\n' ? '⏎' : entry.char === ' ' ? '␠' : entry.char;
    if (!stats[key]) stats[key] = { attempts: 0, errors: 0 };
    stats[key].attempts += 1;
    if (!entry.correct) stats[key].errors += 1;
  });
  return stats;
}

export default function Trainer() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();

  const [catalog, setCatalog] = useState(null);
  const [settings, setSettings] = useState({
    mode: 'words',
    language: user?.preferred_language || 'ru',
    difficulty: 'normal',
    variant: 'python',
    duration: 60,
  });
  const [exercise, setExercise] = useState(null);
  const [round, setRound] = useState(0);
  const [loadingText, setLoadingText] = useState(true);
  const [textError, setTextError] = useState('');
  const [status, setStatus] = useState('idle');
  const [remaining, setRemaining] = useState(60);
  const [view, setView] = useState(0);
  const [result, setResult] = useState(null);
  const [autoStart, setAutoStart] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(() => window.innerWidth > 1024);
  const [soundOn, setSoundOn] = useState(user?.sound_enabled ?? true);
  const [shake, setShake] = useState(false);

  const engine = useRef(EMPTY_ENGINE());
  const finishRef = useRef(null);
  const typingBox = useRef(null);
  const pendingStart = useRef(false);

  const level = user?.level || 1;
  const effectiveLanguage = settings.mode === 'code' ? 'en' : settings.language;
  const keyboardLayout = settings.mode === 'code' ? 'en' : effectiveLanguage;

  // --- каталог режимов и разблокировок ---------------------------------
  useEffect(() => {
    let active = true;
    api.practice
      .catalog()
      .then((data) => active && setCatalog(data))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user?.level, user?.id]);

  // --- загрузка текста под текущие настройки ---------------------------
  useEffect(() => {
    const controller = new AbortController();
    setLoadingText(true);
    setTextError('');
    setStatus('idle');
    setResult(null);
    engine.current = EMPTY_ENGINE();
    setRemaining(settings.duration);
    api.practice
      .text(
        {
          mode: settings.mode,
          language: effectiveLanguage,
          difficulty: settings.difficulty,
          variant: settings.variant,
          duration: settings.duration,
        },
        controller.signal,
      )
      .then((data) => {
        setExercise(data);
        setRemaining(data.duration);
        if (pendingStart.current) {
          pendingStart.current = false;
          setAutoStart(true);
        }
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setTextError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingText(false);
      });
    return () => controller.abort();
  }, [settings.mode, settings.language, settings.difficulty, settings.variant, settings.duration, round, effectiveLanguage]);

  useEffect(() => {
    sound.setEnabled(soundOn);
  }, [soundOn]);

  // --- таймер -----------------------------------------------------------
  useEffect(() => {
    if (status !== 'running') return undefined;
    const interval = window.setInterval(() => {
      const current = engine.current;
      const elapsed = (performance.now() - current.startedAt) / 1000;
      const left = Math.max(0, settings.duration - elapsed);
      setRemaining(left);
      if (current.bonus && performance.now() > current.bonus.until) {
        current.bonus = null;
      }
      if (elapsed >= settings.duration) {
        finishRef.current?.('time');
      }
    }, 120);
    return () => window.clearInterval(interval);
  }, [status, settings.duration]);

  // --- прокрутка к текущему символу ------------------------------------
  useEffect(() => {
    const box = typingBox.current;
    if (!box) return;
    const current = box.querySelector('.typing__char.is-current');
    if (!current) return;
    const top = current.offsetTop;
    const height = current.offsetHeight || 34;
    if (top < box.scrollTop + height || top > box.scrollTop + box.clientHeight - height * 2.2) {
      box.scrollTo({ top: Math.max(0, top - box.clientHeight / 2), behavior: 'smooth' });
    }
  }, [view, status]);

  const finishRun = useCallback(
    async (reason = 'time') => {
      const current = engine.current;
      if (current.finished) return;
      current.finished = true;
      const rawElapsed = current.startedAt ? (performance.now() - current.startedAt) / 1000 : 0;
      const elapsed = Math.max(1, Math.min(settings.duration, rawElapsed));
      const typed = current.typed;
      const metrics = {
        cpm: elapsed > 0 ? (current.correct / elapsed) * 60 : 0,
        accuracy: typed.length ? (current.correct / (current.correct + current.errors)) * 100 : 0,
        errors: current.errors,
        correct: current.correct,
        maxCombo: current.maxCombo,
        duration: Math.round(elapsed),
        typedChars: typed.length,
      };

      setStatus('finished');
      setRemaining(Math.max(0, settings.duration - elapsed));
      setResult({ local: metrics, server: null, saving: Boolean(user), error: '', reason });
      sound.finish();

      if (!user) return;

      const payload = {
        mode: settings.mode,
        language: effectiveLanguage,
        difficulty: settings.difficulty,
        variant: settings.mode === 'code' ? settings.variant : undefined,
        duration_sec: Math.max(5, Math.min(settings.duration, Math.round(elapsed))),
        correct_chars: current.correct,
        errors: current.errors,
        max_combo: current.maxCombo,
        bonus_count: current.bonusCount,
        char_stats: buildCharStats(typed),
      };

      try {
        const data = await api.practice.saveSession(payload);
        updateUser(data.user);
        setResult((previous) => (previous ? { ...previous, server: data, saving: false } : previous));
        if (data.level_up) sound.levelUp();
      } catch (error) {
        setResult((previous) =>
          previous ? { ...previous, saving: false, error: error.message } : previous,
        );
      }
    },
    [effectiveLanguage, settings, updateUser, user],
  );

  finishRef.current = finishRun;

  const startRun = useCallback(() => {
    if (!exercise || loadingText) return;
    sound.ensure();
    engine.current = EMPTY_ENGINE();
    engine.current.startedAt = performance.now();
    engine.current.nextBonusAt = 18 + Math.floor(Math.random() * 14);
    setRemaining(settings.duration);
    setResult(null);
    setStatus('running');
    setShake(false);
    setView((value) => value + 1);
  }, [exercise, loadingText, settings.duration]);

  const pauseRun = useCallback(() => {
    setStatus((current) => {
      if (current !== 'running') return current;
      engine.current.pausedAt = performance.now();
      return 'paused';
    });
  }, []);

  const resumeRun = useCallback(() => {
    setStatus((current) => {
      if (current !== 'paused') return current;
      if (engine.current.pausedAt) {
        engine.current.startedAt += performance.now() - engine.current.pausedAt;
        engine.current.pausedAt = 0;
      }
      return 'running';
    });
  }, []);

  const restartRun = useCallback(() => {
    setResult(null);
    setStatus('idle');
    setRound((value) => value + 1);
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && engine.current.startedAt && !engine.current.finished) {
        pauseRun();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [pauseRun]);

  useEffect(() => {
    if (!autoStart || !exercise || loadingText || status !== 'idle') return;
    setAutoStart(false);
    startRun();
  }, [autoStart, exercise, loadingText, status, startRun]);

  const triggerBonus = useCallback(() => {
    const bonus = BONUSES[Math.floor(Math.random() * BONUSES.length)];
    engine.current.bonus = { ...bonus, until: performance.now() + 10000 };
    engine.current.bonusCount += 1;
    engine.current.nextBonusAt = engine.current.correct + 22 + Math.floor(Math.random() * 22);
    sound.bonus();
  }, []);

  const typeChar = useCallback(
    (char) => {
      const current = engine.current;
      if (!exercise || current.finished) return;
      if (current.typed.length >= exercise.text.length) {
        finishRef.current?.('complete');
        return;
      }
      const expected = exercise.text[current.typed.length];
      const correct = expected === char;
      current.typed.push({ char: expected, typed: char, correct });

      if (correct) {
        current.correct += 1;
        current.combo += 1;
        current.maxCombo = Math.max(current.maxCombo, current.combo);
        sound.click();
        if (current.combo > 0 && current.combo % 25 === 0) sound.combo(multiplierFor(current.combo));
        if (current.correct >= current.nextBonusAt) triggerBonus();
        setShake(false);
      } else {
        current.errors += 1;
        current.combo = 0;
        sound.error();
        setShake(true);
        window.setTimeout(() => setShake(false), 180);
      }

      if (current.typed.length >= exercise.text.length) {
        finishRef.current?.('complete');
        return;
      }
      setView((value) => value + 1);
    },
    [exercise, triggerBonus],
  );

  const backspace = useCallback(() => {
    const current = engine.current;
    if (!current.typed.length) return;
    const removed = current.typed.pop();
    if (removed?.correct) current.correct = Math.max(0, current.correct - 1);
    setView((value) => value + 1);
  }, []);

  /** Tab в режиме кода: разом добивает отступ текущей строки. */
  const typeIndentation = useCallback(() => {
    const current = engine.current;
    if (!exercise || current.finished) return;
    const text = exercise.text;
    const index = current.typed.length;
    if (index >= text.length) return;

    const lineStart = text.lastIndexOf('\n', index - 1) + 1;
    for (let position = lineStart; position < index; position += 1) {
      if (text[position] !== ' ') return;
    }
    if (text[index] !== ' ') return;

    let indentEnd = index;
    while (indentEnd < text.length && text[indentEnd] === ' ') indentEnd += 1;
    const spaces = indentEnd - index;
    if (spaces <= 0) return;

    for (let step = 0; step < spaces; step += 1) {
      current.typed.push({ char: ' ', typed: ' ', correct: true });
      current.correct += 1;
      current.combo += 1;
      current.maxCombo = Math.max(current.maxCombo, current.combo);
      if (current.correct >= current.nextBonusAt) triggerBonus();
    }
    sound.indent();

    if (current.typed.length >= text.length) {
      finishRef.current?.('complete');
      return;
    }
    setView((value) => value + 1);
  }, [exercise, triggerBonus]);

  // --- ввод с клавиатуры ------------------------------------------------
  useEffect(() => {
    if (status !== 'running') return undefined;
    const onKeyDown = (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        pauseRun();
        return;
      }
      if (event.key === 'Tab') {
        event.preventDefault();
        if (settings.mode === 'code') {
          typeIndentation();
        } else {
          restartRun();
        }
        return;
      }
      if (event.key === 'F2') {
        event.preventDefault();
        restartRun();
        return;
      }
      if (event.key === 'Backspace') {
        event.preventDefault();
        backspace();
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        typeChar('\n');
        return;
      }
      if (event.key.length === 1) {
        event.preventDefault();
        typeChar(event.key);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [status, pauseRun, restartRun, backspace, typeChar, typeIndentation, settings.mode]);

  useEffect(() => {
    if (status !== 'idle' || !exercise) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Enter') {
        if (event.target.closest?.('input, textarea, button, a, select')) return;
        event.preventDefault();
        startRun();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [status, exercise, startRun]);

  const updateSetting = (patch) => {
    if (status === 'running' || status === 'paused') return;
    setSettings((previous) => ({ ...previous, ...patch }));
  };

  const chooseMode = (mode) => {
    if (status === 'running' || status === 'paused') return;
    const meta = catalog?.modes.find((item) => item.code === mode);
    if (meta && !meta.unlocked) {
      toast(`Режим «${meta.title}» откроется на ${meta.min_level} уровне`, 'info');
      return;
    }
    updateSetting({ mode });
  };

  const chooseDifficulty = (difficulty) => {
    if (status === 'running' || status === 'paused') return;
    const meta = catalog?.difficulties.find((item) => item.code === difficulty);
    if (meta && !meta.unlocked) {
      toast(`Сложность «${meta.title}» откроется на ${meta.min_level} уровне`, 'info');
      return;
    }
    updateSetting({ difficulty });
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    sound.setEnabled(next);
    if (user) {
      api.profile.update({ sound_enabled: next }).then((data) => updateUser(data.user)).catch(() => {});
    }
  };

  const current = engine.current;
  const typedCount = current.typed.length;
  const nextChar = exercise?.text[typedCount] || '';
  const elapsed = status === 'running' ? Math.max(0.4, settings.duration - remaining) : status === 'finished' ? result?.local.duration || 0 : 0;
  const liveCpm = elapsed > 0 ? (current.correct / elapsed) * 60 : 0;
  const liveAccuracy = typedCount ? (current.correct / (current.correct + current.errors)) * 100 : 100;
  const comboMultiplier = multiplierFor(current.combo);
  const bonus = current.bonus;
  const bonusLeft = bonus ? Math.max(0, Math.ceil((bonus.until - performance.now()) / 1000)) : 0;

  const modes = catalog?.modes || [];
  const difficulties = catalog?.difficulties || [];
  const codeLanguages = catalog?.code_languages || [];
  const modeMeta = modes.find((item) => item.code === settings.mode);

  return (
    <div className="page trainer-page">
      <header className="page__head trainer-head">
        <div>
          <span className="eyebrow">
            <KeyboardIcon size={14} /> Тренажёр
          </span>
          <h1>Забег на скорость</h1>
          <p>Выберите режим и длительность. Ошибки фиксируются, комбо — зажигается.</p>
        </div>
        <div className="trainer-head__tools">
          <button type="button" className="iconbtn" onClick={toggleSound} title={soundOn ? 'Выключить звук' : 'Включить звук'}>
            {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button
            type="button"
            className={`iconbtn ${showKeyboard ? 'is-active' : ''}`}
            onClick={() => setShowKeyboard((value) => !value)}
            title="Подсказка по клавиатуре"
          >
            <Hand size={18} />
          </button>
          {user ? (
            <Link to="/stats" className="btn btn--ghost btn--sm">
              <Gauge size={16} /> Статистика
            </Link>
          ) : null}
        </div>
      </header>

      <div className="trainer">
        <aside className="trainer__settings card">
          <div className="settings-block">
            <span className="settings-block__label">Режим</span>
            <div className="mode-list">
              {modes.map((mode) => {
                const Icon = MODE_ICONS[mode.code] || KeyboardIcon;
                const active = settings.mode === mode.code;
                return (
                  <button
                    key={mode.code}
                    type="button"
                    className={`mode-card ${active ? 'is-active' : ''} ${!mode.unlocked ? 'is-locked' : ''}`}
                    onClick={() => chooseMode(mode.code)}
                    disabled={status === 'running' || status === 'paused'}
                  >
                    <span className="mode-card__icon">
                      <Icon size={18} />
                    </span>
                    <span className="mode-card__text">
                      <strong>{mode.title}</strong>
                      <small>{mode.description}</small>
                    </span>
                    {!mode.unlocked ? (
                      <span className="mode-card__lock" title={`Откроется на ${mode.min_level} уровне`}>
                        <Lock size={13} /> {mode.min_level}
                      </span>
                    ) : active ? (
                      <Check size={16} className="mode-card__check" />
                    ) : (
                      <ChevronRight size={15} className="mode-card__chevron" />
                    )}
                  </button>
                );
              })}
              {!catalog ? <Skeleton height={54} radius={12} /> : null}
            </div>
          </div>

          {settings.mode === 'code' ? (
            <div className="settings-block">
              <span className="settings-block__label">Язык кода</span>
              <div className="chip-row">
                {codeLanguages.map((code) => (
                  <button
                    key={code.code}
                    type="button"
                    className={`chip ${settings.variant === code.code ? 'is-active' : ''}`}
                    onClick={() => updateSetting({ variant: code.code })}
                    disabled={status === 'running' || status === 'paused'}
                  >
                    <span className="chip__mono">{code.monogram}</span>
                    {code.title}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="settings-block">
              <span className="settings-block__label">Раскладка</span>
              <Segmented
                value={settings.language}
                onChange={(value) => updateSetting({ language: value })}
                options={[
                  { value: 'ru', label: 'Русский' },
                  { value: 'en', label: 'English' },
                ]}
              />
            </div>
          )}

          <div className="settings-block">
            <span className="settings-block__label">
              Сложность
              {modeMeta && level < (modeMeta.min_level || 1) ? <small>растёт с уровнем</small> : null}
            </span>
            <div className="diff-grid">
              {difficulties.map((difficulty) => {
                const active = settings.difficulty === difficulty.code;
                return (
                  <button
                    key={difficulty.code}
                    type="button"
                    className={`diff-card ${active ? 'is-active' : ''} ${!difficulty.unlocked ? 'is-locked' : ''}`}
                    onClick={() => chooseDifficulty(difficulty.code)}
                    disabled={status === 'running' || status === 'paused'}
                    title={difficulty.description}
                  >
                    <strong>{difficulty.title}</strong>
                    {!difficulty.unlocked ? <Lock size={12} /> : active ? <Check size={13} /> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="settings-block">
            <span className="settings-block__label">Длительность</span>
            <div className="chip-row">
              {DURATION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`chip ${settings.duration === option.value ? 'is-active' : ''}`}
                  onClick={() => updateSetting({ duration: option.value })}
                  disabled={status === 'running' || status === 'paused'}
                >
                  <Timer size={13} /> {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-block settings-block--hint">
            <p>
              <Sparkles size={14} /> Точность важнее скорости: множитель опыта растёт до ×1.2 за точность и до ×1.2 за комбо.
            </p>
          </div>
        </aside>

        <section className={`trainer__stage card ${shake ? 'is-shaking' : ''}`} aria-label="Поле тренировки">
          <div className="stage__top">
            <div className="stage__mode">
              <span className="stage__mode-icon">
                {(() => {
                  const Icon = MODE_ICONS[settings.mode] || KeyboardIcon;
                  return <Icon size={17} />;
                })()}
              </span>
              <div>
                <strong>{modeMeta?.title || 'Забег'}</strong>
                <span>
                  {settings.difficulty && difficulties.find((item) => item.code === settings.difficulty)?.title}
                  {settings.mode === 'code' ? ` · ${codeLanguages.find((item) => item.code === settings.variant)?.title || 'Python'}` : null}
                  {` · ${effectiveLanguage === 'ru' ? 'русский' : 'english'}`}
                </span>
              </div>
            </div>

            <div className="stage__timer" data-low={remaining <= 10 && status === 'running'}>
              <Timer size={16} />
              <span>{formatTime(status === 'idle' ? settings.duration : remaining)}</span>
            </div>

            <div className="stage__controls">
              {status === 'running' ? (
                <button type="button" className="iconbtn" onClick={pauseRun} title="Пауза (Esc)">
                  <Pause size={17} />
                </button>
              ) : status === 'paused' ? (
                <button type="button" className="iconbtn" onClick={resumeRun} title="Продолжить">
                  <Play size={17} />
                </button>
              ) : null}
              <button
                type="button"
                className="iconbtn"
                onClick={restartRun}
                title="Новый текст"
                disabled={loadingText}
              >
                <RotateCcw size={17} />
              </button>
            </div>
          </div>

          <div className="stage__metrics">
            <div className="metric">
              <span>Скорость</span>
              <strong>{formatNumber(liveCpm)}<small>зн/мин</small></strong>
            </div>
            <div className="metric">
              <span>Точность</span>
              <strong>{liveAccuracy.toFixed(1)}<small>%</small></strong>
            </div>
            <div className={`metric ${current.combo >= 25 ? 'is-hot' : ''}`}>
              <span>Комбо</span>
              <strong>
                {current.combo}
                {comboMultiplier > 1 ? <em className="metric__multiplier">×{comboMultiplier}</em> : null}
              </strong>
            </div>
            <div className="metric metric--progress">
              <span>Прогресс</span>
              <strong>
                {typedCount}
                <small>/ {exercise?.text.length || 0}</small>
              </strong>
              <ProgressBar
                value={typedCount}
                max={exercise?.text.length || 1}
                tone="amber"
                className="metric__bar"
              />
            </div>
          </div>

          <div className={`bonus-strip ${bonus && status === 'running' ? 'is-active' : ''}`}>
            {bonus && status === 'running' ? (
              <>
                <span className="bonus-strip__icon">
                  <bonus.icon size={15} />
                </span>
                <strong>{bonus.label}</strong>
                <span className="bonus-strip__note">{bonus.note}</span>
                <span className="bonus-strip__timer">{bonusLeft} с</span>
              </>
            ) : (
              <>
                <span className="bonus-strip__icon">
                  <Zap size={14} />
                </span>
                <span className="bonus-strip__text">
                  {status === 'running' ? (
                    <>
                      До бонуса:{' '}
                      <strong>{Math.max(0, current.nextBonusAt - current.correct)}</strong>{' '}
                      {plural(Math.max(0, current.nextBonusAt - current.correct), [
                        'точное нажатие',
                        'точных нажатия',
                        'точных нажатий',
                      ])}
                    </>
                  ) : (
                    'Бонусы включаются за серию точных нажатий'
                  )}
                </span>
                <span className="bonus-strip__combo">Комбо ×{comboMultiplier}</span>
              </>
            )}
          </div>

          <div className="stage__text-area">
            {loadingText ? (
              <div className="typing typing--loading">
                <Skeleton height={26} width="92%" />
                <Skeleton height={26} width="80%" />
                <Skeleton height={26} width="88%" />
                <Skeleton height={26} width="56%" />
              </div>
            ) : textError ? (
              <div className="stage__overlay">
                <span className="overlay__icon overlay__icon--error">
                  <X size={22} />
                </span>
                <h3>Не удалось загрузить текст</h3>
                <p>{textError}</p>
                <Button variant="soft" onClick={() => setRound((value) => value + 1)} icon={RotateCcw}>
                  Попробовать снова
                </Button>
              </div>
            ) : (
              <div
                className={`typing ${status === 'paused' || status === 'idle' || status === 'finished' ? 'is-blurred' : ''}`}
                ref={typingBox}
                aria-hidden="true"
              >
                {Array.from(exercise?.text || '').map((char, index) => (
                  <span key={index}>
                    <span className={charClass(current.typed[index], index === typedCount, index < typedCount)}>
                      {char === '\n' ? '⏎' : char}
                    </span>
                    {char === '\n' ? <br /> : null}
                  </span>
                ))}
                {typedCount >= (exercise?.text.length || 0) ? (
                  <span className="typing__char is-current">&nbsp;</span>
                ) : null}
              </div>
            )}

            {status === 'idle' && exercise && !loadingText ? (
              <div className="stage__overlay stage__overlay--start">
                <span className="overlay__icon">
                  <Play size={22} />
                </span>
                <h3>Готовы к забегу?</h3>
                <p>
                  {formatDuration(settings.duration)} · {modeMeta?.title} ·{' '}
                  {difficulties.find((item) => item.code === settings.difficulty)?.title}
                </p>
                <Button size="lg" onClick={startRun} icon={Play}>
                  Начать забег
                </Button>
                <span className="overlay__hint">
                  {settings.mode === 'code' ? 'Enter — старт · Tab — отступ' : 'или нажмите Enter'}
                </span>
              </div>
            ) : null}

            {status === 'paused' ? (
              <div className="stage__overlay">
                <span className="overlay__icon">
                  <Pause size={22} />
                </span>
                <h3>Пауза</h3>
                <p>Таймер остановлен. Пальцы могут отдохнуть.</p>
                <Button onClick={resumeRun} icon={Play}>
                  Продолжить
                </Button>
              </div>
            ) : null}
          </div>

          <div className="stage__bottom">
            <span className="stage__hint">
              <kbd>Esc</kbd> пауза
              {settings.mode === 'code' ? (
                <>
                  <kbd>Tab</kbd> отступ
                  <kbd>F2</kbd> заново
                </>
              ) : (
                <>
                  <kbd>Tab</kbd> заново
                </>
              )}
              <kbd>Backspace</kbd> исправить
            </span>
            <div className="stage__streak">
              <Flame size={15} className={current.combo > 0 ? 'is-flame' : ''} />
              Максимум: <strong>{current.maxCombo}</strong>
            </div>
          </div>
        </section>
      </div>

      {showKeyboard ? (
        <div className="trainer__keyboard card">
          <Keyboard layout={keyboardLayout} nextChar={status === 'running' ? nextChar : exercise?.text[0] || ''} />
          {settings.mode === 'code' ? (
            <p className="trainer__keyboard-note">
              <Code2 size={14} /> Код печатается в английской раскладке. Tab автоматически ставит отступ строки.
            </p>
          ) : null}
        </div>
      ) : (
        <button type="button" className="trainer__keyboard-toggle" onClick={() => setShowKeyboard(true)}>
          <Hand size={16} /> Показать подсказку пальцев
        </button>
      )}

      <ResultsModal
        result={result}
        user={user}
        onClose={() => setResult(null)}
        onRestart={() => {
          pendingStart.current = true;
          setResult(null);
          restartRun();
        }}
        modeMeta={modeMeta}
      />
    </div>
  );
}

function charClass(entry, isCurrent, isPast, extra = '') {
  const classes = ['typing__char'];
  if (extra) classes.push(`typing__char--${extra}`);
  if (entry) {
    classes.push(entry.correct ? 'is-correct' : 'is-error');
  } else if (isPast) {
    classes.push('is-correct');
  }
  if (isCurrent) classes.push('is-current');
  return classes.join(' ');
}

function ResultsModal({ result, user, onClose, onRestart, modeMeta }) {
  if (!result) return null;
  const { local, server, saving, error } = result;
  const session = server?.session;
  const cpm = session?.cpm ?? local.cpm;
  const accuracy = session?.accuracy ?? local.accuracy;
  const errors = session?.errors ?? local.errors;
  const maxCombo = session?.max_combo ?? local.maxCombo;
  const duration = session?.duration_sec ?? local.duration;
  const level = server?.level_after;
  const achievements = server?.achievements || [];
  const unlocks = server?.unlocks || { modes: [], difficulties: [] };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={server?.level_up ? 'Новый уровень!' : 'Забег завершён'}
      subtitle={
        server?.level_up
          ? `${level.rank} · уровень ${level.level}. Продолжайте в том же ритме.`
          : `${modeMeta?.title || 'Тренировка'} · ${formatDuration(duration)}`
      }
      footer={
        <div className="results__footer">
          <div className="results__footer-left">
            {user ? (
              <Link to="/stats" className="btn btn--ghost" onClick={onClose}>
                <Gauge size={16} /> Статистика
              </Link>
            ) : null}
          </div>
          <div className="results__footer-right">
            <Button variant="ghost" onClick={onClose}>
              Закрыть
            </Button>
            <Button onClick={onRestart} icon={RotateCcw}>
              Ещё раз
            </Button>
          </div>
        </div>
      }
    >
      <div className="results">
        <div className="results__hero">
          <div className="results__metric results__metric--main">
            <span>Скорость</span>
            <strong>
              {formatNumber(cpm)}
              <small>зн/мин</small>
            </strong>
            {server?.bests?.cpm ? <Badge tone="gold">Новый рекорд</Badge> : null}
          </div>
          <div className="results__metric">
            <span>Точность</span>
            <strong>{Number(accuracy).toFixed(1)}<small>%</small></strong>
          </div>
          <div className="results__metric">
            <span>Макс. комбо</span>
            <strong>{formatNumber(maxCombo)}</strong>
          </div>
          <div className="results__metric">
            <span>Ошибки</span>
            <strong>{formatNumber(errors)}</strong>
          </div>
          <div className="results__metric">
            <span>Слов/мин</span>
            <strong>{formatNumber(session?.wpm ?? local.cpm / 5)}</strong>
          </div>
        </div>

        {saving ? (
          <div className="results__saving">
            <Loader2 className="spin" size={18} /> Сохраняем результат…
          </div>
        ) : null}

        {error ? (
          <div className="alert alert--error">
            Результат не сохранился: {error}. Метрики остались на экране — попробуйте ещё раз.
          </div>
        ) : null}

        {!user ? (
          <div className="results__guest">
            <div>
              <strong>Сохраните этот результат</strong>
              <p>Аккаунт хранит опыт, достижения и историю тренировок между устройствами.</p>
            </div>
            <div className="results__guest-actions">
              <Link to="/register" className="btn btn--primary btn--sm">Создать аккаунт</Link>
              <Link to="/login" className="btn btn--ghost btn--sm">Войти</Link>
            </div>
          </div>
        ) : null}

        {server ? (
          <>
            <div className="results__stats-row">
              <div className="results__xp">
                <span className="results__xp-label">Опыт за забег</span>
                <strong>
                  +{formatNumber(server.xp.session_xp + server.xp.achievement_xp)} XP
                </strong>
                <div className="results__xp-breakdown">
                  <span>символы ×{server.xp.accuracy_multiplier}</span>
                  <span>комбо ×{server.xp.combo_multiplier}</span>
                  <span>бонусы ×{server.xp.bonus_multiplier}</span>
                </div>
              </div>
              <div className="results__level">
                <span>Уровень {level.level} · {level.rank}</span>
                <ProgressBar value={level.progress.xp_into_level} max={level.progress.xp_for_level} tone="amber" showLabel />
                <small>
                  {level.progress.xp_to_next > 0
                    ? `Ещё ${formatNumber(level.progress.xp_to_next)} XP до уровня ${level.level + 1}`
                    : 'Максимальный уровень достигнут'}
                </small>
              </div>
            </div>

            {achievements.length ? (
              <div className="results__achievements">
                <span className="results__label">
                  <Award size={15} /> Новые достижения
                </span>
                <div className="achievement-toast-list">
                  {achievements.map((achievement) => (
                    <div className={`achievement-toast tier-${achievement.tier}`} key={achievement.code}>
                      <span className="achievement-toast__icon">
                        <Sparkles size={16} />
                      </span>
                      <div>
                        <strong>{achievement.title}</strong>
                        <span>{achievement.description}</span>
                      </div>
                      <b>+{achievement.xp} XP</b>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {unlocks.modes.length || unlocks.difficulties.length ? (
              <div className="results__unlocks">
                <Target size={16} />
                <span>Открыто:</span>
                {unlocks.modes.map((code) => (
                  <Badge tone="mint" key={code}>
                    {code === 'code' ? 'Код' : code === 'symbols' ? 'Символы' : code}
                  </Badge>
                ))}
                {unlocks.difficulties.map((code) => (
                  <Badge tone="violet" key={code}>
                    {code === 'hard' ? 'Нагрузка' : code === 'expert' ? 'Испытание' : code}
                  </Badge>
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </Modal>
  );
}
