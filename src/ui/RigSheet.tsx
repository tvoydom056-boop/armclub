import { useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { opponentById } from '../core/opponents';
import { HEAD_KEYS, opponentBgUrl, OPPONENT_BG } from '../game/art';
import { bus, type RigPreview } from '../game/bus';
import { CHARACTERS } from '../game/characters';
import { snapshotScene } from '../game/createGame';
import { useHud } from '../store/hud';
import { beginMatch } from './matchControl';
import { Portrait } from './Portrait';
import { Issues, postRig, type CheckResult } from './RigEditor';
import './rigEditor.css';

/**
 * Лист поз персонажа (только dev): открой игру с ?sheet=<id>.
 * Настоящая сцена боя проходит по всем позициям пина, лицам и технике «пресс», каждый кадр снимается —
 * за один взгляд видно, где прыгает голова, рвётся рукав или торчит обрубок шеи. Сверху — замечания проверки набора.
 */
type View = Omit<RigPreview, 'id'>;
interface Row { title: string; cells: { label: string; view: View }[] }

/** Сколько шагов по 50 мс сцена доводится перед снимком: наклон при прессе и смена лица успевают закончиться. */
const SETTLE = 30;
const PINS = [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1];
const ROWS: Row[] = [
  { title: 'До «ГО!»', cells: [{ label: 'нейтраль', view: { p: 0, head: 'calm', tech: 'neutral' } }] },
  { title: 'Позиция пина (−1 — он дожал, +1 — мы), крюк', cells: PINS.map((p) => ({ label: `пин ${p}`, view: { p, head: 'calm', tech: 'hook' } })) },
  {
    title: 'Лица на пине 0: голова не должна прыгать',
    cells: HEAD_KEYS.filter((h) => h !== 'press').map((head) => ({ label: head, view: { p: 0, head, tech: 'hook' } })),
  },
  { title: 'Пресс: корпус наклоняется, голова повёрнута', cells: [-1, 0, 1].map((p) => ({ label: `пин ${p}`, view: { p, head: 'strain', tech: 'press' } })) },
  { title: 'Топролл', cells: [-0.5, 0, 0.5].map((p) => ({ label: `пин ${p}`, view: { p, head: 'strain', tech: 'toproll' } })) },
];
const cellKey = (v: View) => `${v.tech}:${v.head}:${v.p}`;

export default function RigSheet({ id }: { id: string }) {
  const ready = useHud((s) => s.ready);
  const art = CHARACTERS[id];
  const [shots, setShots] = useState<Record<string, string>>({});
  const [check, setCheck] = useState<CheckResult | null>(null);
  const [run, setRun] = useState(0);
  const [big, setBig] = useState<string | null>(null);
  const [failure, setFailure] = useState('');

  useEffect(() => {
    if (art) postRig(id, art).then(({ result }) => setCheck(result), () => setCheck(null));
  }, [id, art, run]);

  // кадры снимаются по одному: сцена одна, поза задаётся тем же событием, что и в редакторе рига
  useEffect(() => {
    if (!ready || !art) return;
    let live = true;
    setShots({});
    setFailure('');
    beginMatch(id);
    (async () => {
      for (const row of ROWS) {
        for (const { view } of row.cells) {
          bus.emit('rig:preview', { id, ...view });
          const src = await snapshotScene(SETTLE);
          if (!live) return;
          setShots((s) => ({ ...s, [cellKey(view)]: src }));
        }
      }
    })().catch((e) => live && setFailure(String(e?.stack ?? e)));
    return () => {
      live = false;
    };
  }, [ready, art, id, run]);

  // calm на пине 0 есть и в ряду пина, и в ряду лиц — кадр один
  const total = new Set(ROWS.flatMap((r) => r.cells.map((c) => cellKey(c.view)))).size;
  const done = Object.keys(shots).length;
  const pic: CSSProperties = { backgroundImage: `url("${OPPONENT_BG[id] ? opponentBgUrl(id) : `${import.meta.env.BASE_URL}art/scene/bg.png`}")`, backgroundSize: 'cover', backgroundPosition: 'center 35%' };

  return createPortal(
    <div className="rig-sheet">
      <header>
        <h2>Лист поз: {id}</h2>
        <a className="rig-link" href={`?rig=${id}`}>Редактор рига →</a>
        <button onClick={() => setRun((n) => n + 1)} disabled={done < total}>{done < total ? `Снимаю ${done}/${total}…` : 'Переснять'}</button>
        <nav>{Object.keys(CHARACTERS).map((c) => <a key={c} href={`?sheet=${c}`} className={c === id ? 'current' : ''}>{c}</a>)}</nav>
      </header>
      {!art ? <p>Нет манифеста src/game/characters/{id}.json — создай его в редакторе ?rig={id}.</p> : (
        <>
          <Issues check={check} />
          {failure && <pre className="rig-error">Сцена упала: {failure}</pre>}
          {ROWS.map((row) => (
            <section key={row.title}>
              <h3>{row.title}</h3>
              <div className="rig-sheet-grid">
                {row.cells.map(({ label, view }) => {
                  const src = shots[cellKey(view)];
                  return (
                    <figure key={label} data-key={cellKey(view)}>
                      {src ? <img src={src} alt={label} onClick={() => setBig(src)} /> : <div className="rig-sheet-wait" />}
                      <figcaption>{label}</figcaption>
                    </figure>
                  );
                })}
              </div>
            </section>
          ))}
          <section>
            <h3>Карточка в хабе (размер примерно как в игре; голову двигает bust в манифесте)</h3>
            <div className="club-hub rig-sheet-card">
              <article className="opp card"><div className="opp-pic" style={pic}><Portrait look={opponentById(id, 2).look} id={id} bust /></div></article>
            </div>
          </section>
        </>
      )}
      {big && <div className="rig-sheet-big" onClick={() => setBig(null)}><img src={big} alt="" /></div>}
    </div>,
    document.body,
  );
}
