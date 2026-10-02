import type { CSSProperties } from 'react';
import { BEATS, TECHNIQUES, TECH_INFO } from '../core/techniques';
import { TUNING } from '../core/match';
import { bus } from '../game/bus';
import { useHud } from '../store/hud';
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
  const marker = pct((1 - h.position) / 2);
  const winning = h.position > 0;
  const fillStyle: CSSProperties = winning
    ? { left: marker, right: '50%', background: 'var(--green)' }
    : { left: '50%', right: pct(1 - (1 - h.position) / 2), background: 'var(--red)' };

  return (
    <div className="hud">
      <div className="hud-top">
        <div className="hud-side">
          <div className="hud-name">ТЫ</div>
          <Bar value={h.stamina} color="var(--blue)" label="Выносливость" />
        </div>

        <div className="tug">
          <div className="tug-caps">
            <span className="cap cap-opp">ЕГО ПИН</span>
            <span className="cap cap-you">ТВОЙ ПИН</span>
          </div>
          <div className="tug-track">
            <div className="tug-fill" style={fillStyle} />
            <div className="tug-mid" />
            <div className="tug-marker" style={{ left: marker }}>🤝</div>
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
        {h.resting && <div className="status good">ОН ВЫДОХСЯ — ДАВИ!</div>}
        {h.warnings > 0 && (
          <div className="status bad">
            ⚠ Предупреждение {h.warnings}/{TUNING.maxWarnings}
          </div>
        )}
      </div>

      <div className="hud-bottom">
        <div className="hint">
          {h.phase === 'ready' ? (
            <>Не жми, пока не скажут <b>«ГО!»</b></>
          ) : (
            <>
              Клик мышью или <b>ПРОБЕЛ</b> — давишь руку
              <br />
              <b>1 · 2 · 3</b> — смена техники
            </>
          )}
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
              </button>
            );
          })}
        </div>

        <div className="hud-actions">
          <SoundToggle />
          <button className="btn small ghost" onClick={() => leaveMatch()}>
            Сдаться
          </button>
        </div>
      </div>
    </div>
  );
}
