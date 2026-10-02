import Phaser from 'phaser';
import { joinedArmsKey, type ClaspPose } from './art';
import { ARM_POSES, ARM_SCALE, ARM_SHOULDER, joinedArmsCenter, mixPoint, motionFrames, paintedOffset } from './armMotion';
import type { Pt } from './layout';

/** Each frame contains the entire arm pair. Only uniform scale, rotation and translation. */
export class JoinedArms {
  readonly object: Phaser.GameObjects.Container;
  shoulder: Pt = { x: 467.5, y: 408.75 };
  private image: Phaser.GameObjects.Image;
  private angle = 0;

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
    const a = paintedOffset(ARM_SHOULDER, ARM_POSES[from].grip, this.angle);
    const b = paintedOffset(ARM_SHOULDER, ARM_POSES[to].grip, this.angle);
    const offset = mixPoint(a, b, blend);
    this.shoulder = { x: Math.min(620, C.x + offset.x), y: Math.min(445, C.y + offset.y) };
    offset.x = this.shoulder.x - C.x;
    offset.y = this.shoulder.y - C.y;
    const frame = blend < 0.5 ? from : to;
    const sourceShoulder = paintedOffset(ARM_SHOULDER, ARM_POSES[frame].grip, 0);
    const scale = Math.hypot(offset.x, offset.y) / Math.hypot(sourceShoulder.x, sourceShoulder.y);
    const angle = Math.atan2(offset.y, offset.x) - Math.atan2(sourceShoulder.y, sourceShoulder.x);
    const corner = { x: frame >= 7 ? 10 : 0, y: frame >= 3 ? 7 : 0 };
    const at = paintedOffset(corner, ARM_POSES[frame].grip, angle);
    this.image.setFrame(`motion_${frame}`).setScale(ARM_SCALE * scale)
      .setRotation(angle).setPosition(C.x + at.x * scale, C.y + at.y * scale);
    // A single visible pose prevents translucent extra fingers and doubled wristbands.
    return C;
  }
}
