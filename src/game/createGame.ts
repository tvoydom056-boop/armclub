import Phaser from 'phaser';
import { W, H } from './layout';
import { BootScene } from './scenes/BootScene';
import { MatchScene } from './scenes/MatchScene';
import { observeStageSize } from './observeStageSize';

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
  const current = game;
  const stopObserving = observeStageSize(parent, () => {
    if (!current.isBooted) return;
    current.scale.getParentBounds();
    current.scale.refresh();
  });
  current.events.once(Phaser.Core.Events.DESTROY, stopObserving);
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      game?.destroy(true);
      game = null;
    });
  }
  return game;
}

/**
 * Только dev, лист поз ?sheet=<id>: прогнать сцену settle шагами по 50 мс (доводка наклона, смена лица)
 * и снять ближайший отрисованный кадр 1280×720 как data URL.
 */
export function snapshotScene(settle: number): Promise<string> {
  const current = game;
  if (!current) return Promise.reject(new Error('Игра не создана'));
  const match = current.scene.getScene('Match') as MatchScene;
  for (let i = 0; i < settle; i++) match.update(0, 50);
  // JPEG: PNG кадра весит ~2.7 МБ, а на листе их два десятка
  return new Promise((done) => current.renderer.snapshot((image) => done((image as HTMLImageElement).src), 'image/jpeg', 0.9));
}
