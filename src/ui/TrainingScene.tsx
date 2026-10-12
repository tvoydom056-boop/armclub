import { useEffect, useRef, useState } from 'react';
import type { ExerciseDef } from '../core/training';
import type { TrainingGameState } from '../core/trainingGames';
import { fxArt, gameFrames, sceneArt, itemArt } from '../game/trainingArt';
import { LAYERS, movingPixel, cablePixel, type LayerSpec } from './trainingLayers';
import { motionAt, sceneMotion, type MotionTrack } from './trainingMotion';

const W = 1536, H = 1024;
const canvas = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
const context = (c: HTMLCanvasElement) => c.getContext('2d')!;
type Pair = { rest: HTMLCanvasElement; peak: HTMLCanvasElement; fixed: HTMLCanvasElement };
const cache = new Map<string, Promise<Pair>>();
const load = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = url;
});

/** Подготовка идёт ещё на карточке правил, до отсчёта и запуска десятисекундного ядра. */
export function preloadTrainingFrames(ex: ExerciseDef): Promise<Pair> {
  const frames = gameFrames(ex), spec = LAYERS[ex.id];
  if (!frames || !spec) return Promise.reject(new Error(`Нет сцены ${ex.id}`));
  const key = `${ex.id}:${frames.rest}:${frames.peak}`;
  if (!cache.has(key)) {
    if (cache.size >= 4) cache.delete(cache.keys().next().value!);
    cache.set(key, Promise.all([load(frames.rest), load(frames.peak)]).then(([a, b]) => prepare(a, b, spec)).catch((err) => { cache.delete(key); throw err; }));
  }
  return cache.get(key)!;
}

/** Маски двух кадров объединяются: прежняя рука не остаётся за новой позой. PNG не изменяются. */
function prepare(rest: HTMLImageElement, peak: HTMLImageElement, spec: LayerSpec): Pair {
  const pair = { rest: canvas(), peak: canvas(), fixed: canvas() };
  const a = canvas(), b = canvas();
  context(a).drawImage(rest, 0, 0); context(b).drawImage(peak, 0, 0);
  const da = context(a).getImageData(0, 0, W, H), db = context(b).getImageData(0, 0, W, H);
  const fixed = context(a).getImageData(0, 0, W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (cablePixel(spec, x, y)) { da.data[i + 3] = 0; db.data[i + 3] = 0; fixed.data[i + 3] = 0; continue; }
    const ma = movingPixel(spec, x, y, da.data[i], da.data[i + 1], da.data[i + 2]);
    const mb = movingPixel(spec, x, y, db.data[i], db.data[i + 1], db.data[i + 2]);
    if (ma || mb) fixed.data[i + 3] = 0;
    if (!ma) da.data[i + 3] = 0;
    if (!mb) db.data[i + 3] = 0;
  }
  context(pair.rest).putImageData(da, 0, 0); context(pair.peak).putImageData(db, 0, 0);
  context(pair.fixed).putImageData(fixed, 0, 0);
  return pair;
}

/** Единый холст: у всех слоёв одинаковый масштаб. Опоры не получают poseTransform. */
export function TrainingScene({ ex, s, track, fresh, reduced }: { ex: ExerciseDef; s: TrainingGameState; track: MotionTrack; fresh: number; reduced: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const pair = useRef<Pair | null>(null);
  const images = useRef(new Map<string, HTMLImageElement>());
  const road = useRef({ offset: 0, time: 0 });
  const [ready, setReady] = useState(0);
  const [error, setError] = useState(false);
  const spec = LAYERS[ex.id];
  useEffect(() => {
    let alive = true;
    pair.current = null; road.current = { offset: 0, time: 0 };
    setError(false);
    preloadTrainingFrames(ex).then((p) => { if (alive) { pair.current = p; setReady((n) => n + 1); } }).catch(() => { if (alive) setError(true); });
    const resources = [sceneArt(ex.id === 'run' ? 'run_street' : `room_${ex.place}`), ex.id === 'run' ? sceneArt('dog') : null, spec?.cable ? sceneArt('weight_stack') : null, ex.id === 'medball' ? itemArt('medball') : null, fxArt('dust'), fxArt('motion'), fxArt('sweat'), fxArt('steam'), ex.id === 'gripper_pro' ? fxArt('sparks') : null];
    for (const url of resources) if (url && !images.current.has(url)) load(url).then((img) => { if (alive) { images.current.set(url, img); setReady((n) => n + 1); } }).catch(() => {});
    return () => { alive = false; };
  }, [ex.id]);
  useEffect(() => {
    const c = ref.current;
    if (!c || !spec) return;
    const ctx = context(c), pose = motionAt(ex, s, track, fresh, reduced), scene = sceneMotion(ex, s, track, reduced);
    ctx.clearRect(0, 0, W, H);
    const background = images.current.get(sceneArt(ex.id === 'run' ? 'run_street' : `room_${ex.place}`) ?? '');
    ctx.fillStyle = '#5b392c'; ctx.fillRect(0, 0, W, H);
    if (background) {
      ctx.save();
      if (ex.id === 'run') {
        road.current.offset = (road.current.offset + Math.max(0, s.time - road.current.time) * scene.roadSpeed) % H;
        road.current.time = s.time;
        // Два одинаковых тайла движутся вниз. Небольшой исходный стык оценён в браузере.
        ctx.drawImage(background, 0, road.current.offset - H, W, H); ctx.drawImage(background, 0, road.current.offset, W, H);
      } else {
        ctx.translate(W / 2, H / 2 + scene.backgroundY); ctx.scale(scene.backgroundScale, scene.backgroundScale);
        ctx.drawImage(background, -W / 2, -H / 2, W, H);
      }
      ctx.restore();
      ctx.fillStyle = '#1b11164d'; ctx.fillRect(0, 0, W, H);
    }
    const p = pair.current;
    if (p) {
      if (spec.mode === 'table') {
        // Под раскрывающейся частью предплечья продолжается дерево из того же rest.
        ctx.drawImage(p.fixed, 380, 675, 220, 180, 805, 620, 420, 170);
      }
      ctx.drawImage(p.fixed, 0, 0);
      const frame = pose.peak >= .5 ? p.peak : p.rest;
      if (spec.mode === 'table' || spec.mode === 'dumbbell') {
        // Небольшая отдача/тремор затухает к локтю; нижний край и опора остаются неподвижными.
        const stop = spec.mode === 'table' ? 780 : 745;
        for (let y = 0; y < stop; y += 8) {
          const k = Math.min(1, (stop - y) / 200);
          const dx = pose.x * k + Math.sin(pose.rotate * Math.PI / 180) * (spec.anchor[1] - y) * k;
          ctx.drawImage(frame, 0, y, W, 8, dx, y + pose.y * k, W, 8);
        }
      } else {
        ctx.save(); ctx.translate(spec.anchor[0] + pose.x, spec.anchor[1] + pose.y); ctx.rotate(pose.rotate * Math.PI / 180); ctx.scale(pose.scale, pose.scale);
        ctx.drawImage(frame, -spec.anchor[0], -spec.anchor[1]); ctx.restore();
      }
      if (spec.cable) {
        ctx.strokeStyle = '#312729'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(spec.grip[0], spec.grip[1]);
        ctx.quadraticCurveTo((spec.grip[0] + spec.cable[0]) / 2, (spec.grip[1] + spec.cable[1]) / 2 + scene.cableWave, spec.cable[0], spec.cable[1]); ctx.stroke();
        const stack = images.current.get(sceneArt('weight_stack') ?? '');
        if (stack) ctx.drawImage(stack, 1340, 750 - scene.plates, 170, 220);
      }
      if (ex.id === 'roller') { ctx.save(); ctx.translate(850, 255); ctx.rotate(track.hits * Math.PI / 3); ctx.strokeStyle = '#f5e5c8'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(15, 0); ctx.stroke(); ctx.restore(); }
      if (scene.flight) {
        const ball = images.current.get(itemArt('medball') ?? '');
        const k = scene.flightProgress, size = 430 * (1 - .7 * k);
        if (ball) ctx.drawImage(ball, 768 + 310 * k - size / 2, 400 - 140 * k - size / 2, size, size);
      }
      if (scene.dog) {
        const dog = images.current.get(sceneArt('dog') ?? '');
        if (dog) ctx.drawImage(dog, 1000 - Math.min(1, (s.time - track.lastGo) / .2) * 200, 140, 500, 380);
      }
      const sweat = images.current.get(fxArt(fresh <= .4 ? 'steam' : 'sweat') ?? '');
      if (sweat && fresh < 1) ctx.drawImage(sweat, 1140, 100, 210, 210);
      const dust = images.current.get(fxArt('dust') ?? '');
      if (dust && s.time - track.lastFail < .3) ctx.drawImage(dust, 600, 650, 300, 200);
      const motion = images.current.get(fxArt('motion') ?? '');
      if (motion && s.time - track.lastHit < .15) ctx.drawImage(motion, 500, 150, 250, 250);
      const sparks = images.current.get(fxArt('sparks') ?? '');
      if (sparks && ex.id === 'gripper_pro' && track.score >= .75 && s.time - track.lastHit < .2) ctx.drawImage(sparks, 480, 150, 280, 280);
    }
  }, [s.time, track, fresh, reduced, ready, ex.id]);
  return <><canvas ref={ref} className="training-game-canvas" data-ready={!!pair.current} width={W} height={H} aria-hidden="true" />{error && <span className="scene-error">Сцена недоступна · {ex.name}. Шкала и управление работают.</span>}</>;
}
