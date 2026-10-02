import { useEffect, useRef, type PointerEvent } from 'react';
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

export default function App() {
  const screen = useGame((s) => s.screen);
  const result = useGame((s) => s.result);
  const phaserRoot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const offReady = bus.on('game:ready', () => useHud.setState({ ready: true }));
    const offEnd = bus.on('match:end', (r) => {
      if (useGame.getState().screen === 'match') useGame.getState().finishMatch(r);
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
      {screen === 'match' && <MatchHud />}
      {screen === 'hub' && <Hub />}
      {screen === 'match' && result && <ResultModal />}
    </div>
  );
}
