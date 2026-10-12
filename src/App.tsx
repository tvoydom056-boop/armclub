import { lazy, Suspense, useEffect, useRef, type PointerEvent } from 'react';
import { initAudio } from './audio/engine';
import { sfx } from './audio/sfx';
import { bus } from './game/bus';
import { createGame } from './game/createGame';
import { useGame } from './store/game';
import { useHud } from './store/hud';
import { useSettings } from './store/settings';
import { Hub } from './ui/Hub';
import { MatchHud } from './ui/MatchHud';
import { ResultModal } from './ui/ResultModal';
import { SparringModal } from './ui/SparringModal';

/** Редактор рига персонажа: только в dev, по адресу ?rig=<id>. */
const rigId = import.meta.env.DEV ? new URLSearchParams(location.search).get('rig') : null;
const RigEditor = import.meta.env.DEV ? lazy(() => import('./ui/RigEditor')) : null;
/** Лист поз персонажа: только в dev, по адресу ?sheet=<id>. */
const sheetId = import.meta.env.DEV ? new URLSearchParams(location.search).get('sheet') : null;
const RigSheet = import.meta.env.DEV ? lazy(() => import('./ui/RigSheet')) : null;

export default function App() {
  const screen = useGame((s) => s.screen);
  const result = useGame((s) => s.result);
  const sparringResult = useGame((s) => s.sparringResult);
  const phaserRoot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const offReady = bus.on('game:ready', () => useHud.setState({ ready: true }));
    const offEnd = bus.on('match:end', (r) => {
      const game = useGame.getState();
      if (game.screen !== 'match') return;
      if (game.sparring) game.finishSparring(r);
      else game.finishMatch(r);
    });
    if (phaserRoot.current) createGame(phaserRoot.current);
    const offAudio = initAudio();
    const onKey = (ev: KeyboardEvent) => {
      if (ev.code === 'KeyM' && !ev.repeat) useSettings.getState().toggleMute();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      offReady();
      offEnd();
      offAudio();
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  // тихий «тик» на любой кнопке; кнопки со своим звуком помечены data-sfx="none"
  const tick = (e: PointerEvent) => {
    const b = (e.target as HTMLElement).closest('button');
    if (b && !b.disabled && b.dataset.sfx !== 'none') sfx.ui.click();
  };

  return (
    <div className="stage" onPointerDownCapture={tick}>
      <div ref={phaserRoot} className="phaser-root" />
      {screen === 'match' && !rigId && !sheetId && <MatchHud />}
      {screen === 'hub' && <Hub />}
      {screen === 'match' && result && <ResultModal />}
      {screen === 'match' && sparringResult && <SparringModal />}
      {rigId && RigEditor && <Suspense fallback={null}><RigEditor id={rigId} root={phaserRoot} /></Suspense>}
      {sheetId && RigSheet && <Suspense fallback={null}><RigSheet id={sheetId} /></Suspense>}
    </div>
  );
}
