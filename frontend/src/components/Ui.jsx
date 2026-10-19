import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Sparkles } from 'lucide-react';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  loading = false,
  icon: Icon,
  ...props
}) {
  return (
    <button
      type={type}
      className={`btn btn--${variant} btn--${size} ${className}`.trim()}
      disabled={props.disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="btn__spinner" size={18} /> : Icon ? <Icon size={18} /> : null}
      <span>{children}</span>
    </button>
  );
}

export function Badge({ children, tone = 'muted', className = '', dot = false }) {
  return (
    <span className={`badge badge--${tone} ${className}`.trim()}>
      {dot ? <span className="badge__dot" /> : null}
      {children}
    </span>
  );
}

export function ProgressBar({ value = 0, max = 100, tone = 'amber', className = '', showLabel = false }) {
  const percent = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={`progress progress--${tone} ${className}`.trim()}>
      <div className="progress__track">
        <div className="progress__bar" style={{ width: `${percent}%` }} />
      </div>
      {showLabel ? <span className="progress__label">{Math.round(percent)}%</span> : null}
    </div>
  );
}

export function Field({ label, htmlFor, error, hint, children, className = '' }) {
  return (
    <div className={`field ${error ? 'field--error' : ''} ${className}`.trim()}>
      {label ? (
        <label className="field__label" htmlFor={htmlFor}>
          {label}
        </label>
      ) : null}
      {children}
      {error ? <p className="field__error">{error}</p> : hint ? <p className="field__hint">{hint}</p> : null}
    </div>
  );
}

export function Spinner({ size = 20, label = 'Загрузка' }) {
  return (
    <span className="spinner" role="status" aria-label={label}>
      <Loader2 size={size} />
    </span>
  );
}

export function PageLoader({ label = 'Загружаем данные' }) {
  return (
    <div className="page-loader">
      <div className="page-loader__mark">
        <Sparkles size={20} />
      </div>
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ icon: Icon = Sparkles, title, description, action, className = '' }) {
  return (
    <div className={`empty ${className}`.trim()}>
      <span className="empty__icon">
        <Icon size={22} />
      </span>
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action ? <div className="empty__action">{action}</div> : null}
    </div>
  );
}

export function Modal({ open, onClose, title, subtitle, children, size = 'md', footer }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="modal" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <div className={`modal__panel modal__panel--${size}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal__glow" aria-hidden="true" />
        <div className="modal__head">
          <div>
            {title ? <h2>{title}</h2> : null}
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer ? <div className="modal__footer">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

export function Segmented({ options, value, onChange, size = 'md', className = '' }) {
  return (
    <div className={`seg seg--${size} ${className}`.trim()} role="tablist">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          className={`seg__item ${value === option.value ? 'is-active' : ''}`}
          onClick={() => onChange(option.value)}
          disabled={option.disabled}
          title={option.title}
        >
          {option.icon ? <option.icon size={15} /> : null}
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Skeleton({ width = '100%', height = 16, radius = 8, className = '' }) {
  return <span className={`skeleton ${className}`.trim()} style={{ width, height, borderRadius: radius }} />;
}
