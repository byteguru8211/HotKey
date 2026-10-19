import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Sparkles } from 'lucide-react';
import AuthShell from '../components/AuthShell';
import { Button, Field } from '../components/Ui';
import { useAuth } from '../lib/auth';

function passwordStrength(password) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-zа-я]/.test(password) && /[A-ZА-Я]/.test(password)) score += 1;
  if (/\d/.test(password) && /[^\w\s]/.test(password)) score += 1;
  return Math.min(4, score);
}

const STRENGTH_LABELS = ['Слишком простой', 'Простой', 'Нормальный', 'Надёжный', 'Отличный'];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => passwordStrength(form.password), [form.password]);

  const update = (key) => (event) => setForm((previous) => ({ ...previous, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (form.username.trim().length < 2) nextErrors.username = 'Минимум 2 символа';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) nextErrors.email = 'Похоже на опечатку в почте';
    if (form.password.length < 8) nextErrors.password = 'Пароль должен быть не короче 8 символов';
    if (form.password !== form.confirm) nextErrors.confirm = 'Пароли не совпадают';
    setErrors(nextErrors);
    setMessage('');
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    try {
      await register({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        language: 'ru',
      });
      navigate(location.state?.from || '/train', { replace: true });
    } catch (error) {
      setErrors(error.fields || {});
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      side="register"
      eyebrow="Регистрация"
      title="Стать героем арены"
      subtitle="Создайте профиль, чтобы сохранять рекорды и открывать новые режимы."
      footer={
        <span>
          Уже с нами? <Link to="/login">Войти в аккаунт</Link>
        </span>
      }
    >
      <form className="auth__form" onSubmit={submit} noValidate>
        {message ? <div className="alert alert--error">{message}</div> : null}

        <Field label="Имя героя" htmlFor="register-username" error={errors.username} hint="Так вас увидят в рейтинге">
          <input
            id="register-username"
            className="input"
            type="text"
            autoComplete="nickname"
            placeholder="Например, nordwind"
            value={form.username}
            onChange={update('username')}
            maxLength={24}
            required
          />
        </Field>

        <Field label="Электронная почта" htmlFor="register-email" error={errors.email}>
          <input
            id="register-email"
            className="input"
            type="email"
            autoComplete="email"
            placeholder="hero@example.com"
            value={form.email}
            onChange={update('email')}
            required
          />
        </Field>

        <div className="auth__row">
          <Field label="Пароль" htmlFor="register-password" error={errors.password}>
            <div className="input-wrap">
              <input
                id="register-password"
                className="input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Минимум 8 символов"
                value={form.password}
                onChange={update('password')}
                required
              />
              <button
                type="button"
                className="input-wrap__action"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </Field>

          <Field label="Повтор пароля" htmlFor="register-confirm" error={errors.confirm}>
            <input
              id="register-confirm"
              className="input"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Ещё раз"
              value={form.confirm}
              onChange={update('confirm')}
              required
            />
          </Field>
        </div>

        {form.password ? (
          <div className="strength" data-strength={strength}>
            <div className="strength__bars">
              {[0, 1, 2, 3].map((index) => (
                <span key={index} className={index < strength ? 'is-on' : ''} />
              ))}
            </div>
            <span>{STRENGTH_LABELS[strength]}</span>
          </div>
        ) : null}

        <Button type="submit" size="lg" className="btn--block" loading={loading} icon={loading ? undefined : Sparkles}>
          Создать аккаунт
        </Button>
        <p className="auth__note">
          Регистрируясь, вы соглашаетесь бережно относиться к клавиатуре и не сдаваться после первой ошибки.
        </p>
      </form>
    </AuthShell>
  );
}
