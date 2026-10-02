import Phaser from 'phaser';
import { queueArt } from '../art';
import { barSvg, svgToImage, tableSvg, vignetteSvg } from '../staticArt';

/** Готовит текстуры из SVG и шрифты, затем запускает сцену матча. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    // нарисованные спрайты; чего нет в public/art, то сцена нарисует кодом
    queueArt(this.load);
  }

  create(): void {
    void this.prepare();
  }

  private async prepare(): Promise<void> {
    try {
      await Promise.all([document.fonts.load('48px "Russo One"'), document.fonts.load('900 24px "Rubik"')]);
    } catch {
      // шрифт не критичен: упадём на Impact
    }
    const [bg, table, vignette] = await Promise.all([svgToImage(barSvg()), svgToImage(tableSvg()), svgToImage(vignetteSvg())]);
    this.textures.addImage('bg', bg);
    this.textures.addImage('table', table);
    this.textures.addImage('vignette', vignette);
    this.scene.start('Match');
  }
}
