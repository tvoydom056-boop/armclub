import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { mulberry32 } from '../core/rng';
import { GRADES, type ExerciseDef, type GameKind, type Grade, type SetResult } from '../core/training';
import {
  GAME_TIME, GAME_TUNING, createTrainingGame, gameGrade, gameQuality, stepTrainingGame,
  type GameEvent, type GameInput, type TrainingGameState,
} from '../core/trainingGames';
import { upgradeById } from '../core/upgrades';
import { useGame } from '../store/game';
import { sfx } from '../audio/sfx';
import { ClubIcon } from './ClubIcon';

const pct = (v: number) => `${Math.round(v * 100)}%`;
const STEP = 1 / 60;

const RULES: Record<GameKind, { name: string; text: string }> = {
  pull: { name: 'Тяга', text: 'Кликай, чтобы держать нагрузку в зелёной зоне. Выше красной линии — срыв и пауза.' },
  spin: { name: 'Вращение', text: 'Кликай точно в удар метронома. Он ускоряется, лишние клики штрафуются.' },
  squeeze: { name: 'Сжатие', text: 'Зажми и держи — сила растёт. Отпусти, когда она в цели. Додавил до упора — срыв.' },
  burst: { name: 'Взрыв', text: 'Жди сигнала «ГО!» и кликай как можно раньше и чаще. Клик до сигнала — фальстарт.' },
};

const FLASH: Partial<Record<GameEvent['type'], string>> = { hit: 'Есть!', miss: 'Мимо', fail: 'Срыв!', go: 'ГО!', falseStart: 'Фальстарт!' };

/** Звук на события подхода. */
function playSound(e: GameEvent) {
  if (e.type === 'hit') sfx.click('toproll', 0.5);
  else if (e.type === 'fail') sfx.oppSwitch();
  else if (e.type === 'go') sfx.go();
  else if (e.type === 'falseStart') sfx.falseStart(false);
  else if (e.type === 'rep') sfx.click('hook', e.score);
}

const gradeOf = (q: number): Grade => (q >= GAME_TUNING.grade.great ? 'great' : q >= GAME_TUNING.grade.ok ? 'ok' : 'weak');

type Phase = 'intro' | 'play' | 'result';

/** Оверлей подхода: правила → 10 секунд мини-игры → оценка и опыт. */
export function TrainingGame({ ex, onClose }: { ex: ExerciseDef; onClose: () => void }) {
  const train = useGame((s) => s.train);
  const [phase, setPhase] = useState<Phase>('intro');
  const [, setFrame] = useState(0);
  const [result, setResult] = useState<{ grade: Grade; quality: number; set: SetResult | null } | null>(null);
  const [flash, setFlash] = useState<{ text: string; key: number } | null>(null);
  const game = useRef<TrainingGameState | null>(null);
  const input = useRef<GameInput>({ presses: 0, releases: 0 });
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const start = () => {
    game.current = createTrainingGame(ex.game, mulberry32((Date.now() ^ (Math.random() * 0xffffff)) >>> 0));
    input.current = { presses: 0, releases: 0 };
    sfx.ui.start();
    setPhase('play');
  };

  // клик мышью или пробел: нажатие и отпускание
  useEffect(() => {
    const down = () => { if (phaseRef.current === 'play') input.current.presses++; };
    const up = () => { if (phaseRef.current === 'play') input.current.releases++; };
    const keydown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') { if (phaseRef.current !== 'result') onClose(); return; }
      if (e.code !== 'Space' || e.repeat) return;
      e.preventDefault();
      if (phaseRef.current === 'intro') start();
      else down();
    };
    const keyup = (e: KeyboardEvent) => { if (e.code === 'Space') up(); };
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('pointerup', up);
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
      let left = Math.min(0.25, (now - last) / 1000);
      last = now;
      const before = s.time;
      const events: GameEvent[] = [];
      let frameInput = input.current;
      input.current = { presses: 0, releases: 0 };
      while (left > 0 && !s.done) {
        const dt = Math.min(STEP, left);
        left -= dt;
        events.push(...stepTrainingGame(s, frameInput, dt, rng));
        frameInput = { presses: 0, releases: 0 };
      }
      // метроном слышно: тик на каждый удар
      if (s.kind === 'spin' && s.beats.some((b) => b > before && b <= s.time)) sfx.ui.click();
      for (const e of events) {
        playSound(e);
        const text = e.type === 'rep' ? GRADES[gradeOf(e.score)].name : FLASH[e.type];
        if (text) setFlash({ text, key: ++flashKey });
      }
      if (s.done) {
        const grade = gameGrade(s);
        setResult({ grade, quality: gameQuality(s), set: train(ex.id, grade) });
        sfx.ui.buy();
        setPhase('result');
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
  return (
    <div className="tgame" role="dialog" aria-modal="true" aria-label={`Подход: ${ex.name}`}>
      <div className="tgame-card card">
        <header className="tgame-head">
          <div><div className="eyebrow">ПОДХОД · {RULES[ex.game].name.toUpperCase()}</div><h3>{ex.name}</h3></div>
          {phase !== 'result' && <button className="tgame-exit" onClick={onClose} aria-label="Выйти без опыта">Выйти<kbd>Esc</kbd></button>}
        </header>

        {phase === 'intro' && (
          <div className="tgame-intro">
            <p>{RULES[ex.game].text}</p>
            <p className="tgame-hint">Клик мышью или <kbd>ПРОБЕЛ</kbd>. Подход длится {GAME_TIME} секунд.</p>
            <button className="btn big" data-sfx="none" onClick={start}>Начать<ClubIcon name="arrow" /></button>
          </div>
        )}

        {phase === 'play' && s && (
          <>
            <div className="tgame-timer" aria-label="Время подхода"><i style={{ width: pct(1 - s.time / GAME_TIME) }} /></div>
            <div className="tgame-field" onPointerDown={(e) => { e.preventDefault(); input.current.presses++; }}>
              <GameView s={s} />
              {flash && <span key={flash.key} className="tgame-flash">{flash.text}</span>}
            </div>
            <div className="tgame-score"><span>Качество <b>{pct(q)}</b></span><span className={`tgame-grade g-${gradeOf(q)}`}>{GRADES[gradeOf(q)].name}</span></div>
          </>
        )}

        {phase === 'result' && result && (
          <div className="tgame-result" aria-live="polite">
            <div className={`tgame-big g-${result.grade}`}>{GRADES[result.grade].name}</div>
            <p>Качество {pct(result.quality)} · опыт ×{GRADES[result.grade].mult}</p>
            <ul>{result.set?.gains.map((g) => <li key={g.stat}><b>{upgradeById(g.stat).name}</b> +{g.xp} опыта{g.levelsGained > 0 && <em> — уровень {result.set!.patch.levels![g.stat]}!</em>}</li>)}</ul>
            <button className="btn big" onClick={onClose}>Готово<ClubIcon name="check" /></button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Заглушки до спрайтов T6: каждая механика рисуется простыми полосками. */
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
