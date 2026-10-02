import Phaser from 'phaser';
import { W, H } from './layout';
import { BootScene } from './scenes/BootScene';
import { MatchScene } from './scenes/MatchScene';

let game: Phaser.Game | null = null;

export function createGame(parent: HTMLElement): Phaser.Game {
  if (game) return game;
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: W,
    height: H,
    backgroundColor: '#2a1740',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true },
    scene: [BootScene, MatchScene],
  });
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      game?.destroy(true);
      game = null;
    });
  }
  return game;
}
