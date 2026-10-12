import type { CSSProperties } from 'react';
import { BEATS, TECHNIQUES, TECH_INFO } from '../core/techniques';
import { TUNING } from '../core/match';
import { leagueById } from '../core/leagues';
import { bus } from '../game/bus';
import { useHud } from '../store/hud';
import { useGame } from '../store/game';
import { useSettings } from '../store/settings';
import { MatchCoach } from './MatchCoach';
import './matchLearning.css';
import { SoundToggle } from './SoundToggle';
import { leaveMatch } from './matchControl';

const pct = (v: number) => `${Math.round(Math.max(0, Math.min(1, v)) * 100)}%`;

function Bar({ value, color, label }: { value: number; color: string; label: string }) {
  const low = value < 0.25;
  return (
    <div className="bar" title={label}>
      <div className="bar-fill" style={{ width: pct(value), background: low ? 'var(--red)' : color }} />
      <span className="bar-label">{label}</span>
    </div>
  );
}

export function MatchHud() {
  const h = useHud();
  const tournament = useGame((s) => s.tournament);
  const oppId = useGame((s) => s.oppId);
  const coachEnabled = useSettings((s) => s.coachEnabled);
  const secondsLeft = Math.max(0, Math.ceil(TUNING.maxTime - h.time));
  const pressReady = h.position >= h.pressGate;
  const league = tournament && leagueById(tournament.leagueId);
  const marker = pct((1 - h.position) / 2);
  const winning = h.position > 0;
  const fillStyle: CSSProperties = winning
    ? { left: marker, right: '50%', background: 'var(--green)' }
    : { left: '50%', right: pct(1 - (1 - h.position) / 2), background: 'var(--red)' };

  return (
    <div className="hud">
      {tournament && league && <div className="tournament-badge">{league.cup} · {tournament.completed === league.opponents.length - 1 ? 'Финал' : 'Полуфинал'}</div>}
      <div className="hud-top">
        <div className="hud-side">
          <div className="hud-name">ТЫ</div>
          <Bar value={h.stamina} color="var(--blue)" label="Выносливость" />
        </div>

        <div className="tug">
          <div className="tug-caps">
            {/* побеждая, ты гнёшь его руку влево — к своей стороне экрана */}
            <span className="cap cap-you">ТВОЙ ПИН</span>
            <span className="cap cap-opp">ЕГО ПИН</span>
          </div>
          <div className="tug-track">
            <div className="tug-fill" style={fillStyle} />
            <div className="tug-mid" />
            <div className="press-gate" style={{ left: pct((1 - h.pressGate) / 2) }} title="Пресс сильнее от этой отметки влево" />
            <div className="tug-marker" style={{ left: marker }}>🤝</div>
          </div>
          <div className="match-readout">
            <span className={secondsLeft <= 10 ? 'time-low' : ''} role="timer" aria-label="Осталось до решения судьи">{secondsLeft} с</span>
            <span className={pressReady ? 'press-ready' : ''}>{pressReady ? 'Пресс: сильная позиция' : 'Пресс: дойди до золотой отметки'}</span>
          </div>
        </div>

        <div className="hud-side right">
          <div className="hud-name">{h.oppName}</div>
          <Bar value={h.oppStamina} color="var(--red)" label="Выносливость" />
        </div>
      </div>

      <div className="hud-mid">
        <div className="opp-tech">
          <span className="muted">Он давит:</span>
          <span className="chip" style={{ '--c': TECH_INFO[h.oppTech].color } as CSSProperties}>
            {TECH_INFO[h.oppTech].icon} {TECH_INFO[h.oppTech].name}
          </span>
          {h.oppNext && (
            <>
              <span className="arrow">➜</span>
              <span className="chip blink" style={{ '--c': TECH_INFO[h.oppNext].color } as CSSProperties}>
                {TECH_INFO[h.oppNext].icon} {TECH_INFO[h.oppNext].name}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="statuses">
        {h.phase === 'fight' && (
          <div className={`status ${h.matchup > 0 ? 'good' : h.matchup < 0 ? 'bad' : ''}`}>
            {h.switching ? 'ПЕРЕХОД…' : h.matchup > 0 ? 'КОНТРА!' : h.matchup < 0 ? 'ТЕБЯ КОНТРЯТ!' : 'РАВНО'}
          </div>
        )}
        {h.surgeWarn && <div className="status bad blink">ОН ГОТОВИТ РЫВОК!</div>}
        {h.breatherWarn && <div className="status good blink">ОН ВЫДЫХАЕТСЯ — ГОТОВЬСЯ!</div>}
        {h.resting && <div className="status good">ОН ВЫДОХСЯ — ДАВИ!</div>}
        {h.warnings > 0 && (
          <div className="status bad">
            ⚠ Предупреждение {h.warnings}/{TUNING.maxWarnings}
          </div>
        )}
      </div>

      <div className="hud-bottom">
        <div className="hint">
          {coachEnabled && oppId === 'boris' && (h.phase === 'ready' || h.phase === 'fight') ? <MatchCoach /> : <>
          {h.phase === 'ready' ? (
            <>Не жми, пока не скажут <b>«ГО!»</b></>
          ) : (
            <>
              Клик мышью или <b>ПРОБЕЛ</b> — давишь руку
              <br />
              <b>1 · 2 · 3</b> — смена техники
            </>
          )}
          </>}
        </div>

        <div className="techs">
          {TECHNIQUES.map((t) => {
            const info = TECH_INFO[t];
            return (
              <button
                key={t}
                className={`tech ${h.tech === t ? 'on' : ''}`}
                data-sfx="none"
                style={{ '--c': info.color } as CSSProperties}
                onClick={(e) => {
                  bus.emit('input:tech', t);
                  // иначе ПРОБЕЛ (клик по врагу) нажимал бы эту же кнопку
                  e.currentTarget.blur();
                }}
              >
                <span className="tech-key">{info.key}</span>
                <span className="tech-icon">{info.icon}</span>
                <span className="tech-name">{info.name}</span>
                <span className="tech-beats">бьёт: {TECH_INFO[BEATS[t]].name}</span>
                {t === 'press' && <span className={`tech-position ${pressReady ? 'ready' : ''}`}>позиция: ×{String(pressReady ? TUNING.pressBoost : TUNING.pressPenalty).replace('.', ',')}</span>}
              </button>
            );
          })}
        </div>

        <div className="hud-actions">
          <SoundToggle />
          <button className="btn small ghost" onClick={() => leaveMatch()}>
            {tournament ? 'Выйти из турнира' : 'Сдаться'}
          </button>
        </div>
      </div>
    </div>
  );
}
