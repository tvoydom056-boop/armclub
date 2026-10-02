import type { OpponentLook } from '../core/opponents';

const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');
const darker = (n: number, k: number) => {
  const c = (s: number) => Math.round(((n >> s) & 255) * k);
  return '#' + [c(16), c(8), c(0)].map((v) => v.toString(16).padStart(2, '0')).join('');
};
const INK = '#3b1d14';

/** Упрощённый портрет соперника для карточек (в сцене лицо рисуется кодом с мимикой). */
export function Portrait({ look }: { look: OpponentLook }) {
  const w = 120 * look.build;
  const hair = hex(look.hair);
  const stroke = { stroke: INK, strokeWidth: 7, strokeLinejoin: 'round' as const };
  return (
    <svg viewBox="-140 -150 280 310" className="portrait" aria-hidden>
      <path d={`M ${-w} 160 Q ${-w} 84 -60 74 L 60 74 Q ${w} 84 ${w} 160 Z`} fill={hex(look.shirt)} {...stroke} />
      <rect x="-30" y="40" width="60" height="46" rx="14" fill={hex(look.skinShade)} {...stroke} strokeWidth={6} />
      <ellipse cx="-97" cy="4" rx="14" ry="22" fill={hex(look.skin)} {...stroke} strokeWidth={6} />
      <ellipse cx="97" cy="4" rx="14" ry="22" fill={hex(look.skin)} {...stroke} strokeWidth={6} />
      <ellipse cx="0" cy="0" rx="99" ry="105" fill={hex(look.skin)} {...stroke} strokeWidth={8} />
      <ellipse cx="-48" cy="-58" rx="26" ry="12" fill="#fff" opacity="0.35" transform="rotate(-34 -48 -58)" />

      {look.facial === 'beard' && (
        <path d="M -98 6 Q -92 100 0 120 Q 92 100 98 6 Q 70 36 0 34 Q -70 36 -98 6 Z" fill={hair} {...stroke} strokeWidth={6} />
      )}

      <ellipse cx="0" cy="16" rx="15" ry="13" fill={hex(look.skinShade)} stroke={INK} strokeWidth="5" />
      {[-1, 1].map((s) => (
        <g key={s}>
          <ellipse cx={s * 37} cy="-12" rx="21" ry="23" fill="#fff" stroke={INK} strokeWidth="5" />
          <circle cx={s * 37} cy="-8" r="9.5" fill="#2b1a14" />
          <circle cx={s * 37 - 3} cy="-12" r="3.2" fill="#fff" />
        </g>
      ))}
      <path d="M -32 66 Q 0 88 32 66 Q 0 76 -32 66 Z" fill="#6b1f2a" stroke={INK} strokeWidth="6" strokeLinejoin="round" />
      {look.facial === 'mustache' && (
        <path d="M -52 38 Q -26 22 0 34 Q 26 22 52 38 Q 30 56 0 44 Q -30 56 -52 38 Z" fill={hair} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      )}
      {look.glasses &&
        [-1, 1].map((s) => (
          <circle key={s} cx={s * 37} cy="-12" r="31" fill="#fff" fillOpacity="0.2" stroke="#2a2a3a" strokeWidth="6" />
        ))}
      {look.glasses && <line x1="-7" y1="-14" x2="7" y2="-14" stroke="#2a2a3a" strokeWidth="6" />}

      {look.hairStyle === 'bald' && <ellipse cx="-30" cy="-82" rx="24" ry="9" fill="#fff" opacity="0.55" transform="rotate(-20 -30 -82)" />}
      {look.hairStyle === 'messy' && (
        <polygon
          points="-98,-24 -106,-70 -84,-94 -84,-126 -54,-102 -42,-134 -20,-106 0,-140 18,-106 40,-132 52,-102 82,-124 88,-92 106,-68 98,-24 82,-52 40,-74 0,-64 -40,-74 -82,-52"
          fill={hair}
          {...stroke}
          strokeWidth={6}
        />
      )}
      {look.hairStyle === 'cap' && (
        <>
          <path d="M -102 -44 Q -98 -122 0 -130 Q 98 -122 102 -44 Q 0 -60 -102 -44 Z" fill={hex(look.accent)} {...stroke} />
          <path d="M -112 -48 Q 0 -80 112 -48 Q 80 -22 0 -20 Q -80 -22 -112 -48 Z" fill={darker(look.accent, 0.78)} {...stroke} />
        </>
      )}
      {look.hairStyle === 'bun' && (
        <>
          <ellipse cx="0" cy="-128" rx="34" ry="28" fill={hair} {...stroke} strokeWidth={6} />
          <path d="M -102 -6 Q -100 -114 0 -116 Q 100 -114 102 -6 Q 84 -40 40 -66 Q 0 -72 -40 -66 Q -84 -40 -102 -6 Z" fill={hair} {...stroke} strokeWidth={6} />
        </>
      )}
      {look.hairStyle === 'bandana' && (
        <>
          <path d="M -100 -48 Q -94 -124 0 -126 Q 94 -124 100 -48 Z" fill={hair} {...stroke} strokeWidth={6} />
          <path d="M -104 -48 Q 0 -76 104 -48 L 102 -20 Q 0 -44 -102 -20 Z" fill={hex(look.accent)} {...stroke} />
          <polygon points="98,-38 134,-62 128,-36" fill={darker(look.accent, 0.85)} {...stroke} strokeWidth={5} />
        </>
      )}
      {[-1, 1].map((s) => (
        <line key={s} x1={s * 10} y1="-48" x2={s * 62} y2="-52" stroke={look.hairStyle === 'bald' && look.facial === 'none' ? darker(look.skin, 0.6) : hair} strokeWidth="10" strokeLinecap="round" />
      ))}
    </svg>
  );
}
