import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import AuthShell from '../components/AuthShell';
import { Button, Field } from '../components/Ui';
import { useAuth } from '../lib/auth';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setErrors({});
    setMessage('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      const target = location.state?.from || '/train';
      navigate(target, { replace: true });
    } catch (error) {
      setErrors(error.fields || {});
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Вход"
      title="Вернуться на арену"
      subtitle="Войдите, чтобы продолжить серию и забрать накопленный опыт."
      footer={
        <span>
          Нет аккаунта? <Link to="/register">Создать за минуту</Link>
        </span>
      }
    >
      <form className="auth__form" onSubmit={submit} noValidate>
        {message ? <div className="alert alert--error">{message}</div> : null}
        <Field label="Электронная почта" htmlFor="login-email" error={errors.email}>
          <input
            id="login-email"
            className="input"
            type="email"
            autoComplete="email"
            placeholder="hero@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </Field>

        <Field label="Пароль" htmlFor="login-password" error={errors.password}>
          <div className="input-wrap">
            <input
              id="login-password"
              className="input"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Минимум 8 символов"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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

        <Button type="submit" size="lg" className="btn--block" loading={loading} icon={loading ? undefined : LogIn}>
          Войти
        </Button>
        <p className="auth__note">Мы не отправляем письма без повода и бережём ваши данные.</p>
      </form>
    </AuthShell>
  );
}
