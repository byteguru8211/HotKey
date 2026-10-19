import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, Trophy } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
  achievement: Trophy,
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((items) => items.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (message, type = 'info', options = {}) => {
      counter.current += 1;
      const id = counter.current;
      const duration = options.duration ?? 4200;
      setToasts((items) => [...items.slice(-3), { id, message, type, title: options.title }]);
      if (duration > 0) window.setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({ toast, dismiss, success: (m, o) => toast(m, 'success', o), error: (m, o) => toast(m, 'error', o) }),
    [toast, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((item) => {
          const Icon = ICONS[item.type] || Info;
          return (
            <div className={`toast toast--${item.type}`} key={item.id}>
              <span className="toast__icon">
                <Icon size={18} />
              </span>
              <div className="toast__body">
                {item.title ? <strong>{item.title}</strong> : null}
                <span>{item.message}</span>
              </div>
              <button type="button" className="toast__close" onClick={() => dismiss(item.id)} aria-label="Закрыть">
                ×
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast должен использоваться внутри ToastProvider');
  return context;
}
