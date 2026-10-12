import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { clamp, mulberry32 } from '../core/rng';
import { GRADES, setGains, type ExerciseDef, type GameKind, type Grade, type SetResult } from '../core/training';
import {
  GAME_TIME, GAME_TUNING, createTrainingGame, gameGrade, gameQuality, stepTrainingGame,
  type GameEvent, type TrainingGameState,
} from '../core/trainingGames';
import { upgradeById } from '../core/upgrades';
import { useGame } from '../store/game';
import { sfx } from '../audio/sfx';
import { ClubIcon } from './ClubIcon';
import { fxArt, stampArt, type FxName } from '../game/trainingArt';
import { newMotionTrack, trackEvents, type MotionTrack } from './trainingMotion';
import { sceneFreshness } from './trainingPlaces';
import { TrainingScene, preloadTrainingFrames } from './TrainingScene';
import { completionTicket, consumeInput, type InputEdge } from './trainingSession';
import './trainingGame.css';

const pct = (v: number) => `${Math.round(v * 100)}%`;
const STEP = 1 / 60;

const RULES: Record<GameKind, { name: string; text: string }> = {
  pull: { name: 'Тяга', text: 'Кликай, чтобы держать нагрузку в зелёной зоне. Выше красной линии — срыв и пауза.' },
  spin: { name: 'Вращение', text: 'Кликай точно в удар метронома. Он ускоряется, лишние клики штрафуются.' },
  squeeze: { name: 'Сжатие', text: 'Зажми и держи — сила растёт. Отпусти, когда она в цели. Додавил до упора — срыв.' },
  burst: { name: 'Взрыв', text: 'Жди сигнала «ГО!» и кликай как можно раньше и чаще. Клик до сигнала — фальстарт.' },
};

const FLASH: Partial<Record<GameEvent['type'], string>> = { hit: 'Есть!', miss: 'Мимо', fail: 'Срыв!', go: 'ГО!', falseStart: 'Фальстарт!' };
/** Эффект из fx_sheet под надписью события. */
const FLASH_FX: Partial<Record<GameEvent['type'], FxName>> = { hit: 'impact', rep: 'impact', fail: 'sweat', go: 'sparks' };

/** Шарики опыта на итоговом экране: по одному на 3 очка, от 3 до 10 на стат. */
const orbCount = (xp: number) => clamp(Math.round(xp / 3), 3, 10);

/** Звук на события подхода. */
function playSound(e: GameEvent) {
  if (e.type === 'hit') sfx.click('toproll', 0.5);
  else if (e.type === 'fail') sfx.oppSwitch();
  else if (e.type === 'go') sfx.go();
  else if (e.type === 'falseStart') sfx.falseStart(false);
  else if (e.type === 'rep') sfx.click('hook', e.score);
}

const gradeOf = (q: number): Grade => (q >= GAME_TUNING.grade.great ? 'great' : q >= GAME_TUNING.grade.ok ? 'ok' : 'weak');

type Phase = 'intro' | 'countdown' | 'play' | 'result';

/** Оверлей подхода: правила → 10 секунд мини-игры → оценка и опыт. */
export function TrainingGame({ ex, onClose }: { ex: ExerciseDef; onClose: () => void }) {
  const train = useGame((s) => s.train);
  const [phase, setPhase] = useState<Phase>('intro');
  const [countdown, setCountdown] = useState(3);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(loading);
  loadingRef.current = loading;
  useEffect(() => { let active = true; preloadTrainingFrames(ex).catch(() => {}).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [ex.id]);
  const [, setFrame] = useState(0);
  const [result, setResult] = useState<{ grade: Grade; quality: number; set: SetResult | null } | null>(null);
  const [flash, setFlash] = useState<{ type: GameEvent['type']; text: string; key: number; fx: string | null } | null>(null);
  const game = useRef<TrainingGameState | null>(null);
  const input = useRef<InputEdge[]>([]);
  const held = useRef(new Set<string>());
  const reward = useRef(completionTicket());
  const dialog = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLDivElement>(null);
  // движение руки: события подхода, свежесть стата на старте и «меньше движения» из настроек системы
  const track = useRef<MotionTrack>(newMotionTrack());
  const fresh = useRef(1);
  const [reduced, setReduced] = useState(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => { const media = matchMedia('(prefers-reduced-motion: reduce)'); const change = () => setReduced(media.matches); media.addEventListener('change', change); return () => media.removeEventListener('change', change); }, []);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const start = () => {
    if (loadingRef.current) return;
    if (phaseRef.current === 'play' || phaseRef.current === 'countdown') return;
    game.current = null;
    input.current = [];
    held.current.clear();
    reward.current = completionTicket();
    track.current = newMotionTrack();
    fresh.current = sceneFreshness(ex.primary, ex.secondary, useGame.getState().fatigue);
    setFlash(null); setResult(null); setCountdown(3);
    sfx.ui.start();
    phaseRef.current = 'countdown';
    setPhase('countdown');
  };
  const close = () => { phaseRef.current = 'intro'; held.current.clear(); input.current = []; onClose(); };
  const down = (source: string) => {
    if (phaseRef.current !== 'play' || held.current.has(source)) return;
    held.current.add(source); input.current.push('press');
  };
  const up = (source: string) => {
    if (!held.current.delete(source)) return;
    if (phaseRef.current === 'play') input.current.push('release');
  };

  useEffect(() => {
    if (phase !== 'countdown') return;
    let n = 3;
    const timer = setInterval(() => {
      n--; setCountdown(n);
      if (n === 0) {
        clearInterval(timer);
        game.current = createTrainingGame(ex.game, mulberry32((Date.now() ^ (Math.random() * 0xffffff)) >>> 0));
        phaseRef.current = 'play'; setPhase('play');
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, ex.game]);
  useEffect(() => { if (phase === 'play') field.current?.focus(); if (phase === 'result') dialog.current?.querySelector<HTMLButtonElement>('.tgame-result-actions button')?.focus(); }, [phase]);

  // клик мышью или пробел: нажатие и отпускание
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLButtonElement>('.tgame-intro button')?.focus();
    const releaseAll = () => { for (const source of [...held.current]) up(source); };
    const pointerup = (e: PointerEvent) => up(`pointer-${e.pointerId}`);
    const visibility = () => { if (document.hidden) releaseAll(); };
    const keydown = (e: KeyboardEvent) => {
      if (e.code === 'Tab') {
        const buttons = [...(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]') ?? [])];
        const index = buttons.indexOf(document.activeElement as HTMLElement);
        if (index === -1 || (e.shiftKey && index <= 0) || (!e.shiftKey && index === buttons.length - 1)) { e.preventDefault(); buttons[e.shiftKey ? buttons.length - 1 : 0]?.focus(); }
        return;
      }
      if (e.code === 'Escape') { close(); return; }
      if (e.code !== 'Space' || e.repeat) return;
      if ((e.target as HTMLElement).closest('button, a, input, select, textarea') && !(e.target as HTMLElement).closest('[data-training-action]')) return;
      e.preventDefault();
      if (phaseRef.current === 'intro') start();
      else down('space');
    };
    const keyup = (e: KeyboardEvent) => { if (e.code === 'Space') up('space'); };
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    window.addEventListener('pointerup', pointerup);
    window.addEventListener('pointercancel', pointerup);
    window.addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('pointerup', pointerup);
      window.removeEventListener('pointercancel', pointerup);
      window.removeEventListener('blur', releaseAll);
      document.removeEventListener('visibilitychange', visibility);
      held.current.clear(); input.current = [];
      previous?.focus();
    };
    // подписка одна на весь оверлей: обработчики читают только refs
  }, []);

  useEffect(() => {
    if (phase !== 'play') return;
    const rng = mulberry32(Date.now() >>> 0);
    let raf = 0;
    let last = performance.now();
    let flashKey = 0;
    const tick = (now: number) => {
      const s = game.current!;
      // при низком FPS кадр режется на шаги по 1/60 с: подход длится ровно 10 реальных секунд
      let left = Math.min(GAME_TIME - s.time, Math.max(0, (now - last) / 1000));
      last = now;
      const before = s.time;
      const events: GameEvent[] = consumeInput(s, input.current, rng);
      track.current = trackEvents(track.current, events, s.time);
      input.current = [];
      while (left > 0 && !s.done) {
        const dt = Math.min(STEP, left);
        left -= dt;
        const stepEvents = stepTrainingGame(s, { presses: 0, releases: 0 }, dt, rng);
        events.push(...stepEvents);
        track.current = trackEvents(track.current, stepEvents, s.time);
      }
      // метроном слышно: тик на каждый удар
      if (s.kind === 'spin' && s.beats.some((b) => b > before && b <= s.time)) sfx.ui.click();
      for (const e of events) {
        playSound(e);
        const text = e.type === 'rep' ? GRADES[gradeOf(e.score)].name : FLASH[e.type];
        if (text) setFlash({ type: e.type, text, key: ++flashKey, fx: FLASH_FX[e.type] ? fxArt(FLASH_FX[e.type]!) : null });
      }
      if (s.done) {
        const grade = gameGrade(s);
        setResult({ grade, quality: gameQuality(s), set: reward.current(s, ex.id, grade, train) });
        sfx.ui.buy();
        held.current.clear(); input.current = []; phaseRef.current = 'result'; setPhase('result');
        return;
      }
      setFrame((n) => n + 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, ex.id, train]);

  const s = game.current;
  const q = s ? gameQuality(s) : 0;
  const forecast = setGains(ex, 'ok', useGame.getState().fatigue);
  const levelUp = result?.set?.gains.some((g) => g.levelsGained > 0) ?? false;
  const gains = result?.set?.gains ?? [];
  // строка стата вспыхивает, когда в неё влетел её последний шарик
  const arrival = gains.map((_, row) => gains.slice(0, row + 1).reduce((n, g) => n + orbCount(g.xp), 0) - 1);
  return (
    <div ref={dialog} className="tgame" role="dialog" aria-modal="true" aria-label={`Подход: ${ex.name}`}>
      <div className={`tgame-card card ${phase === 'result' ? 'tgm-thud' : ''}`}>
        <header className="tgame-head">
          <div><div className="eyebrow">ПОДХОД · {RULES[ex.game].name.toUpperCase()}</div><h3>{ex.name}</h3></div>
          {phase !== 'result' && <button className="tgame-exit" onClick={close} aria-label="Выйти без опыта">Выйти<kbd>Esc</kbd></button>}
        </header>

        {phase === 'intro' && (
          <div className="tgame-intro">
            <p>{RULES[ex.game].text}</p>
            <p className="tgame-hint">Клик мышью или <kbd>ПРОБЕЛ</kbd>. Подход длится {GAME_TIME} секунд.</p>
            <p className="tgame-hint">{forecast.map((g) => `${upgradeById(g.stat).name}: +${g.xp} опыта`).join(' · ')}</p>
            <button className="btn big" data-sfx="none" disabled={loading} onClick={start}>{loading ? 'Подготовка сцены…' : 'Начать'}<ClubIcon name="arrow" /></button>
          </div>
        )}

        {phase === 'countdown' && <div className="tgame-countdown" role="status">{countdown || 'Начали!'}<small>Приготовься · нажатия пока не считаются</small></div>}

        {phase === 'play' && s && (
          <>
            <div className="tgame-timer" aria-label="Время подхода"><i style={{ width: pct(1 - s.time / GAME_TIME) }} /></div>
            <div ref={field} className="tgame-field has-frame" tabIndex={0} role="button" aria-label="Поле подхода: нажми или удерживай пробел" onPointerDown={(e) => { if (e.button !== 0) return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); down(`pointer-${e.pointerId}`); }}>
              <TrainingScene ex={ex} s={s} track={track.current} fresh={fresh.current} reduced={reduced} />
              <GameView s={s} />
              {flash && (flash.type === 'go'
                ? <span key={flash.key} className="tgm-go" style={flash.fx ? { backgroundImage: `url("${flash.fx}")` } : undefined}>{flash.text}</span>
                : <span key={flash.key} className={`tgame-flash ${flash.fx ? 'with-fx' : ''}`} style={flash.fx ? { backgroundImage: `url("${flash.fx}")` } : undefined}>{flash.text}</span>)}
              {flash && (flash.type === 'fail' || flash.type === 'falseStart') && <span key={`edge-${flash.key}`} className="tgm-edge" />}
            </div>
            <button className="btn big training-action" data-training-action data-sfx="none" onPointerDown={(e) => { if (e.button !== 0) return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); down(`pointer-${e.pointerId}`); }}>Нажми / удерживай · ПРОБЕЛ</button>
            <div className="tgame-score"><span>Качество <b>{pct(q)}</b></span><span className={`tgame-grade g-${gradeOf(q)}`}>{GRADES[gradeOf(q)].name}</span></div>
          </>
        )}

        {phase === 'result' && result && (
          <div className="tgame-result" aria-live="polite">
            <div className={`tgame-big tgm-stamp g-${result.grade} ${stampArt(result.grade) ? 'stamped' : ''}`} style={stampArt(result.grade) ? { backgroundImage: `url("${stampArt(result.grade)}")` } : undefined}>{GRADES[result.grade].name}</div>
            {levelUp && stampArt('level') && <span className="tgm-levelup"><img className="tgame-level" src={stampArt('level')!} alt="Новый уровень" /></span>}
            <p>Качество {pct(result.quality)} · опыт ×{GRADES[result.grade].mult}</p>
            <ul>{gains.map((g, row) => <li key={g.stat} className="tgm-gain" style={{ '--i': arrival[row] } as CSSProperties}><b>{upgradeById(g.stat).name}</b> +{g.xp} опыта{g.levelsGained > 0 && <em className="tgm-levelup"> — уровень {result.set!.patch.levels![g.stat]}!</em>}</li>)}</ul>
            <XpOrbs gains={gains} />
            <div className="tgame-result-actions"><button className="btn" onClick={start}>Ещё подход</button><button className="btn" onClick={close}>Другой снаряд</button><button className="btn" onClick={() => { close(); useGame.getState().setTab('fights'); }}>В бой</button></div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Шарики опыта летят от печати к строкам статов; у побочного стата они мельче. */
function XpOrbs({ gains }: { gains: readonly { stat: string; xp: number }[] }) {
  const box = useRef<HTMLDivElement>(null);
  const [path, setPath] = useState<{ start: number; rows: number[] } | null>(null);
  // печать и значок уровня двигают список — точки полёта меряем по готовой раскладке
  useLayoutEffect(() => {
    const parent = box.current?.parentElement;
    const stamp = parent?.querySelector('.tgm-stamp');
    if (!parent || !stamp) return;
    const measure = () => {
      // offset* не включает стартовую трансформацию падающей печати.
      const center = (el: Element) => { const node = el as HTMLElement; return node.offsetTop + node.offsetHeight / 2; };
      const start = center(stamp);
      setPath({ start, rows: [...parent.querySelectorAll('.tgm-gain')].map((li) => center(li) - start) });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(parent);
    return () => observer.disconnect();
  }, [gains.length]);
  let i = 0;
  return (
    <div ref={box} className="tgm-orbs" aria-hidden="true" style={{ top: path?.start ?? 0 }}>
      {path && gains.flatMap((g, row) => Array.from({ length: orbCount(g.xp) }, (_, k) => (
        <i key={`${g.stat}-${k}`} className={`tgm-orb ${row > 0 ? 'half' : ''}`} style={{ '--i': i++, '--dx': `${((k % 5) - 2) * 0.8}em`, '--dy': `${path.rows[row] ?? 0}px` } as CSSProperties} />
      )))}
    </div>
  );
}

/** Читаемые шкалы механик поверх сцены, включая резервную сцену без PNG. */
function GameView({ s }: { s: TrainingGameState }) {
  switch (s.kind) {
    case 'pull': {
      const [lo, hi] = GAME_TUNING.pull.zone;
      return (
        <div className={`tg-pull ${s.stunLeft > 0 ? 'stun' : ''}`}>
          <div className="tg-vbar">
            <span className="tg-zone" style={{ bottom: pct(lo), height: pct(hi - lo) }} />
            <span className="tg-red" style={{ bottom: pct(GAME_TUNING.pull.redLine) }} />
            <i style={{ height: pct(s.load) }} />
          </div>
          <p>{s.stunLeft > 0 ? 'Срыв — отдышись…' : 'Кликай, держи в зелёной зоне'}</p>
        </div>
      );
    }
    case 'spin': {
      const beat = s.beats[s.next];
      // кольцо сжимается к удару: в момент удара совпадает с рукоятью
      const until = beat === undefined ? 1 : Math.max(0, beat - s.time);
      const inWindow = until <= GAME_TUNING.spin.window;
      return (
        <div className="tg-spin">
          <div className="tg-wheel" style={{ '--a': `${s.hits * 40}deg` } as CSSProperties}><i /></div>
          <span className={`tg-ring ${inWindow ? 'on' : ''}`} style={{ transform: `translate(-50%, -50%) scale(${1 + Math.min(1, until / 0.6)})` }} />
          <p>Попаданий <b>{s.hits}</b> из {s.beats.length} · мимо {s.misses + s.extra}</p>
        </div>
      );
    }
    case 'squeeze': {
      const tol = GAME_TUNING.squeeze.tolerance / 2;
      return (
        <div className="tg-squeeze">
          <div className="tg-hbar">
            <span className="tg-zone" style={{ left: pct(s.target - tol), width: pct(tol * 2) }} />
            <span className="tg-target" style={{ left: pct(s.target) }} />
            <i style={{ width: pct(s.power) }} />
          </div>
          <div className="tg-reps">{s.reps.map((r, i) => <span key={i} className={`g-${gradeOf(r)}`} />)}</div>
          <p>{s.holding ? 'Держи… отпусти в цели' : s.restLeft > 0 ? 'Вдох…' : 'Зажми'}</p>
        </div>
      );
    }
    case 'burst':
      return (
        <div className={`tg-burst ${s.phase}`}>
          <div className="tg-sign">{s.phase === 'go' ? 'ГО!' : 'ЖДИ…'}</div>
          <div className="tg-reps">{s.scores.map((r, i) => <span key={i} className={`g-${gradeOf(r)}`} />)}</div>
          <p>{s.phase === 'go' ? `Кликов: ${s.taps}` : `Фальстартов: ${s.falseStarts}`}</p>
        </div>
      );
  }
}
