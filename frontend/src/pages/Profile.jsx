import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  CalendarDays,
  Check,
  Flame,
  Gauge,
  KeyRound,
  LogOut,
  Mail,
  Medal,
  Save,
  Settings2,
  UserRound,
  Zap,
} from 'lucide-react';
import { Badge, Button, Field, ProgressBar, Segmented } from '../components/Ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDuration, formatNumber, formatShortDate } from '../lib/format';
import { useToast } from '../lib/toast';

export default function Profile() {
  const { user, updateUser, logout, refresh } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState(user.username);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState('');
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordMessage, setPasswordMessage] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const progress = user.xp_progress;
  const initial = user.username?.trim()?.[0]?.toUpperCase() || 'Г';

  const saveUsername = async (event) => {
    event.preventDefault();
    setNameError('');
    if (username.trim() === user.username) return;
    setSavingName(true);
    try {
      const data = await api.profile.update({ username: username.trim() });
      updateUser(data.user);
      toast('Имя героя обновлено', 'success');
    } catch (error) {
      setNameError(error.fields?.username || error.message);
    } finally {
      setSavingName(false);
    }
  };

  const changeSetting = async (patch) => {
    setSettingsSaving(true);
    updateUser(patch);
    try {
      const data = await api.profile.update(patch);
      updateUser(data.user);
    } catch (error) {
      toast(error.message, 'error');
      refresh().catch(() => {});
    } finally {
      setSettingsSaving(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setPasswordErrors({});
    setPasswordMessage('');
    if (passwordForm.new_password !== passwordForm.confirm) {
      setPasswordErrors({ confirm: 'Пароли не совпадают' });
      return;
    }
    setSavingPassword(true);
    try {
      await api.auth.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      setPasswordForm({ current_password: '', new_password: '', confirm: '' });
      toast('Пароль обновлён', 'success');
    } catch (error) {
      setPasswordErrors(error.fields || {});
      setPasswordMessage(error.message);
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.assign('/');
  };

  return (
    <div className="page profile-page">
      <header className="page__head">
        <div>
          <span className="eyebrow">
            <UserRound size={14} /> Профиль
          </span>
          <h1>{user.username}</h1>
          <p>Настройки, безопасность и короткая сводка достижений.</p>
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={handleLogout}>
          <LogOut size={16} /> Выйти
        </button>
      </header>

      <section className="profile-grid">
        <article className="profile-card card">
          <div className="profile-card__head">
            <span className="profile-avatar">
              {initial}
              <span className="profile-avatar__level">{user.level}</span>
            </span>
            <div>
              <h2>{user.username}</h2>
              <span className="profile-card__email">
                <Mail size={13} /> {user.email}
              </span>
              <div className="profile-card__badges">
                <Badge tone="amber">
                  <Medal size={12} /> {user.rank}
                </Badge>
                <Badge tone="muted">
                  <CalendarDays size={12} /> с {formatShortDate(user.created_at)}
                </Badge>
              </div>
            </div>
          </div>

          <div className="profile-level">
            <div className="profile-level__top">
              <span>Уровень {user.level}</span>
              <span>{formatNumber(user.xp)} XP</span>
            </div>
            <ProgressBar value={progress.xp_into_level} max={progress.xp_for_level} tone="amber" />
            <span className="profile-level__hint">
              {progress.xp_to_next > 0
                ? `Ещё ${formatNumber(progress.xp_to_next)} XP до уровня ${user.level + 1}`
                : 'Максимальный уровень'}
            </span>
          </div>

          <div className="profile-stats">
            <div>
              <span>Лучшая скорость</span>
              <strong>{formatNumber(user.best_cpm)} <small>зн/мин</small></strong>
            </div>
            <div>
              <span>Точность</span>
              <strong>{Number(user.best_accuracy).toFixed(1)}<small>%</small></strong>
            </div>
            <div>
              <span>Комбо</span>
              <strong>{formatNumber(user.best_combo)}</strong>
            </div>
            <div>
              <span>В практике</span>
              <strong>{formatDuration(user.total_seconds)}</strong>
            </div>
          </div>

          <div className="profile-streak">
            <span className="profile-streak__icon">
              <Flame size={18} />
            </span>
            <div>
              <strong>
                {user.streak_days} {user.streak_days === 1 ? 'день' : user.streak_days < 5 ? 'дня' : 'дней'} подряд
              </strong>
              <span>Лучшая серия — {user.longest_streak} дней</span>
            </div>
            <Link to="/train" className="btn btn--soft btn--sm">
              <Zap size={15} /> Продолжить
            </Link>
          </div>
        </article>

        <div className="profile-side">
          <article className="card settings-card">
            <div className="card__head">
              <div>
                <h2>Настройки</h2>
                <p>Применяются сразу</p>
              </div>
              <Settings2 size={17} className="card__icon" />
            </div>

            <div className="settings-row">
              <div>
                <strong>Звуки клавиш</strong>
                <span>Клики, ошибки и сигналы наград</span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={Boolean(user.sound_enabled)}
                  onChange={(event) => changeSetting({ sound_enabled: event.target.checked })}
                  disabled={settingsSaving}
                />
                <span className="switch__track" />
              </label>
            </div>

            <div className="settings-row">
              <div>
                <strong>Визуальные эффекты</strong>
                <span>Искры, свечение и анимации комбо</span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={Boolean(user.effects_enabled)}
                  onChange={(event) => changeSetting({ effects_enabled: event.target.checked })}
                  disabled={settingsSaving}
                />
                <span className="switch__track" />
              </label>
            </div>

            <div className="settings-row settings-row--stack">
              <div>
                <strong>Раскладка по умолчанию</strong>
                <span>С неё начинается новый забег</span>
              </div>
              <Segmented
                size="sm"
                value={user.preferred_language}
                onChange={(value) => changeSetting({ preferred_language: value })}
                options={[
                  { value: 'ru', label: 'Русский' },
                  { value: 'en', label: 'English' },
                ]}
              />
            </div>

            <Link to="/achievements" className="settings-link">
              <Award size={16} /> Достижения и награды
              <span>→</span>
            </Link>
            <Link to="/stats" className="settings-link">
              <Gauge size={16} /> Полная статистика
              <span>→</span>
            </Link>
          </article>

          <article className="card profile-edit">
            <div className="card__head">
              <div>
                <h2>Имя героя</h2>
                <p>Отображается в рейтинге</p>
              </div>
              <UserRound size={17} className="card__icon" />
            </div>
            <form onSubmit={saveUsername} className="profile-edit__form">
              <Field error={nameError}>
                <input
                  className="input"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  maxLength={24}
                  placeholder="Ваше имя"
                />
              </Field>
              <Button
                type="submit"
                variant="soft"
                loading={savingName}
                disabled={username.trim() === user.username}
                icon={Check}
              >
                Сохранить
              </Button>
            </form>
          </article>
        </div>
      </section>

      <section className="profile-password card">
        <div className="card__head">
          <div>
            <h2>Безопасность</h2>
            <p>Смена пароля для входа в аккаунт</p>
          </div>
          <KeyRound size={17} className="card__icon" />
        </div>
        <form onSubmit={changePassword} className="password-form">
          {passwordMessage ? <div className="alert alert--error">{passwordMessage}</div> : null}
          <Field label="Текущий пароль" htmlFor="current-password" error={passwordErrors.current_password}>
            <input
              id="current-password"
              className="input"
              type="password"
              autoComplete="current-password"
              value={passwordForm.current_password}
              onChange={(event) => setPasswordForm((prev) => ({ ...prev, current_password: event.target.value }))}
              required
            />
          </Field>
          <Field label="Новый пароль" htmlFor="new-password" error={passwordErrors.new_password}>
            <input
              id="new-password"
              className="input"
              type="password"
              autoComplete="new-password"
              value={passwordForm.new_password}
              onChange={(event) => setPasswordForm((prev) => ({ ...prev, new_password: event.target.value }))}
              required
            />
          </Field>
          <Field label="Повтор нового пароля" htmlFor="confirm-password" error={passwordErrors.confirm}>
            <input
              id="confirm-password"
              className="input"
              type="password"
              autoComplete="new-password"
              value={passwordForm.confirm}
              onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirm: event.target.value }))}
              required
            />
          </Field>
          <div className="password-form__action">
            <Button type="submit" loading={savingPassword} icon={Save}>
              Обновить пароль
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
