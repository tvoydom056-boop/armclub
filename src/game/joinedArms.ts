import Phaser from 'phaser';
import { joinedArmsKey, type ClaspPose } from './art';
import { clamp } from '../core/rng';
import { ARM_FIT, ARM_POSES, ARM_SCALE, joinedArmsCenter, mixPoint, motionFrames, paintedOffset } from './armMotion';
import type { Pt } from './layout';

/** Each frame contains the entire arm pair. Only uniform scale, rotation and translation. */
export class JoinedArms {
  readonly object: Phaser.GameObjects.Container;
  shoulder: Pt = { x: 467.5, y: 408.75 };
  /** Поворот и равномерный масштаб показанной позы — для общей манжеты плеча. */
  rotation = 0;
  scale = ARM_SCALE;
  private image: Phaser.GameObjects.Image;
  private angle = 0;
  private frame = 4;
  /** Сдвиг всей связки «рука + торс» после смены кадра; плавно гаснет, чтобы соперник не прыгал. */
  private slip: Pt = { x: 0, y: 0 };

  constructor(scene: Phaser.Scene, id: string) {
    const key = joinedArmsKey(id);
    const texture = scene.textures.get(key);
    const source = texture.getSourceImage();
    for (let i = 0; i < 9; i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const trimX = i >= 7 ? 10 : 0;
      const trimY = row > 0 ? 7 : 0;
      const x = Math.round(col * source.width / 3) + trimX;
      const y = Math.round(row * source.height / 3) + trimY;
      if (!texture.has(`motion_${i}`)) texture.add(`motion_${i}`, 0, x, y,
        Math.round((col + 1) * source.width / 3) - x, Math.round((row + 1) * source.height / 3) - y);
    }
    this.image = scene.add.image(0, 0, key, 'motion_4').setOrigin(0).setScale(ARM_SCALE);
    this.object = scene.add.container(0, 0, [this.image]).setDepth(31);
    this.update('neutral', 0, { x: 0, y: 0 }, 1);
  }

  update(pose: ClaspPose, p: number, shake: Pt, dt: number): Pt {
    const targetAngle = pose === 'hook' ? -0.025 : pose === 'toproll' ? 0.025 : pose === 'press' ? 0.045 : 0;
    this.angle += (targetAngle - this.angle) * (1 - Math.exp(-dt * 12));
    const { from, to, blend } = motionFrames(p);
    const C = joinedArmsCenter(p);
    C.x += shake.x;
    C.y += shake.y;
    // между позами плечо плавно едет; кадр показан один, поэтому чуть доворачиваем его к этому плечу,
    // но не больше ARM_FIT — остаток забирает торс. Размер руки постоянный: масштаб только выравнивает
    // кадры, нарисованные крупнее или мельче кадра 4
    const pose0 = ARM_POSES[from];
    const pose1 = ARM_POSES[to];
    const want = mixPoint(paintedOffset(pose0.shoulder, pose0.grip, 0), paintedOffset(pose1.shoulder, pose1.grip, 0), blend);
    const frame = blend < 0.5 ? from : to;
    const own = paintedOffset(ARM_POSES[frame].shoulder, ARM_POSES[frame].grip, 0);
    const scale = 1 / ARM_POSES[frame].size;
    const turn = Math.atan2(own.x * want.y - own.y * want.x, own.x * want.x + own.y * want.y);
    const angle = this.angle + clamp(turn, -ARM_FIT.angle, ARM_FIT.angle);
    this.rotation = angle;
    this.scale = ARM_SCALE * scale;
    // торс крепится к плечу именно показанного кадра — рукав не отрывается от тела
    const shoulder = paintedOffset(ARM_POSES[frame].shoulder, ARM_POSES[frame].grip, angle);
    const raw = { x: C.x + shoulder.x * scale, y: C.y + shoulder.y * scale };
    // при смене кадра плечо перескакивает: двигаем связку целиком и плавно доводим на место
    if (frame !== this.frame) {
      this.slip = { x: this.shoulder.x - raw.x, y: this.shoulder.y - raw.y };
      this.frame = frame;
    }
    const fade = Math.exp(-dt * 14);
    this.slip.x *= fade;
    this.slip.y *= fade;
    C.x += this.slip.x;
    C.y += this.slip.y;
    this.shoulder = { x: raw.x + this.slip.x, y: raw.y + this.slip.y };
    const corner = { x: frame >= 7 ? 10 : 0, y: frame >= 3 ? 7 : 0 };
    const at = paintedOffset(corner, ARM_POSES[frame].grip, angle);
    this.image.setFrame(`motion_${frame}`).setScale(ARM_SCALE * scale)
      .setRotation(angle).setPosition(C.x + at.x * scale, C.y + at.y * scale);
    // A single visible pose prevents translucent extra fingers and doubled wristbands.
    return C;
  }
}
