export function formatNumber(value, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return Number(value).toLocaleString('ru-RU', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatTime(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

export function formatDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  if (total < 60) return `${total} сек`;
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  if (minutes < 60) return rest ? `${minutes} мин ${rest} сек` : `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  return restMinutes ? `${hours} ч ${restMinutes} мин` : `${hours} ч`;
}

export function formatShortDate(value) {
  if (!value) return '';
  const date = new Date(value.endsWith?.('Z') || value.includes?.('T') ? value : `${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value.endsWith('Z') ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatInterval(key) {
  const map = {
    today: 'сегодня',
    week: 'на этой неделе',
    all: 'за всё время',
  };
  return map[key] || key;
}

export function plural(number, forms) {
  const value = Math.abs(Number(number)) % 100;
  const last = value % 10;
  if (value > 10 && value < 20) return forms[2];
  if (last > 1 && last < 5) return forms[1];
  if (last === 1) return forms[0];
  return forms[2];
}

export const MODE_LABELS = {
  words: 'Слова',
  sentences: 'Предложения',
  symbols: 'Символы',
  code: 'Код',
};

export const DIFFICULTY_LABELS = {
  easy: 'Разминка',
  normal: 'Ритм',
  hard: 'Нагрузка',
  expert: 'Испытание',
};

export const LANGUAGE_LABELS = { ru: 'Русский', en: 'English' };

export const TIER_LABELS = {
  bronze: 'Бронза',
  silver: 'Серебро',
  gold: 'Золото',
  legend: 'Легенда',
};

export function symbolLabel(symbol) {
  if (symbol === ' ' || symbol === '␠') return 'пробел';
  if (symbol === '\n' || symbol === '⏎') return 'Enter';
  return symbol;
}
