import { useId } from 'react';
import { Link } from 'react-router-dom';

export default function Logo({ to = '/', compact = false, className = '' }) {
  const gradientId = useId().replace(/:/g, '');
  const glowId = `${gradientId}-glow`;
  const content = (
    <>
      <span className="brand__mark" aria-hidden="true">
        <svg viewBox="0 0 44 44" width="100%" height="100%">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffd98a" />
              <stop offset="0.45" stopColor="#ffb547" />
              <stop offset="1" stopColor="#ff7a3d" />
            </linearGradient>
            <radialGradient id={glowId} cx="50%" cy="35%" r="65%">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.45" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect x="2.5" y="2.5" width="39" height="39" rx="12" fill={`url(#${gradientId})`} />
          <rect x="2.5" y="2.5" width="39" height="39" rx="12" fill={`url(#${glowId})`} />
          <rect
            x="3.5"
            y="3.5"
            width="37"
            height="37"
            rx="11"
            fill="none"
            stroke="rgba(255,255,255,0.38)"
            strokeWidth="1"
          />
          <path d="M14 12.5h15.5v5.2h-9.4v14.2H14z" fill="#180f0b" />
          <circle cx="29.8" cy="27.4" r="2" fill="#180f0b" opacity="0.55" />
        </svg>
      </span>
      {!compact && (
        <span className="brand__text">
          <span className="brand__name">Печать героя</span>
          <span className="brand__tag">клавиатурная арена</span>
        </span>
      )}
    </>
  );

  return (
    <Link to={to} className={`brand ${className}`} aria-label="Печать героя — на главную">
      {content}
    </Link>
  );
}
