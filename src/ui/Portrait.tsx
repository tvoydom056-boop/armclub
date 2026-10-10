import type { OpponentLook } from '../core/opponents';
import { ART_OPPONENTS } from '../game/art';

const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');
const darker = (n: number, k: number) => {
  const c = (s: number) => Math.round(((n >> s) & 255) * k);
  return '#' + [c(16), c(8), c(0)].map((v) => v.toString(16).padStart(2, '0')).join('');
};
const INK = '#3b1d14';

/** Готовое лицо для бойцов со спрайтами, рисованный портрет для остальных. */
export function Portrait({ look, id, bust = false }: { look: OpponentLook; id?: string; bust?: boolean }) {
  if (id && ART_OPPONENTS.includes(id)) {
    if (bust) return (
      <div className={`fighter-bust fighter-bust-${id}`} aria-hidden="true">
        <img className="fighter-head" src={`${import.meta.env.BASE_URL}art/opponents/${id}/head_calm.png`} alt="" />
      </div>
    );
    return <img className="portrait" src={`${import.meta.env.BASE_URL}art/opponents/${id}/head_calm.png`} alt="" />;
  }
  const w = 120 * look.build;
  const hair = hex(look.hair);
  const stroke = { stroke: INK, strokeWidth: 7, strokeLinejoin: 'round' as const };
  return (
    <svg viewBox="-140 -150 280 310" className="portrait" aria-hidden>
      <path d={`M ${-w} 160 Q ${-w} 84 -60 74 L 60 74 Q ${w} 84 ${w} 160 Z`} fill={hex(look.shirt)} {...stroke} />
      <path d={`M ${-w} 160 Q ${-w} 96 -60 74 L -35 99 -60 125 -48 160 Z`} fill={hex(look.shirtShade)} />
      <path d={`M 60 74 Q ${w} 90 ${w} 160 L 72 160 84 120 Z`} fill={darker(look.shirt, 0.65)} />
      <rect x="-30" y="40" width="60" height="46" rx="14" fill={hex(look.skinShade)} {...stroke} strokeWidth={6} />
      <ellipse cx="-97" cy="4" rx="14" ry="22" fill={hex(look.skin)} {...stroke} strokeWidth={6} />
      <ellipse cx="97" cy="4" rx="14" ry="22" fill={hex(look.skin)} {...stroke} strokeWidth={6} />
      <path d="M -97 -28 Q -96 -105 -24 -108 Q 63 -116 96 -48 L 99 26 77 77 35 103 -25 105 -76 77 -98 26 Z" fill={hex(look.skin)} {...stroke} strokeWidth={8} />
      <path d="M -94 -26 -75 -64 -59 -40 -66 8 -46 48 -17 76 45 88 22 101 -25 102 -73 74 -95 25 Z" fill={hex(look.skinShade)} />
      <path d="m-61-65 23-20 37-7 33 12-50-3-27 20Z" fill="#ffe3a3" opacity=".65" />
      <path d="m67 20 23-8-14 49-38 28-23-2 41-30Z" fill={darker(look.skinShade, 0.75)} />

      {look.facial === 'beard' && (
        <path d="M -98 6 Q -92 100 0 120 Q 92 100 98 6 Q 70 36 0 34 Q -70 36 -98 6 Z" fill={hair} {...stroke} strokeWidth={6} />
      )}

      <ellipse cx="0" cy="16" rx="15" ry="13" fill={hex(look.skinShade)} stroke={INK} strokeWidth="5" />
      {[-1, 1].map((s) => (
        <g key={s}>
          <ellipse cx={s * 37} cy="-12" rx="21" ry="10" fill="#fff5dc" stroke={INK} strokeWidth="4" />
          <circle cx={s * 37} cy="-11" r="7" fill="#2b1a14" />
          <circle cx={s * 37 - 2} cy="-13" r="2.2" fill="#fff" />
          <path d={`M ${s * 19} 12 l ${s * 17} 5 M ${s * 54} 33 l ${s * 12} 8`} stroke={darker(look.skinShade, .8)} strokeWidth="3" />
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
        <line key={s} x1={s * 10} y1="-34" x2={s * 62} y2="-46" stroke={look.hairStyle === 'bald' && look.facial === 'none' ? darker(look.skin, 0.6) : hair} strokeWidth="10" strokeLinecap="round" />
      ))}
    </svg>
  );
}
