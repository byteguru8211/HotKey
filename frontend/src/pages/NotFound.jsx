import { Link } from 'react-router-dom';
import { ArrowLeft, Keyboard, Sparkles } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="page notfound">
      <div className="notfound__art" aria-hidden="true">
        <span className="notfound__key">4</span>
        <span className="notfound__key notfound__key--accent">0</span>
        <span className="notfound__key">4</span>
      </div>
      <span className="eyebrow">
        <Sparkles size={14} /> Страница не найдена
      </span>
      <h1>Такой клавиши здесь нет</h1>
      <p>Возможно, ссылка устарела или в адресе закралась опечатка. Вернитесь на арену и продолжите тренировку.</p>
      <div className="notfound__actions">
        <Link to="/" className="btn btn--ghost">
          <ArrowLeft size={17} /> На главную
        </Link>
        <Link to="/train" className="btn btn--primary">
          <Keyboard size={17} /> В тренажёр
        </Link>
      </div>
    </div>
  );
}
