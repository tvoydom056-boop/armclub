import type { UpgradeId } from '../core/upgrades';

const SKIN = '#eeb05b';
const SHADOW = '#b96937';
const DEEP = '#814427';
const LIGHT = '#ffdb8c';

function BentArm({ rear = false }: { rear?: boolean }) {
  return <g transform={rear ? 'translate(128 0) scale(-1 1)' : undefined}>
    <path d="M19 105c-8-5-10-14-7-25l12-41-3-12 9-13 20 3 7 15-7 13-10 1-4 29c7-10 14-14 24-12 10-15 27-16 40-5 13 10 15 30 8 40-5 9-17 13-33 13H36Z" fill={SKIN} />
    <path d="m25 45-9 39c-3 10 2 19 13 21l28 2c-21-7-29-17-26-32l7-30Z" fill={SHADOW} stroke="none" />
    <path d="M56 87c5 16 26 19 43 12 8-4 12-11 12-18-9 15-26 16-40 10l-9-14Z" fill={SHADOW} stroke="none" />
    <path d="M22 27 30 14l20 3-13 5-4 12 14 10-8 3-14-6Z" fill={SHADOW} stroke="none" />
    <path d="m28 52-7 30 7-4 8-27Zm39 20c9-11 19-9 27 0l-8-2-12 8Z" fill={LIGHT} stroke="none" />
    <path d="M19 105c-8-5-10-14-7-25l12-41-3-12 9-13 20 3 7 15-7 13-10 1-4 29c7-10 14-14 24-12 10-15 27-16 40-5 13 10 15 30 8 40-5 9-17 13-33 13H36Z" fill="none" />
    <path d="m31 27 5-5m3 12 7-7m0 13 6-8M41 84c5-6 11-7 18-5m2-14-1 11M70 92c9 5 17 4 24-1" strokeWidth="3" />
    <path d="m19 90 5-5m-3 12 5-5m7 8 5-4m62-23 4 5m-6-13 4 4" stroke={DEEP} strokeWidth="2" />
  </g>;
}

function Wrist({ grip = false }: { grip?: boolean }) {
  return <>
    <path d="m26 113 8-49-9-17 4-18 12-6 9 4 8-7 12 3 10-3 11 7 7 12-4 22-17 19 9 33Z" fill={SKIN} />
    <path d="m34 64-4 42 18 7 4-34 11-13-16-9-17-16-5 7Z" fill={SHADOW} stroke="none" />
    <path d="m77 80-14 3 5 29h18Zm16-45-7 22-15 9-10-1 12 15 21-22 4-20Z" fill={SHADOW} stroke="none" />
    <path d="m43 87-3 18 13-1 6-24Zm-8-50 8-5 9 4-3 10-6-6Z" fill={LIGHT} stroke="none" />
    <path d="m26 113 8-49-9-17 4-18 12-6 9 4 8-7 12 3 10-3 11 7 7 12-4 22-17 19 9 33Z" fill="none" />
    <path d="m51 27 4 17m15-20 3 17m14-10 2 11M35 55l12-9 22 11-1 10-11 6-14-9m14 9 4 7M36 87l3-7m-2 18 3-7" strokeWidth="3" />
    {grip && <><path d="m73 49 22 16-10 25-9-3 8-17-17-10Z" fill="#424044" /><path d="m76 48 8-10 13 10-5 9" stroke="#837473" strokeWidth="5" /><path d="m78 79 7 4m-10 2 8 4" stroke="#f4dcc0" strokeWidth="2" /></>}
  </>;
}

export function UpgradeArt({ id, className = '' }: { id: UpgradeId; className?: string }) {
  return <svg className={`upgrade-art ${className}`} viewBox="0 0 128 128" fill="none" stroke="#3b1d14" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
    {(id === 'biceps' || id === 'triceps') && <BentArm rear={id === 'triceps'} />}
    {(id === 'wrist' || id === 'grip' || id === 'pronation') && <g transform={id === 'pronation' ? 'translate(9 12) scale(.83)' : undefined}><Wrist grip={id === 'grip'} /></g>}
    {id === 'pronation' && <><path d="M103 80a45 45 0 0 0-9-57M96 9l-2 14-15-2" stroke="#608a86" strokeWidth="7" /><path d="M25 57a40 40 0 0 0 8 49m-1 14 1-14 15 1" stroke="#608a86" strokeWidth="5" /></>}
    {id === 'fingers' && <>
      <path d="m41 113-5-31-16-22c-5-8 1-16 8-11l12 15-7-42c-1-8 9-10 12-2l8 32-3-39c0-9 11-10 13-1l5 39 3-34c1-9 12-7 12 0l-1 36 8-24c3-8 13-4 10 4l-6 40-12 39Z" fill={SKIN} />
      <path d="m40 66-3 19 7 28h14l-5-32 10-14-13 6Zm40 47 13-40 6-35-8 30-13 9-8 36Z" fill={SHADOW} stroke="none" />
      <path d="m44 79 7 12 3-13 14-16-14 5Z" fill={LIGHT} stroke="none" />
      <path d="m50 74 17-10 12 6m-16 17 12-8m-25 19 5 7m17-12 5 8" strokeWidth="3" />
    </>}
    {id === 'shoulder' && <>
      <path d="M17 111 21 63c2-22 16-40 41-42l16 8c18 6 27 20 29 40l5 42Z" fill={SKIN} />
      <path d="m64 24-23 22-8 30 5 35H17l4-51c5-21 20-34 43-36Zm13 14 20 30-1 43h16l-7-48-13-18Z" fill={SHADOW} stroke="none" />
      <path d="m61 37-12 9-7 21 11-10 19-12Z" fill={LIGHT} stroke="none" />
      <path d="M39 81c16 7 32 4 46-12M46 103l3-17m-22 8 5-7m48 12 5-8" strokeWidth="3" />
    </>}
    {id === 'stamina' && <>
      <path d="M59 28 45 38C29 41 16 64 15 84c-1 18 12 28 28 22l14-10Z" fill="#cc6250" />
      <path d="m69 28 14 10c16 3 29 26 30 46 1 18-12 28-28 22L71 96Z" fill="#cc6250" />
      <path d="M20 73c-7 27 8 33 25 27l10-12 2 8-14 10c-23 8-33-10-23-33Zm80-18c18 28 13 59-15 51l-14-10 3-12 14 14c17 2 17-19 12-43Z" fill="#963d37" stroke="none" />
      <path d="M38 53 27 69l2 11 9-19Zm46 0 11 16-2 11-9-19Z" fill="#ef9b75" stroke="none" />
      <path d="M59 15v39l-20 18m30-57v39l20 18" stroke="#3b1d14" strokeWidth="11" />
      <path d="M64 15v41L41 77m23-21 23 21" stroke="#eac5a0" strokeWidth="5" />
      <path d="m39 75-10 5m15-9 2 16m41-12 10 5m-15-9-2 16" stroke="#f1c1a2" strokeWidth="3" />
    </>}
    {id === 'explosive' && <>
      <path d="M74 12 27 73h28l-8 44 54-66H70l14-39Z" fill="#edb54b" />
      <path d="m74 12-9 47h27l-45 58 54-66H70l14-39Z" fill="#c77832" stroke="none" />
      <path d="m65 30-26 36h11Z" fill="#ffe49a" stroke="none" />
      <path d="m15 32 9 7m76-12 10-5M14 94l10-3m81-1 9 6" stroke="#bb7843" strokeWidth="3" />
    </>}
  </svg>;
}
