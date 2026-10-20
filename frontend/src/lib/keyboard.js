export const FINGERS = {
  lp: { type: 'pinky', side: 'left' },
  lr: { type: 'ring', side: 'left' },
  lm: { type: 'middle', side: 'left' },
  li: { type: 'index', side: 'left' },
  ri: { type: 'index', side: 'right' },
  rm: { type: 'middle', side: 'right' },
  rr: { type: 'ring', side: 'right' },
  rp: { type: 'pinky', side: 'right' },
  thumb: { type: 'thumb', side: 'both' },
};

export const FINGER_META = {
  pinky: { label: 'Мизинец', color: '#ff7d9c' },
  ring: { label: 'Безымянный', color: '#ffb15c' },
  middle: { label: 'Средний', color: '#61d9a0' },
  index: { label: 'Указательный', color: '#56bdf5' },
  thumb: { label: 'Большой', color: '#b49cff' },
};

const EN_ROWS = [
  {
    keys: ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
    shift: ['~', '!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+'],
    fingers: ['lp', 'lp', 'lr', 'lm', 'li', 'li', 'ri', 'ri', 'rm', 'rr', 'rp', 'rp', 'rp'],
  },
  {
    keys: ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
    shift: ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '{', '}', '|'],
    fingers: ['lp', 'lr', 'lm', 'li', 'li', 'ri', 'ri', 'rm', 'rr', 'rp', 'rp', 'rp', 'rp'],
  },
  {
    keys: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"],
    shift: ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ':', '"'],
    fingers: ['lp', 'lr', 'lm', 'li', 'li', 'ri', 'ri', 'rm', 'rr', 'rp', 'rp'],
  },
  {
    keys: ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
    shift: ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '<', '>', '?'],
    fingers: ['lp', 'lr', 'lm', 'li', 'li', 'ri', 'ri', 'rm', 'rr', 'rp'],
  },
];

const RU_ROWS = [
  {
    keys: ['ё', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
    shift: ['Ё', '!', '"', '№', ';', '%', ':', '?', '*', '(', ')', '_', '+'],
    fingers: ['lp', 'lp', 'lr', 'lm', 'li', 'li', 'ri', 'ri', 'rm', 'rr', 'rp', 'rp', 'rp'],
  },
  {
    keys: ['й', 'ц', 'у', 'к', 'е', 'н', 'г', 'ш', 'щ', 'з', 'х', 'ъ', '\\'],
    shift: ['Й', 'Ц', 'У', 'К', 'Е', 'Н', 'Г', 'Ш', 'Щ', 'З', 'Х', 'Ъ', '/'],
    fingers: ['lp', 'lr', 'lm', 'li', 'li', 'ri', 'ri', 'rm', 'rr', 'rp', 'rp', 'rp', 'rp'],
  },
  {
    keys: ['ф', 'ы', 'в', 'а', 'п', 'р', 'о', 'л', 'д', 'ж', 'э'],
    shift: ['Ф', 'Ы', 'В', 'А', 'П', 'Р', 'О', 'Л', 'Д', 'Ж', 'Э'],
    fingers: ['lp', 'lr', 'lm', 'li', 'li', 'ri', 'ri', 'rm', 'rr', 'rp', 'rp'],
  },
  {
    keys: ['я', 'ч', 'с', 'м', 'и', 'т', 'ь', 'б', 'ю', '.'],
    shift: ['Я', 'Ч', 'С', 'М', 'И', 'Т', 'Ь', 'Б', 'Ю', ','],
    fingers: ['lp', 'lr', 'lm', 'li', 'li', 'ri', 'ri', 'rm', 'rr', 'rp'],
  },
];

const ROW_WIDTHS = [13, 13, 11, 10];

export const LAYOUTS = {
  en: { title: 'English', rows: EN_ROWS, widths: ROW_WIDTHS },
  ru: { title: 'Русский', rows: RU_ROWS, widths: ROW_WIDTHS },
};

function buildIndex(rows) {
  const index = new Map();
  rows.forEach((row) => {
    row.keys.forEach((key, position) => {
      const finger = row.fingers[position];
      const shiftChar = row.shift[position];
      if (!index.has(key)) index.set(key, { key, shift: false, finger });
      if (!index.has(shiftChar)) index.set(shiftChar, { key, shift: true, finger });
      if (/^[a-zа-яё]$/i.test(key)) {
        index.set(key.toUpperCase(), { key, shift: true, finger });
      }
    });
  });
  index.set(' ', { key: 'Space', shift: false, finger: 'thumb' });
  index.set('\n', { key: 'Enter', shift: false, finger: 'rp' });
  return index;
}

const INDEXES = {
  en: buildIndex(EN_ROWS),
  ru: buildIndex(RU_ROWS),
};

export function resolveKey(layout, char) {
  if (!char) return null;
  return INDEXES[layout === 'ru' ? 'ru' : 'en'].get(char) || null;
}

/**
 * Полное действие для следующего символа. Для Shift выбирается мизинец
 * противоположной руки, чтобы основная рука оставалась над своей зоной.
 */
export function resolveTypingAction(layout, char) {
  const target = resolveKey(layout, char);
  if (!target) return null;

  const mainSide = FINGERS[target.finger]?.side;
  const shiftSide = target.shift ? (mainSide === 'left' ? 'right' : 'left') : null;
  const shiftFinger = shiftSide === 'left' ? 'lp' : shiftSide === 'right' ? 'rp' : null;

  return {
    ...target,
    shiftSide,
    shiftFinger,
    activeFingers: [target.finger, shiftFinger].filter(Boolean),
  };
}

export function fingerInfo(fingerId) {
  const finger = FINGERS[fingerId];
  if (!finger) return null;
  const meta = FINGER_META[finger.type];
  const side = finger.side === 'left' ? 'левой руки' : finger.side === 'right' ? 'правой руки' : 'обеих рук';
  return { ...meta, ...finger, label: meta.label, side };
}

export function describeNextKey(layout, char) {
  const target = resolveTypingAction(layout, char);
  if (!target) return null;
  return { ...target, finger: fingerInfo(target.finger) };
}
