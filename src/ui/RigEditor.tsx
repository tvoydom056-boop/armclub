import { useEffect, useRef, useState, type PointerEvent, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { HEAD_KEYS, type HeadKey } from '../game/art';
import type { ArtPoints } from '../game/artStage';
import { bus, type RigPreview } from '../game/bus';
import { CHARACTERS, TEMPLATE, type CharacterArt } from '../game/characters';
import type { Pt } from '../game/layout';
import { useHud } from '../store/hud';
import { beginMatch } from './matchControl';
import './rigEditor.css';

/**
 * Редактор рига персонажа (только dev): открой игру с ?rig=<id>.
 * Бой замирает, сцену можно крутить по позиции пина, мимике и технике; точки крепления тянутся мышью,
 * размеры — полями. «Сохранить» пишет src/game/characters/<id>.json через dev-сервер (vite.config.ts).
 */
const ART = `${import.meta.env.BASE_URL}art/opponents/`;
/** С кем сравниваем пропорции: полупрозрачный торс и голова эталона на плече того же захвата. */
const REFERENCE = 'boris';
type Handle = 'torso' | 'neck' | 'free';
const HANDLES: Record<Handle, string> = { torso: 'Торс', neck: 'Шея', free: 'Св. плечо' };
const TECHS: RigPreview['tech'][] = ['neutral', 'hook', 'toproll', 'press'];
const SCENE_W = 1280;

const clone = (r: CharacterArt): CharacterArt => JSON.parse(JSON.stringify(r));
/** Точки — до 0.1 px шаблона, масштабы — до 4 знаков. */
const tidy = (r: CharacterArt): CharacterArt => JSON.parse(JSON.stringify(r, (k, v) =>
  typeof v === 'number' ? (k === 'x' || k === 'y' ? Math.round(v * 10) / 10 : Math.round(v * 1e4) / 1e4) : v));
const rotate = (v: Pt, a: number): Pt => ({ x: v.x * Math.cos(a) - v.y * Math.sin(a), y: v.x * Math.sin(a) + v.y * Math.cos(a) });

/** Где на экране холст сцены 1280×720. */
function useStageRect(root: RefObject<HTMLDivElement | null>): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useEffect(() => {
    const update = () => {
      const canvas = root.current?.querySelector('canvas');
      if (canvas) setRect(canvas.getBoundingClientRect());
    };
    update();
    const timer = setInterval(update, 500);
    window.addEventListener('resize', update);
    return () => {
      clearInterval(timer);
      window.removeEventListener('resize', update);
    };
  }, [root]);
  return rect;
}

function Num({ label, value, step, onChange }: { label: string; value: number; step: number; onChange: (v: number) => void }) {
  return (
    <label className="rig-num">
      <span>{label}</span>
      <input type="number" step={step} value={value} onChange={(e) => Number.isFinite(e.target.valueAsNumber) && onChange(e.target.valueAsNumber)} />
    </label>
  );
}

function PtField({ label, value, onChange }: { label: string; value: Pt; onChange: (v: Pt) => void }) {
  return (
    <div className="rig-pt">
      <span>{label}</span>
      <Num label="x" value={value.x} step={1} onChange={(x) => onChange({ ...value, x })} />
      <Num label="y" value={value.y} step={1} onChange={(y) => onChange({ ...value, y })} />
    </div>
  );
}

export default function RigEditor({ id, root }: { id: string; root: RefObject<HTMLDivElement | null> }) {
  const ready = useHud((s) => s.ready);
  const saved = CHARACTERS[id];
  const [rig, setRig] = useState<CharacterArt | undefined>(() => saved && clone(saved));
  const [view, setView] = useState<RigPreview>({ id, p: 0, head: 'calm', tech: 'neutral' });
  const [points, setPoints] = useState<ArtPoints | null>(null);
  const [ghost, setGhost] = useState(true);
  const [status, setStatus] = useState('');
  const rect = useStageRect(root);
  const drag = useRef<{ handle: Handle; from: Pt; rig: CharacterArt; tilt: number } | null>(null);

  // бой с этим персонажем; дальше сцена стоит и рисует то, что задаёт редактор
  useEffect(() => {
    if (!ready || !saved) return;
    beginMatch(id);
    const off = bus.on('rig:points', (p) => setPoints((was) =>
      was && Math.abs(was.neck.x - p.neck.x) + Math.abs(was.neck.y - p.neck.y) + Math.abs(was.shoulder.x - p.shoulder.x) + Math.abs(was.shoulder.y - p.shoulder.y) < 0.05 ? was : p));
    return off;
  }, [ready, saved, id]);
  useEffect(() => {
    if (ready && saved) bus.emit('rig:preview', view);
  }, [ready, saved, view]);

  const apply = (next: CharacterArt) => {
    setRig(next);
    bus.emit('rig:set', next);
    setStatus('');
  };

  if (!saved || !rig) {
    const create = async () => {
      const res = await fetch(`/__rig/${id}`, { method: 'POST', body: JSON.stringify(CHARACTERS[REFERENCE]) });
      setStatus(res.ok ? 'Создан из boris.json — страница перезагрузится' : await res.text());
    };
    return createPortal(
      <div className="rig-panel">
        <h3>Нет манифеста «{id}»</h3>
        <p>Спрайты должны лежать в public/art/opponents/{id}/ (docs/adding-opponent.md).</p>
        <button onClick={create}>Создать src/game/characters/{id}.json из {REFERENCE}.json</button>
        <p>{status}</p>
      </div>,
      document.body,
    );
  }

  const k = rect ? rect.width / SCENE_W : 1;
  const toScreen = (p: Pt): Pt => ({ x: (rect?.left ?? 0) + p.x * k, y: (rect?.top ?? 0) + p.y * k });
  const tilt = points?.tilt ?? 0;

  const startDrag = (handle: Handle) => (e: PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { handle, from: { x: e.clientX, y: e.clientY }, rig: clone(rig), tilt };
  };
  const moveDrag = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    // сдвиг мыши → px шаблона торса (с учётом наклона торса)
    const local = rotate({ x: (e.clientX - d.from.x) / k, y: (e.clientY - d.from.y) / k }, -d.tilt);
    const v = { x: local.x / d.rig.torso.scale, y: local.y / d.rig.torso.scale };
    const next = clone(d.rig);
    const t = next.torso;
    if (d.handle === 'torso') t.shoulder = { x: t.shoulder.x - v.x, y: t.shoulder.y - v.y };
    if (d.handle === 'neck') t.neck = { x: t.neck.x + v.x, y: t.neck.y + v.y };
    if (d.handle === 'free') t.freeShoulder = { x: t.freeShoulder.x + v.x, y: t.freeShoulder.y + v.y };
    apply(next);
  };
  const endDrag = () => { drag.current = null; };

  const edit = (change: (r: CharacterArt) => void) => {
    const next = clone(rig);
    change(next);
    apply(next);
  };
  const save = async () => {
    const res = await fetch(`/__rig/${id}`, { method: 'POST', body: JSON.stringify(tidy(rig)) });
    setStatus(res.ok ? `Сохранено в src/game/characters/${id}.json` : `Ошибка: ${await res.text()}`);
  };
  const copy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(tidy(rig), null, 2));
    setStatus('JSON скопирован');
  };
  const reset = () => apply(clone(saved));

  const handleAt: Record<Handle, Pt | undefined> = { torso: points?.shoulder, neck: points?.neck, free: points?.freeShoulder };
  const ref = CHARACTERS[REFERENCE];

  return createPortal(
    <>
      {ghost && points && rect && id !== REFERENCE && <Ghost art={ref} at={toScreen(points.shoulder)} tilt={tilt} k={k} />}
      {(Object.keys(HANDLES) as Handle[]).map((h) => {
        const p = handleAt[h];
        if (!p || !rect) return null;
        const s = toScreen(p);
        return (
          <div key={h} className={`rig-handle rig-handle-${h}`} style={{ left: s.x, top: s.y }}
            onPointerDown={startDrag(h)} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
            <span>{HANDLES[h]}</span>
          </div>
        );
      })}
      <div className="rig-panel">
        <h3>Риг: {id}</h3>
        <section>
          <label className="rig-row">
            <span>Пин {view.p.toFixed(2)}</span>
            <input type="range" min={-1} max={1} step={0.05} value={view.p} onChange={(e) => setView({ ...view, p: e.target.valueAsNumber })} />
          </label>
          <div className="rig-row">
            {[-1, -0.5, 0, 0.5, 1].map((p) => <button key={p} onClick={() => setView({ ...view, p })}>{p}</button>)}
          </div>
          <label className="rig-row">
            <span>Лицо</span>
            <select value={view.head} onChange={(e) => setView({ ...view, head: e.target.value as HeadKey })}>
              {HEAD_KEYS.map((h) => <option key={h}>{h}</option>)}
            </select>
            <span>Техника</span>
            <select value={view.tech} onChange={(e) => setView({ ...view, tech: e.target.value as RigPreview['tech'] })}>
              {TECHS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label className="rig-row"><input type="checkbox" checked={ghost} onChange={(e) => setGhost(e.target.checked)} /> Эталон: {REFERENCE} (полупрозрачный)</label>
        </section>
        <section>
          <h4>Торс (px шаблона {TEMPLATE.torso.x}×{TEMPLATE.torso.y})</h4>
          <Num label="масштаб" value={rig.torso.scale} step={0.005} onChange={(v) => edit((r) => { r.torso.scale = v; })} />
          <PtField label="плечо" value={rig.torso.shoulder} onChange={(v) => edit((r) => { r.torso.shoulder = v; })} />
          <PtField label="шея" value={rig.torso.neck} onChange={(v) => edit((r) => { r.torso.neck = v; })} />
          <PtField label="св. плечо" value={rig.torso.freeShoulder} onChange={(v) => edit((r) => { r.torso.freeShoulder = v; })} />
        </section>
        <section>
          <h4>Голова (px шаблона {TEMPLATE.head.x}×{TEMPLATE.head.y})</h4>
          <Num label="масштаб" value={rig.head.scale} step={0.005} onChange={(v) => edit((r) => { r.head.scale = v; })} />
          <PtField label="низ шеи" value={rig.head.neck} onChange={(v) => edit((r) => { r.head.neck = v; })} />
          <label className="rig-row">
            <input type="checkbox" checked={!!rig.head.fade} onChange={(e) => edit((r) => {
              if (e.target.checked) r.head.fade = { from: r.head.neck.y - 80, to: r.head.neck.y - 30 };
              else delete r.head.fade;
            })} /> растворять низ шеи
          </label>
          {rig.head.fade && (
            <div className="rig-pt">
              <span>гаснет</span>
              <Num label="с" value={rig.head.fade.from} step={5} onChange={(v) => edit((r) => { r.head.fade = { ...r.head.fade!, from: v }; })} />
              <Num label="до" value={rig.head.fade.to} step={5} onChange={(v) => edit((r) => { r.head.fade = { ...r.head.fade!, to: v }; })} />
            </div>
          )}
        </section>
        <section>
          <h4>Руки</h4>
          <Num label="масштаб связки" value={rig.arms.scale} step={0.01} onChange={(v) => edit((r) => { r.arms.scale = v; })} />
          <Num label="опустить захват, px" value={rig.arms.drop} step={1} onChange={(v) => edit((r) => { r.arms.drop = v; })} />
          <Num label="провис: угол" value={rig.arms.sag.angle} step={0.01} onChange={(v) => edit((r) => { r.arms.sag.angle = v; })} />
          <Num label="провис: px" value={rig.arms.sag.drop} step={1} onChange={(v) => edit((r) => { r.arms.sag.drop = v; })} />
          <Num label="свободная рука" value={rig.freeArm.scale} step={0.01} onChange={(v) => edit((r) => { r.freeArm.scale = v; })} />
          {rig.cuff && <Num label="манжета" value={rig.cuff.scale} step={0.05} onChange={(v) => edit((r) => { r.cuff = { scale: v }; })} />}
        </section>
        <div className="rig-row">
          <button className="rig-save" onClick={save}>Сохранить</button>
          <button onClick={copy}>Копировать JSON</button>
          <button onClick={reset}>Сбросить</button>
        </div>
        <p className="rig-status">{status}</p>
        <p className="rig-hint">Тяни кружки: «Торс» двигает тело на плече руки, «Шея» — голову по торсу, «Св. плечо» — откуда растёт свободная рука.</p>
      </div>
    </>,
    document.body,
  );
}

/** Полупрозрачные торс и голова эталона, прикреплённые к тому же плечу: видно, где у нормального бойца шея и плечи. */
function Ghost({ art, at, tilt, k }: { art: CharacterArt; at: Pt; tilt: number; k: number }) {
  const t = art.torso;
  const neckOffset = rotate({ x: (t.neck.x - t.shoulder.x) * t.scale * k, y: (t.neck.y - t.shoulder.y) * t.scale * k }, tilt);
  const neck = { x: at.x + neckOffset.x, y: at.y + neckOffset.y };
  const deg = (tilt * 180) / Math.PI;
  const hs = art.head.scale * k;
  return (
    <>
      <img className="rig-ghost" src={`${ART}${REFERENCE}/torso_motion.png`} alt="" style={{
        left: at.x - t.shoulder.x * t.scale * k, top: at.y - t.shoulder.y * t.scale * k,
        width: TEMPLATE.torso.x * t.scale * k, height: TEMPLATE.torso.y * t.scale * k,
        transformOrigin: `${t.shoulder.x * t.scale * k}px ${t.shoulder.y * t.scale * k}px`, transform: `rotate(${deg}deg)`,
      }} />
      <img className="rig-ghost" src={`${ART}${REFERENCE}/head_calm.png`} alt="" style={{
        left: neck.x - art.head.neck.x * hs, top: neck.y - art.head.neck.y * hs,
        width: TEMPLATE.head.x * hs, height: TEMPLATE.head.y * hs,
        transformOrigin: `${art.head.neck.x * hs}px ${art.head.neck.y * hs}px`, transform: `rotate(${deg}deg)`,
      }} />
    </>
  );
}
