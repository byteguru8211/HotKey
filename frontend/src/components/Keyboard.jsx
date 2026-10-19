import { FINGER_META, LAYOUTS, fingerInfo, resolveKey } from '../lib/keyboard';

const SYMBOL_SHIFT = /[^\p{L}\p{N}]/u;

const FINGER_TYPE = {
  lp: 'pinky',
  lr: 'ring',
  lm: 'middle',
  li: 'index',
  ri: 'index',
  rm: 'middle',
  rr: 'ring',
  rp: 'pinky',
  thumb: 'thumb',
};

export default function Keyboard({ layout = 'ru', nextChar = '', compact = false }) {
  const layoutData = LAYOUTS[layout] || LAYOUTS.ru;
  const target = resolveKey(layout, nextChar);
  const activeFinger = target?.finger || null;
  const finger = activeFinger ? fingerInfo(activeFinger) : null;

  return (
    <div className={`keyboard ${compact ? 'keyboard--compact' : ''}`.trim()}>
      <div className="keyboard__hint">
        {target ? (
          <>
            <span className="keyboard__hint-label">Следующая клавиша</span>
            <span className="keyboard__hint-key">
              {target.shift ? <span className="keyboard__shift">Shift</span> : null}
              {target.key === 'Enter' ? 'Enter' : target.key === 'Space' ? 'Пробел' : nextChar}
            </span>
            <span className="keyboard__hint-finger" style={{ color: finger?.color }}>
              <span className="dot" style={{ background: finger?.color }} />
              {finger ? `${finger.label} ${finger.side}` : ''}
            </span>
          </>
        ) : (
          <span className="keyboard__hint-label">
            {nextChar ? 'Для этого символа нет подсказки — переключите раскладку' : 'Подсказка по пальцам появится во время забега'}
          </span>
        )}
      </div>

      <div className="keyboard__keys">
        {layoutData.rows.map((row, rowIndex) => (
          <div className="keyboard__row" key={rowIndex}>
            {row.keys.map((key, index) => {
              const fingerId = row.fingers[index];
              const isNext = Boolean(target && target.key.toLowerCase() === key.toLowerCase());
              const shiftChar = row.shift[index];
              const showShift = SYMBOL_SHIFT.test(shiftChar) && shiftChar !== key;
              return (
                <span
                  key={`${key}-${index}`}
                  className={[
                    'key',
                    key === '\\' ? 'key--backslash' : '',
                    isNext ? 'is-next' : '',
                    activeFinger === fingerId ? 'is-finger' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{ '--finger-color': FINGER_META[FINGER_TYPE[fingerId]]?.color || '#fff' }}
                >
                  {showShift ? <span className="key__shift">{shiftChar}</span> : null}
                  <span className="key__label">{key === '\\' ? '\\' : key}</span>
                </span>
              );
            })}
          </div>
        ))}

        <div className="keyboard__row keyboard__row--bottom">
          <span className={`key key--mod ${target?.shift ? 'is-next' : ''}`}>
            <span className="key__label">Shift</span>
          </span>
          <span
            className={`key key--space ${target?.key === 'Space' ? 'is-next' : ''}`}
            style={{ '--finger-color': FINGER_META.thumb.color }}
          >
            <span className="key__label">Пробел</span>
          </span>
          <span className={`key key--mod ${target?.key === 'Enter' ? 'is-next' : ''}`}>
            <span className="key__label">Enter</span>
          </span>
        </div>
      </div>

      {!compact ? (
        <div className="keyboard__legend">
          {Object.entries(FINGER_META).map(([type, meta]) => (
            <span key={type} className={`legend__item ${finger?.type === type ? 'is-active' : ''}`}>
              <span className="dot" style={{ background: meta.color }} />
              {meta.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
