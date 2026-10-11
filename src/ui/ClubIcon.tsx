import type { UpgradeCategory } from '../core/upgrades';

export type IconName = UpgradeCategory | 'fight' | 'lock' | 'arrow' | 'check' | 'sound' | 'muted' | 'bag' | 'stats';

/** Small interface symbols share the outlines and flat fills of the game art. */
export function ClubIcon({ name, className = '' }: { name: IconName; className?: string }) {
  return (
    <svg className={`club-icon ${className}`} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {name === 'fight' && <><path d="m7 4 21 21-3 3L4 7V4h3Z" fill="currentColor" /><path d="m25 4-9 9M12 20l-8 8m0-4 4 4m16-24h4v4M20 12l4 4" /></>}
      {name === 'hook' && <><path d="M18 5v15a7 7 0 0 1-14 0v-5l5 4" /><circle cx="18" cy="5" r="3" /><path d="m4 15 7 2" /></>}
      {name === 'toproll' && <><path d="M25 11a11 11 0 1 0 1 10M25 4v7h-7" /><path d="M21 16a5 5 0 1 1-5-5" /></>}
      {name === 'press' && <><path d="m13 14 13 13-3 3-13-13" fill="currentColor" /><path d="m4 12 9-9 7 7-9 9Z" fill="currentColor" /></>}
      {name === 'body' && <><path d="M8 16h16M8 8v16M4 11v10M24 8v16M28 11v10" strokeWidth="4" /></>}
      {name === 'bag' && <><path d="M6 11h20l-2 17H8Z" fill="currentColor" /><path d="M11 14V9a5 5 0 0 1 10 0v5" /></>}
      {name === 'stats' && <><path d="M4 28h24" /><path d="M7 28V18h5v10M14 28V9h5v19M21 28V14h5v14" fill="currentColor" /></>}
      {name === 'lock' && <><rect x="7" y="14" width="18" height="14" rx="2" fill="currentColor" /><path d="M11 14V9a5 5 0 0 1 10 0v5" /><path d="M16 20v3" stroke="var(--hub-ink, #241719)" /></>}
      {name === 'arrow' && <path d="M5 16h22m-8-8 8 8-8 8" />}
      {name === 'check' && <path d="m6 16 7 7L27 9" />}
      {(name === 'sound' || name === 'muted') && <><path d="M5 12h5l7-6v20l-7-6H5Z" fill="currentColor" />{name === 'sound' ? <><path d="M22 11a8 8 0 0 1 0 10M26 7a13 13 0 0 1 0 18" /></> : <path d="m23 12 6 8m0-8-6 8" />}</>}
    </svg>
  );
}
