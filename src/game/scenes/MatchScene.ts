import Phaser from 'phaser';
import {
  TUNING,
  createMatch,
  oppForce,
  stepMatch,
  type MatchConfig,
  type MatchEvent,
  type MatchState,
} from '../../core/match';
import { sfx } from '../../audio/sfx';
import { opponentById } from '../../core/opponents';
import { mulberry32, type Rng } from '../../core/rng';
import { TECH_INFO, matchup, type Technique } from '../../core/techniques';
import { useHud } from '../../store/hud';
import {
  OPP_ATTACH,
  OUR_ATTACH,
  drawClasp,
  drawOppArms,
  drawPlayerArms,
  drawPressureArrow,
  easePose,
  neutralPose,
  targetPose,
} from '../armsArt';
import { hasOppArt, type HeadKey } from '../art';
import { ArtStage } from '../artStage';
import { joinedArmsCenter } from '../armMotion';
import { bus, type RigPreview } from '../bus';
import { OUTLINE, arrowPts, clamp01, poly, polyline } from '../draw';
import { H, LAYOUT, W, claspPoint, claspRotation, claspScale, lerp, type Pt } from '../layout';
import { calmFace, drawHead, drawTorso, faceTarget, type Face, type FaceCtx } from '../opponentArt';

type G = Phaser.GameObjects.Graphics;

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: number;
  w: number;
}

interface Ring {
  x: number;
  y: number;
  r: number;
  life: number;
  max: number;
  color: number;
}

const FONT = '"Russo One", Impact, "Arial Black", sans-serif';
const cssNum = (css: string) => parseInt(css.slice(1), 16);
const techColor = (t: Technique) => cssNum(TECH_INFO[t].color);

const KEY_TECH: Record<string, Technique> = {
  Digit1: 'hook', Numpad1: 'hook', KeyQ: 'hook',
  Digit2: 'toproll', Numpad2: 'toproll', KeyW: 'toproll',
  Digit3: 'press', Numpad3: 'press', KeyE: 'press',
};

export class MatchScene extends Phaser.Scene {
  private bgImg!: Phaser.GameObjects.Image;
  private tableImg!: Phaser.GameObjects.Image;
  /** Нарисованная сцена; есть только для бойцов со спрайтами, остальные рисуются кодом. */
  private art: ArtStage | null = null;
  private artFor = '';
  /** Редактор рига (?rig=<id> в dev): бой стоит, позу и мимику задаёт редактор. */
  private preview: RigPreview | null = null;
  private gOpp!: G;
  private gShadow!: G;
  private gOppArm!: G;
  private gOurArm!: G;
  private gClasp!: G;
  private gFx!: G;

  private cfg: MatchConfig | null = null;
  private state: MatchState | null = null;
  private rng: Rng = mulberry32(1);
  private pendingClicks = 0;
  private pendingTech: Technique | null = null;

  private clock = 0;
  private hitStop = 0;
  private endTimer = 0;
  private endInfo: { result: 'won' | 'lost'; reason: 'pin' | 'foul' | 'time' } | null = null;
  private hudTimer = 0;
  private beatTimer = 0;
  private kick = 0;
  private shownPos = 0;
  private pose = neutralPose();
  private face: Face = calmFace();
  private sparks: Spark[] = [];
  private rings: Ring[] = [];
  private unsubs: Array<() => void> = [];

  constructor() {
    super('Match');
  }

  create(): void {
    this.bgImg = this.add.image(0, 0, 'bg').setOrigin(0, 0).setDepth(0);
    this.gOpp = this.add.graphics().setDepth(10);
    this.tableImg = this.add.image(0, 0, 'table').setOrigin(0, 0).setDepth(20);
    this.gShadow = this.add.graphics().setDepth(21);
    this.gOppArm = this.add.graphics().setDepth(30);
    this.gOurArm = this.add.graphics().setDepth(40);
    this.gClasp = this.add.graphics().setDepth(45);
    this.gFx = this.add.graphics().setDepth(60);
    this.add.image(0, 0, 'vignette').setOrigin(0, 0).setDepth(70);

    this.input.on('pointerdown', () => {
      this.pendingClicks += 1;
    });
    const kb = this.input.keyboard;
    kb?.on('keydown', (ev: KeyboardEvent) => {
      if (ev.code === 'Space') {
        if (!ev.repeat) this.pendingClicks += 1;
        return;
      }
      const t = KEY_TECH[ev.code];
      if (t && !ev.repeat) this.pendingTech = t;
    });

    this.unsubs.push(
      bus.on('match:start', ({ oppId, stats, version }) => this.startMatch({ opp: opponentById(oppId, version), stats })),
      bus.on('match:abort', () => this.abortMatch()),
      bus.on('input:tech', (t) => {
        this.pendingTech = t;
      }),
      bus.on('input:click', ({ n }) => {
        this.pendingClicks += n;
      }),
      bus.on('rig:preview', (pv) => {
        if (!this.preview) this.children.list.filter((c) => c instanceof Phaser.GameObjects.Text).forEach((c) => c.destroy());
        this.preview = pv;
        this.useArt(pv.id);
      }),
      bus.on('rig:set', (rig) => this.art?.setRig(rig)),
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsubs.forEach((u) => u()));

    if (import.meta.env.DEV) (window as unknown as { __arm: unknown }).__arm = this;
    // подписки готовы — теперь интерфейс может запускать бои
    bus.emit('game:ready', { ok: true });
  }

  private startMatch(cfg: MatchConfig): void {
    this.cfg = cfg;
    this.rng = mulberry32((Date.now() ^ (Math.random() * 0xffffff)) >>> 0);
    this.state = createMatch(cfg, this.rng);
    this.pendingClicks = 0;
    this.pendingTech = null;
    this.hitStop = 0;
    this.endTimer = 0;
    this.endInfo = null;
    this.kick = 0;
    this.shownPos = 0;
    this.pose = neutralPose();
    this.face = calmFace();
    this.sparks = [];
    this.rings = [];
    this.hudTimer = 0;
    this.beatTimer = 0;
    this.useArt(cfg.opp.id);
    useHud.setState({ active: true, oppName: cfg.opp.name, oppNick: cfg.opp.nick });
    this.banner('ПРИГОТОВИЛИСЬ…', '#ffe14a', 60, 900, 540);
    // пробел глушим только на время боя: Phaser ловит его на всём окне, и в меню он не нажимал кнопки
    this.input.keyboard?.addCapture('SPACE');
    sfx.ready();
  }

  /** Включает нарисованную сцену для бойца со спрайтами, иначе — рисование кодом. */
  private useArt(oppId: string): void {
    const on = hasOppArt(this, oppId);
    if (on && this.artFor !== oppId) {
      this.art?.destroy();
      this.art = new ArtStage(this, oppId);
      this.artFor = oppId;
    }
    if (!on && this.art) {
      this.art.destroy();
      this.art = null;
      this.artFor = '';
    }
    for (const o of [this.bgImg, this.tableImg]) o.setVisible(!on);
    // в нарисованной сцене тень лежит на столе под торсом соперника
    this.gShadow.setDepth(on ? 20.6 : 21);
    for (const g of [this.gOpp, this.gOppArm, this.gOurArm, this.gClasp]) g.setVisible(!on);
  }

  private pickHead(c: FaceCtx): HeadKey {
    if (c.phase === 'lost') return 'win';
    if (c.phase === 'won') return 'lose';
    if (c.phase === 'ready') return 'calm';
    if (c.surgeWarn || c.telegraphing) return 'telegraph';
    if (c.resting || c.stamina < 0.2) return 'tired';
    if (c.surging || c.effort > 0.5 || c.position > 0.45) return 'strain';
    return 'calm';
  }

  private abortMatch(): void {
    this.input.keyboard?.removeCapture('SPACE');
    this.cfg = null;
    this.state = null;
    this.endInfo = null;
    this.endTimer = 0;
    useHud.setState({ active: false });
    this.gFx.clear();
    this.children.list.filter((c): c is Phaser.GameObjects.Text => c instanceof Phaser.GameObjects.Text).forEach((c) => c.destroy());
  }

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(0.05, deltaMs / 1000);
    if (!this.cfg || !this.state) return;
    this.clock += dt;

    const pv = this.preview;
    if (pv && this.art) {
      const tech = pv.tech === 'neutral' ? 'hook' : pv.tech;
      const still = { x: 0, y: 0 };
      this.art.update({ dt, p: pv.p, ourTech: tech, oppTech: tech, fighting: pv.tech !== 'neutral', head: pv.head, breathe: 0, lower: 0, ourEffort: 0, shakeOur: still, shakeOpp: still });
      this.gShadow.clear();
      bus.emit('rig:points', this.art.points);
      return;
    }

    if (this.hitStop > 0) {
      this.hitStop -= dt;
    } else {
      const clicks = this.pendingClicks;
      const tech = this.pendingTech;
      this.pendingClicks = 0;
      this.pendingTech = null;
      const events = stepMatch(this.state, this.cfg, { clicks, tech }, dt, this.rng);
      for (const e of events) this.onEvent(e);
    }

    if (this.endTimer > 0) {
      this.endTimer -= dt;
      if (this.endTimer <= 0 && this.endInfo && this.cfg && this.state) {
        useHud.setState({ active: false });
        this.input.keyboard?.removeCapture('SPACE');
        bus.emit('match:end', {
          oppId: this.cfg.opp.id,
          result: this.endInfo.result,
          reason: this.endInfo.reason,
          time: this.state.time,
          clicks: this.state.clicks,
        });
        this.endInfo = null;
      }
    }

    this.renderFrame(dt);
    this.hudTimer -= dt;
    if (this.hudTimer <= 0) {
      this.hudTimer = 0.08;
      this.syncHud();
    }
  }

  /* ---------- события ---------- */

  private onEvent(e: MatchEvent): void {
    const c = this.clasp();
    switch (e.type) {
      case 'falseStart':
        this.banner(e.warnings >= TUNING.maxWarnings ? 'ФОЛ!' : 'ФАЛЬСТАРТ!', '#ff5a5a', 72, 800, 540);
        this.cameras.main.shake(160, 0.005);
        sfx.falseStart(e.warnings >= TUNING.maxWarnings);
        break;
      case 'go':
        this.banner('ГО!', '#7bff6a', 150, 420);
        this.cameras.main.flash(120, 255, 255, 255);
        this.ring(c, 0xffffff);
        sfx.go();
        break;
      case 'click':
        this.kick = Math.min(5, this.kick + 1.4);
        this.burst(c, 3, techColor(this.state!.tech));
        sfx.click(this.state!.tech, e.power);
        break;
      case 'startBonus':
        this.floatText('РЫВОК!', c.x - 40, c.y - 120, '#ffe14a', 54);
        this.ring(c, 0xffe14a);
        sfx.startBonus();
        break;
      case 'playerSwitch':
        this.floatText(TECH_INFO[e.tech].name.toUpperCase(), 980, 560, TECH_INFO[e.tech].color, 46);
        this.ring(c, techColor(e.tech));
        sfx.playerSwitch(e.tech);
        break;
      case 'oppTelegraph':
        sfx.oppTelegraph();
        break;
      case 'oppSwitch':
        this.ring(c, techColor(e.tech));
        this.floatText(TECH_INFO[e.tech].name.toUpperCase(), 520, 300, TECH_INFO[e.tech].color, 38);
        sfx.oppSwitch();
        break;
      case 'surgeWarn':
        this.floatText('РЫВОК!', 640, 60, '#ff5a5a', 60);
        sfx.surgeWarn();
        break;
      case 'surge':
        this.cameras.main.shake(260, 0.008);
        this.ring(c, 0xff5a5a);
        this.burst(c, 14, 0xff5a5a);
        sfx.surge();
        break;
      case 'oppRest':
        this.floatText('ОН ВЫДОХСЯ!', 640, 320, '#8fdcff', 52);
        sfx.oppRest();
        break;
      case 'end':
        if (e.reason === 'pin') sfx.slam();
        else if (e.reason === 'time') sfx.falseStart(false);
        if (e.result === 'won') sfx.win();
        else sfx.lose();
        this.hitStop = 0.4;
        this.endTimer = 1.5;
        this.endInfo = { result: e.result, reason: e.reason };
        this.cameras.main.shake(420, 0.012);
        this.cameras.main.flash(180, 255, 255, 255);
        this.burst(c, 28, e.result === 'won' ? 0xffe14a : 0xff5a5a);
        this.ring(c, e.result === 'won' ? 0xffe14a : 0xff5a5a);
        this.banner(
          e.result === 'won' ? 'ПОБЕДА!' : e.reason === 'foul' ? 'ФОЛ!' : 'ПОРАЖЕНИЕ',
          e.result === 'won' ? '#7bff6a' : '#ff5a5a',
          130,
          1300,
        );
        break;
      default:
        break;
    }
  }

  /* ---------- отрисовка ---------- */

  private clasp(): Pt {
    if (this.art) return joinedArmsCenter(this.shownPos);
    const p = claspPoint(this.shownPos);
    return p;
  }

  private renderFrame(dt: number): void {
    const s = this.state!;
    const cfg = this.cfg!;
    const look = cfg.opp.look;
    const fight = s.phase === 'fight';

    this.shownPos += (s.position - this.shownPos) * (1 - Math.exp(-dt * 12));
    this.kick *= Math.exp(-dt * 9);
    const p = this.shownPos;

    // сердцебиение, когда выносливость на исходе
    this.beatTimer -= dt;
    if (fight && s.stamina < 0.2 && this.beatTimer <= 0) {
      sfx.heartbeat();
      this.beatTimer = 0.75;
    }

    const ourEffort = fight ? clamp01(s.momentum / 4) : 0;
    const oppEffort = fight ? clamp01(oppForce(s, cfg) / (cfg.opp.power * 1.5)) : 0;
    const surging = s.opp.surgeLeft > 0;

    // позы
    const tgt = targetPose(s.tech, s.opp.tech);
    tgt.ourFlex = 0.1 + tgt.ourFlex * (0.3 + 0.7 * ourEffort);
    tgt.oppFlex = 0.1 + tgt.oppFlex * (0.3 + 0.7 * Math.max(oppEffort, surging ? 1 : 0));
    easePose(this.pose, tgt, 1 - Math.exp(-dt * 9));

    // мимика
    const faceCtx: FaceCtx = {
      phase: s.phase,
      position: s.position,
      effort: oppEffort,
      telegraphing: s.opp.next !== null,
      surgeWarn: s.opp.surgeWarnLeft > 0,
      surging,
      resting: s.opp.restLeft > 0,
      stamina: s.opp.stamina,
    };
    const ft = faceTarget(faceCtx);
    const fk = 1 - Math.exp(-dt * 9);
    for (const key of Object.keys(ft) as Array<keyof Face>) this.face[key] = lerp(this.face[key], ft[key], fk);

    // дрожь
    const ampOur = (fight ? 1.2 + ourEffort * 3 : 0.5) + this.kick;
    const ampOpp = (fight ? 1 + oppEffort * 3.2 : 0.4) + (surging ? 5 : 0);
    const t = this.clock;
    const shakeOur: Pt = { x: (Math.sin(t * 47) + Math.sin(t * 71)) * ampOur * 0.5, y: Math.cos(t * 53) * ampOur * 0.5 };
    const shakeOpp: Pt = { x: (Math.sin(t * 43) + Math.sin(t * 67)) * ampOpp * 0.5, y: Math.cos(t * 59) * ampOpp * 0.4 };

    if (this.art) {
      const r = this.art.update({
        dt,
        p,
        ourTech: s.tech,
        oppTech: s.opp.tech,
        fighting: s.phase !== 'ready',
        head: this.pickHead(faceCtx),
        breathe: Math.sin(t * 2.4) * (s.opp.restLeft > 0 ? 3 : 1),
        lower: s.opp.tech === 'press' && fight ? 4 : 0,
        ourEffort,
        shakeOur,
        shakeOpp,
      });
      this.gShadow.clear();
      this.gShadow.fillStyle(0x000000, 0.2);
      this.gShadow.fillEllipse(r.C.x + 10 * r.scale, Math.max(r.C.y + 95 * r.scale, 472), 150 * r.scale, 34 * r.scale);
      this.renderFx(dt, r.C, r.scale, fight);
      return;
    }

    const base = claspPoint(p);
    const C: Pt = { x: base.x + (shakeOur.x + shakeOpp.x) * 0.3, y: base.y + (shakeOur.y + shakeOpp.y) * 0.3 };
    const sc = claspScale(p);
    const rot = claspRotation(p);
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const toWorld = (l: Pt): Pt => ({ x: C.x + (l.x * cos - l.y * sin) * sc, y: C.y + (l.x * sin + l.y * cos) * sc });

    // соперник
    const breathe = Math.sin(t * 2.4);
    const headPos: Pt = {
      x: LAYOUT.oppHead.x,
      y: LAYOUT.oppHead.y + (s.opp.tech === 'press' && fight ? 8 : 0) + breathe * (s.opp.restLeft > 0 ? 6 : 2),
    };
    const lookVec: Pt = { x: Math.max(-1, Math.min(1, (C.x - headPos.x) / 240)), y: Math.max(-0.2, Math.min(1, (C.y - headPos.y) / 240)) };
    const tilt = Math.max(-0.12, Math.min(0.12, (C.x - 640) / 1700)) - Math.max(0, p - 0.6) * 0.3 + Math.max(0, -p - 0.6) * 0.08;
    this.gOpp.clear();
    drawTorso(this.gOpp, look, headPos, breathe);
    drawHead(this.gOpp, look, this.face, { head: headPos, tilt, shake: shakeOpp, time: t, look: lookVec });

    // руки
    this.gOppArm.clear();
    drawOppArms(this.gOppArm, {
      look,
      shoulder: { x: 640 - 205 * look.build, y: 298 },
      shoulder2: { x: 640 + 205 * look.build, y: 298 },
      elbow: { x: LAYOUT.oppElbow.x, y: LAYOUT.oppElbow.y + (p > 0.5 ? (p - 0.5) * 16 : 0) },
      wrist: toWorld(OPP_ATTACH),
      flex: this.pose.oppFlex,
      shake: shakeOpp,
      restShake: shakeOpp.x * 0.6,
    });
    this.gOurArm.clear();
    drawPlayerArms(this.gOurArm, {
      base: LAYOUT.playerBase,
      wrist: toWorld(OUR_ATTACH),
      wristWidth: 112 * sc,
      flex: this.pose.ourFlex,
      shake: shakeOur,
      restShake: shakeOur.x * 0.8,
    });

    // замок
    this.gClasp.setPosition(C.x, C.y).setRotation(rot).setScale(sc);
    this.gClasp.clear();
    drawClasp(this.gClasp, look, this.pose);

    // тень на столе
    this.gShadow.clear();
    this.gShadow.fillStyle(0x000000, 0.2);
    this.gShadow.fillEllipse(C.x + 18 * sc, Math.min(C.y + 170 * sc, 690), 200 * sc, 46 * sc);

    this.renderFx(dt, C, sc, fight);
  }

  private renderFx(dt: number, C: Pt, sc: number, fight: boolean): void {
    const g = this.gFx;
    const s = this.state!;
    g.clear();

    // подсказка направления давления нашей техникой
    if (fight) {
      const pulse = 0.28 + 0.12 * Math.sin(this.clock * 8);
      drawPressureArrow(g, s.tech, C, sc, pulse, techColor(s.tech));
    }

    // значок будущей техники соперника или предупреждение о рывке
    const bx = 800;
    const by = 110;
    if (fight && s.opp.surgeWarnLeft > 0) {
      const k = 1 + 0.12 * Math.sin(this.clock * 30);
      poly(g, [{ x: bx, y: by - 46 * k }, { x: bx + 46 * k, y: by + 36 * k }, { x: bx - 46 * k, y: by + 36 * k }], 0xff3b3b, 8);
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(bx - 5, by - 22, 10, 36, 4);
      g.fillCircle(bx, by + 26, 6);
    } else if (fight && s.opp.next) {
      const k = 1 + 0.1 * Math.sin(this.clock * 14);
      this.techBadge(g, s.opp.next, bx, by, 40 * k, 1);
    }

    // скоростные линии на рывке
    if (s.opp.surgeLeft > 0) {
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * Math.PI * 2;
        const r1 = 230 + Math.random() * 120;
        const r2 = r1 + 90 + Math.random() * 160;
        g.lineStyle(3 + Math.random() * 4, 0xffffff, 0.35);
        g.lineBetween(C.x + Math.cos(a) * r1, C.y + Math.sin(a) * r1 * 0.75, C.x + Math.cos(a) * r2, C.y + Math.sin(a) * r2 * 0.75);
      }
    }

    // кольца и искры
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      if (r.life <= 0) {
        this.rings.splice(i, 1);
        continue;
      }
      const k = 1 - r.life / r.max;
      g.lineStyle(10 * (1 - k) + 2, r.color, 1 - k);
      g.strokeEllipse(r.x, r.y, (70 + k * 230) * 2 * sc, (60 + k * 200) * 2 * sc);
    }
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];
      sp.life -= dt;
      if (sp.life <= 0) {
        this.sparks.splice(i, 1);
        continue;
      }
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.vy += 500 * dt;
      const a = clamp01(sp.life / sp.max);
      g.lineStyle(sp.w, OUTLINE, a);
      g.lineBetween(sp.x, sp.y, sp.x - sp.vx * 0.045, sp.y - sp.vy * 0.045);
      g.lineStyle(sp.w * 0.55, sp.color, a);
      g.lineBetween(sp.x, sp.y, sp.x - sp.vx * 0.045, sp.y - sp.vy * 0.045);
    }
  }

  /** Круглый значок техники с белым глифом. */
  private techBadge(g: G, tech: Technique, x: number, y: number, r: number, alpha: number): void {
    g.fillStyle(0x000000, 0.25 * alpha);
    g.fillCircle(x + 3, y + 6, r);
    g.fillStyle(techColor(tech), alpha);
    g.fillCircle(x, y, r);
    g.lineStyle(7, OUTLINE, alpha);
    g.strokeCircle(x, y, r);
    const glyph = (w: number, color: number) => {
      if (tech === 'hook') {
        const pts: Pt[] = [];
        for (let i = 0; i <= 10; i++) {
          const a = Math.PI * 0.05 + (i / 10) * Math.PI * 1.05;
          pts.push({ x: x - r * 0.05 + Math.cos(a) * r * 0.36, y: y + r * 0.05 + Math.sin(a) * r * 0.36 });
        }
        polyline(g, [{ x: x + r * 0.31, y: y - r * 0.5 }, ...pts], w, color, alpha);
      } else if (tech === 'toproll') {
        const pts: Pt[] = [];
        for (let i = 0; i <= 14; i++) {
          const a = -Math.PI * 0.5 + 0.6 + (i / 14) * Math.PI * 1.6;
          pts.push({ x: x + Math.cos(a) * r * 0.46, y: y + Math.sin(a) * r * 0.46 });
        }
        polyline(g, pts, w, color, alpha);
      } else {
        polyline(g, [{ x, y: y - r * 0.5 }, { x, y: y + r * 0.42 }], w, color, alpha);
        polyline(g, [{ x: x - r * 0.34, y: y + r * 0.08 }, { x, y: y + r * 0.46 }, { x: x + r * 0.34, y: y + r * 0.08 }], w, color, alpha);
      }
    };
    glyph(r * 0.3, OUTLINE);
    glyph(r * 0.16, 0xffffff);
    if (tech === 'toproll') {
      const a = -Math.PI * 0.5 + 0.6 + Math.PI * 1.6;
      const tip = { x: x + Math.cos(a) * r * 0.46, y: y + Math.sin(a) * r * 0.46 };
      poly(g, arrowPts({ x: tip.x - Math.sin(a) * 2, y: tip.y + Math.cos(a) * 2 }, { x: tip.x - Math.sin(a) * r * 0.3, y: tip.y + Math.cos(a) * r * 0.3 }, 1, r * 0.28), 0xffffff, 3, OUTLINE, alpha);
    }
  }

  /* ---------- эффекты ---------- */

  private burst(at: Pt, n: number, color: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 160 + Math.random() * 320;
      this.sparks.push({ x: at.x, y: at.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 140, life: 0.35 + Math.random() * 0.25, max: 0.6, color, w: 6 + Math.random() * 4 });
    }
  }

  private ring(at: Pt, color: number): void {
    this.rings.push({ x: at.x, y: at.y, r: 0, life: 0.45, max: 0.45, color });
  }

  private banner(text: string, color: string, size: number, hold: number, y = 250): void {
    const t = this.add
      .text(W / 2, y, text, {
        fontFamily: FONT,
        fontSize: `${size}px`,
        color,
        stroke: '#3b1d14',
        strokeThickness: Math.round(size * 0.18),
      })
      .setOrigin(0.5)
      .setDepth(100)
      .setScale(2)
      .setAlpha(0);
    this.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 170, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, alpha: 0, y: y - 30, delay: hold, duration: 260, onComplete: () => t.destroy() });
  }

  private floatText(text: string, x: number, y: number, color: string, size: number): void {
    const t = this.add
      .text(Phaser.Math.Clamp(x, 160, W - 160), Phaser.Math.Clamp(y, 40, H - 40), text, {
        fontFamily: FONT,
        fontSize: `${size}px`,
        color,
        stroke: '#3b1d14',
        strokeThickness: Math.round(size * 0.2),
      })
      .setOrigin(0.5)
      .setDepth(90)
      .setScale(0.4);
    this.tweens.add({ targets: t, scale: 1, duration: 140, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, y: t.y - 70, alpha: 0, delay: 360, duration: 520, onComplete: () => t.destroy() });
  }

  /* ---------- связь с интерфейсом ---------- */

  private syncHud(): void {
    const s = this.state;
    if (!s) return;
    useHud.setState({
      phase: s.phase,
      position: s.position,
      stamina: s.stamina,
      oppStamina: s.opp.stamina,
      tech: s.tech,
      oppTech: s.opp.tech,
      oppNext: s.opp.next,
      matchup: matchup(s.tech, s.opp.tech),
      switching: s.switchLeft > 0,
      warnings: s.warnings,
      surgeWarn: s.opp.surgeWarnLeft > 0,
      surging: s.opp.surgeLeft > 0,
      resting: s.opp.restLeft > 0,
      time: s.time,
    });
  }
}
