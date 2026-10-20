import { FINGERS, FINGER_META, fingerInfo } from '../lib/keyboard';

// Контуры нарисованы для левой руки; правая получается зеркальным отражением.
const HAND_FINGERS = [
  { leftId: 'lp', rightId: 'rp', d: 'M69 126 C62 116 58 101 57 82 L56 68 C55 55 63 47 74 47 C85 47 92 56 92 69 L94 119 C87 120 78 122 69 126 Z', nail: { x: 64, y: 55, width: 19, height: 18, rx: 8 }, joints: ['M62 84 C70 81 79 81 90 84', 'M64 104 C73 101 83 101 93 104'] },
  { leftId: 'lr', rightId: 'rr', d: 'M91 119 L87 48 C86 31 95 20 108 20 C122 20 130 31 129 48 L128 112 C115 113 103 115 91 119 Z', nail: { x: 97, y: 28, width: 21, height: 20, rx: 9 }, joints: ['M92 61 C103 58 116 58 127 61', 'M93 87 C104 84 116 84 128 87'] },
  { leftId: 'lm', rightId: 'rm', d: 'M126 112 L125 34 C125 16 135 5 149 5 C163 5 173 17 172 35 L168 112 C154 111 140 111 126 112 Z', nail: { x: 136, y: 14, width: 22, height: 21, rx: 10 }, joints: ['M129 51 C141 48 157 48 169 51', 'M128 80 C141 77 155 77 169 80'] },
  { leftId: 'li', rightId: 'ri', d: 'M166 113 L170 47 C171 30 181 20 194 21 C208 22 216 34 213 51 L204 124 C192 119 180 115 166 113 Z', nail: { x: 181, y: 29, width: 21, height: 20, rx: 9, transform: 'rotate(4 191 39)' }, joints: ['M171 63 C183 61 196 62 210 66', 'M169 89 C181 87 194 89 207 93'] },
  { leftId: 'thumb', rightId: 'thumb', d: 'M199 125 C211 109 227 96 243 88 C257 81 269 85 274 96 C279 107 274 117 261 124 L224 146 C214 143 205 136 199 125 Z', nail: { x: 242, y: 92, width: 21, height: 18, rx: 8, transform: 'rotate(-28 252 101)' }, joints: ['M220 116 C228 122 234 130 237 138'] },
];

function fingerStyle(fingerId) {
  const type = FINGERS[fingerId]?.type || 'thumb';
  return { '--finger-color': FINGER_META[type].color };
}

function Finger({ shape, fingerId, active }) {
  return (
    <g className={`hand-guide__finger ${active ? 'is-active' : ''}`} data-finger={fingerId} style={fingerStyle(fingerId)}>
      <path className="hand-guide__finger-shape" d={shape.d} />
      {shape.joints.map((joint, index) => <path className="hand-guide__joint" d={joint} key={index} />)}
      <rect className="hand-guide__nail" {...shape.nail} />
      <circle className="hand-guide__fingertip" cx={shape.nail.x + shape.nail.width / 2} cy={shape.nail.y + 4} r="3" />
    </g>
  );
}

export default function HandGuide({ activeFingers = [], compact = false }) {
  const active = new Set(activeFingers);
  const names = activeFingers.map((id) => {
    const info = fingerInfo(id);
    return info ? `${info.label.toLowerCase()} ${info.side}` : '';
  }).filter(Boolean);
  const description = names.length
    ? `Нужные пальцы: ${names.join(' и ')}`
    : 'Руки в исходной позиции над домашним рядом';

  return (
    <div className={`hand-guide ${compact ? 'hand-guide--compact' : ''}`}>
      <svg className="hand-guide__drawing" viewBox="0 0 600 190" role="img" aria-label={description} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="hand-surface" x1="0" y1="0" x2="0.8" y2="1">
            <stop offset="0" stopColor="#1d2939" />
            <stop offset="1" stopColor="#111925" />
          </linearGradient>
        </defs>
        <path className="hand-guide__home-line" d="M24 146 H576" />
        {['left', 'right'].map((side) => (
          <g className={`hand-guide__hand hand-guide__hand--${side}`} key={side} transform={side === 'right' ? 'translate(600 0) scale(-1 1)' : undefined}>
            <path className="hand-guide__palm" d="M68 116 C88 107 111 105 144 107 C177 106 207 113 224 133 C235 146 238 164 235 184 H70 C65 165 64 139 68 116 Z" />
            <path className="hand-guide__palm-light" d="M88 127 C117 116 173 116 205 133 C214 139 220 149 222 159" />
            <path className="hand-guide__palm-crease" d="M103 143 C130 132 169 133 196 148" />
            <path className="hand-guide__palm-crease" d="M91 158 C119 153 145 156 166 171" />
            {HAND_FINGERS.map((shape) => {
              const fingerId = side === 'left' ? shape.leftId : shape.rightId;
              return <Finger shape={shape} fingerId={fingerId} active={active.has(fingerId)} key={`${side}-${shape.leftId}`} />;
            })}
          </g>
        ))}
        <text className="hand-guide__side-label" x="148" y="180" textAnchor="middle">ЛЕВАЯ РУКА</text>
        <text className="hand-guide__side-label" x="452" y="180" textAnchor="middle">ПРАВАЯ РУКА</text>
      </svg>
      <span className="hand-guide__caption" aria-hidden="true">{description}</span>
    </div>
  );
}
