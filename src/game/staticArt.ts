import { mulberry32 } from '../core/rng';
import { H, LAYOUT, W } from './layout';

const OUT = '#3b1d14';

/** SVG-строка → картинку для текстуры Phaser. Ассеты можно заменить файлами с теми же ключами. */
export function svgToImage(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('SVG не удалось разобрать'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}

const svgOpen = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" stroke-linejoin="round" stroke-linecap="round">`;

function crowd(): string {
  const rnd = mulberry32(77);
  const skins = ['#f0b48a', '#d99a6c', '#ffd2a8', '#b97a4c', '#f3c6a2'];
  const shirts = ['#2b1b52', '#3a2368', '#1f3a6e', '#4a1f5e', '#5a2a70', '#233a5e'];
  const hairs = ['#2a1a12', '#5a3b26', '#8a8f99', '#c9a227', '#1a1a1a'];
  const spots: [number, number, number][] = [];
  for (let i = 0; i < 9; i++) spots.push([30 + i * 40 + rnd() * 20, 262 + rnd() * 70, 0.9 + rnd() * 0.35]);
  for (let i = 0; i < 9; i++) spots.push([930 + i * 40 + rnd() * 20, 262 + rnd() * 70, 0.9 + rnd() * 0.35]);
  for (let i = 0; i < 3; i++) spots.push([330 + i * 38, 232 + rnd() * 20, 0.8]);
  for (let i = 0; i < 3; i++) spots.push([880 + i * 38, 232 + rnd() * 20, 0.8]);
  spots.sort((a, b) => a[1] - b[1]);
  return spots
    .map(([x, y, s]) => {
      const skin = skins[Math.floor(rnd() * skins.length)];
      const shirt = shirts[Math.floor(rnd() * shirts.length)];
      const hair = hairs[Math.floor(rnd() * hairs.length)];
      const cheer = rnd() > 0.55;
      const r = 30 * s;
      const fist = cheer
        ? `<path d="M ${x - 34 * s} ${y + 40 * s} Q ${x - 56 * s} ${y - 6 * s} ${x - 40 * s} ${y - 40 * s}" stroke="${OUT}" stroke-width="${22 * s}" fill="none"/>
           <path d="M ${x - 34 * s} ${y + 40 * s} Q ${x - 56 * s} ${y - 6 * s} ${x - 40 * s} ${y - 40 * s}" stroke="${skin}" stroke-width="${12 * s}" fill="none"/>`
        : '';
      return `<g stroke="${OUT}" stroke-width="5">
        <path d="M ${x - 52 * s} ${y + 120 * s} Q ${x - 50 * s} ${y + 30 * s} ${x} ${y + 28 * s} Q ${x + 50 * s} ${y + 30 * s} ${x + 52 * s} ${y + 120 * s} Z" fill="${shirt}"/>
        ${fist}
        <circle cx="${x}" cy="${y}" r="${r}" fill="${skin}"/>
        <path d="M ${x - r} ${y - 4 * s} Q ${x} ${y - r * 1.5} ${x + r} ${y - 4 * s} Q ${x} ${y - r * 0.55} ${x - r} ${y - 4 * s} Z" fill="${hair}"/>
        <circle cx="${x - 10 * s}" cy="${y + 4 * s}" r="${3.4 * s}" fill="${OUT}" stroke="none"/>
        <circle cx="${x + 10 * s}" cy="${y + 4 * s}" r="${3.4 * s}" fill="${OUT}" stroke="none"/>
        <path d="M ${x - 9 * s} ${y + 16 * s} Q ${x} ${y + (cheer ? 28 : 20) * s} ${x + 9 * s} ${y + 16 * s}" fill="${cheer ? '#7a1f2a' : 'none'}" stroke-width="${3.4 * s}"/>
      </g>`;
    })
    .join('\n');
}

function lamp(x: number): string {
  return `<g>
    <polygon points="${x - 36},96 ${x + 36},96 ${x + 330},720 ${x - 330},720" fill="url(#cone)"/>
    <line x1="${x}" y1="0" x2="${x}" y2="58" stroke="${OUT}" stroke-width="6"/>
    <path d="M ${x - 52} 100 Q ${x - 48} 56 ${x} 52 Q ${x + 48} 56 ${x + 52} 100 Z" fill="#ffb21f" stroke="${OUT}" stroke-width="6"/>
    <path d="M ${x - 34} 86 Q ${x - 30} 66 ${x - 8} 62" fill="none" stroke="#fff2b0" stroke-width="7"/>
    <ellipse cx="${x}" cy="102" rx="30" ry="9" fill="#fff6c9" stroke="${OUT}" stroke-width="5"/>
  </g>`;
}

/** Фон: бар, толпа, лампы. Стол и соперник рисуются поверх. */
export function barSvg(): string {
  const bricks: string[] = [];
  for (let row = 0; row < 8; row++) {
    const y = 20 + row * 46;
    for (let col = -1; col < 12; col++) {
      const x = col * 120 + (row % 2) * 60;
      bricks.push(`<rect x="${x}" y="${y}" width="116" height="42" rx="4"/>`);
    }
  }
  return `${svgOpen}
  <defs>
    <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4a2a8a"/><stop offset="0.55" stop-color="#7a2f94"/><stop offset="1" stop-color="#3a1b5e"/>
    </linearGradient>
    <linearGradient id="cone" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff0a0" stop-opacity="0.5"/><stop offset="1" stop-color="#fff0a0" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.42" r="0.55">
      <stop offset="0" stop-color="#ffe9a8" stop-opacity="0.4"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#wall)"/>
  <g fill="#ffffff" fill-opacity="0.07" stroke="#1a0b33" stroke-opacity="0.35" stroke-width="3">${bricks.join('')}</g>
  ${crowd()}
  <g>
    <rect x="86" y="40" width="226" height="86" rx="20" fill="#2a0d3d" stroke="${OUT}" stroke-width="7"/>
    <rect x="98" y="52" width="202" height="62" rx="14" fill="none" stroke="#ff4fa3" stroke-width="5"/>
    <text x="199" y="100" font-family="Impact, 'Arial Black', sans-serif" font-size="46" text-anchor="middle" fill="#ff8ccb" stroke="#ff2f8f" stroke-width="2">БАР «ЯМА»</text>
  </g>
  <g>
    <rect x="978" y="46" width="226" height="80" rx="20" fill="#0d2a3d" stroke="${OUT}" stroke-width="7"/>
    <rect x="990" y="58" width="202" height="56" rx="14" fill="none" stroke="#3de0ff" stroke-width="5"/>
    <text x="1091" y="99" font-family="Impact, 'Arial Black', sans-serif" font-size="40" text-anchor="middle" fill="#a8f2ff" stroke="#17c4f0" stroke-width="2">АРМРЕСТЛИНГ</text>
  </g>
  ${lamp(330)}${lamp(950)}
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <g>
    <line x1="0" y1="386" x2="${W}" y2="386" stroke="${OUT}" stroke-width="16"/>
    <line x1="0" y1="386" x2="${W}" y2="386" stroke="#e8344a" stroke-width="9"/>
    <line x1="0" y1="383" x2="${W}" y2="383" stroke="#ff8d9b" stroke-width="3"/>
  </g>
  </svg>`;
}

function plank(i: number): string {
  const fx = 640 + i * 66;
  const nx = 640 + i * 215;
  return `<line x1="${fx}" y1="408" x2="${nx}" y2="${H}"/>`;
}

/** Стол в перспективе и поручни. Видим сверху-сбоку. */
export function tableSvg(): string {
  const { oppPeg, ourPeg } = LAYOUT;
  const planks = Array.from({ length: 13 }, (_, k) => plank(k - 6)).join('');
  return `${svgOpen}
  <defs>
    <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e9ac5c"/><stop offset="1" stop-color="#b56a2a"/>
    </linearGradient>
    <radialGradient id="sheen" cx="0.5" cy="0.35" r="0.6">
      <stop offset="0" stop-color="#fff2c8" stop-opacity="0.5"/><stop offset="1" stop-color="#fff2c8" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="chrome" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#8e9aa8"/><stop offset="0.45" stop-color="#f4f8fc"/><stop offset="1" stop-color="#7d8896"/>
    </linearGradient>
    <clipPath id="top"><polygon points="250,395 1030,395 1430,${H} -150,${H}"/></clipPath>
  </defs>
  <polygon points="250,395 1030,395 1430,${H} -150,${H}" fill="url(#wood)"/>
  <g clip-path="url(#top)">
    <g stroke="#7a4116" stroke-opacity="0.35" stroke-width="3">${planks}</g>
    <rect width="${W}" height="${H}" fill="url(#sheen)"/>
  </g>
  <polygon points="250,395 1030,395 1034,410 246,410" fill="#f6c98a" stroke="${OUT}" stroke-width="5"/>
  <polygon points="250,395 1030,395 1430,${H} -150,${H}" fill="none" stroke="${OUT}" stroke-width="7"/>

  <!-- поручни для свободной руки -->
  <g>
    <ellipse cx="${oppPeg.x}" cy="${oppPeg.y + 40}" rx="22" ry="8" fill="#000" opacity="0.22"/>
    <rect x="${oppPeg.x - 8}" y="${oppPeg.y - 6}" width="16" height="48" rx="8" fill="url(#chrome)" stroke="${OUT}" stroke-width="5"/>
    <ellipse cx="${ourPeg.x}" cy="${ourPeg.y + 70}" rx="40" ry="14" fill="#000" opacity="0.22"/>
    <rect x="${ourPeg.x - 16}" y="${ourPeg.y - 50}" width="32" height="118" rx="16" fill="url(#chrome)" stroke="${OUT}" stroke-width="7"/>
  </g>
  </svg>`;
}

/** Виньетка поверх сцены — собирает взгляд к центру. */
export function vignetteSvg(): string {
  return `${svgOpen}
  <defs>
    <radialGradient id="v" cx="0.5" cy="0.5" r="0.75">
      <stop offset="0.55" stop-color="#12041f" stop-opacity="0"/><stop offset="1" stop-color="#12041f" stop-opacity="0.55"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#v)"/>
  </svg>`;
}
