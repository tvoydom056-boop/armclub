import { useState, type CSSProperties } from 'react';
import { SPARRING_COST, SPARRING_STATS, SPARRING_TIME, sparringGains } from '../core/sparring';
import { TECHNIQUES, TECH_INFO, type Technique } from '../core/techniques';
import { freshness, xpToNext } from '../core/training';
import { upgradeById } from '../core/upgrades';
import { useGame } from '../store/game';
import { ClubIcon } from './ClubIcon';
import { beginSparring } from './matchControl';

const pct = (v: number) => `${Math.round(v * 100)}%`;

/** Бар «Яма»: выбираешь технику, платишь партнёру и дерёшься десять секунд. */
export function SparringBar({ onMap }: { onMap: () => void }) {
  const coins = useGame((s) => s.coins);
  const fatigue = useGame((s) => s.fatigue);
  const levels = useGame((s) => s.levels);
  const xp = useGame((s) => s.xp);
  const tournament = useGame((s) => s.tournament);
  const [tech, setTech] = useState<Technique>('hook');
  const gains = sparringGains(tech, 'ok', fatigue);
  const can = coins >= SPARRING_COST && !tournament;
  return (
    <>
      <section className="training-center" aria-label="Бар «Яма»: спарринг">
        <div className="training-label">
          <div className="place-switch" role="group" aria-label="Место">
            <button className="place-btn" onClick={onMap}>← На карту</button><strong className="place-name">Бар «Яма»</strong>
          </div>
          <small>СПАРРИНГ · {SPARRING_TIME} СЕКУНД · {SPARRING_COST} МОНЕТ ПАРТНЁРУ</small>
        </div>
        <div className="shop-grid dense" role="group" aria-label="Техника спарринга">
          {TECHNIQUES.map((t) => {
            const info = TECH_INFO[t];
            return (
              <button key={t} className={`ucard ${t === tech ? 'on' : ''}`} aria-pressed={t === tech} style={{ '--c': info.color } as CSSProperties} onClick={() => setTech(t)}>
                <span className="ucard-top"><span>КЛАВИША {info.key}</span>{t === tech && <ClubIcon name="check" />}</span>
                <span className="ucard-icon" aria-hidden="true" style={{ fontSize: '2.6em', display: 'grid', placeItems: 'center' }}>{info.icon}</span>
                <span className="ucard-name">{info.name}</span>
                <span className="ucard-bottom"><small>ОПЫТ</small><span className="ucard-price">{SPARRING_STATS[t].map((id) => upgradeById(id).name).join(' + ')}</span></span>
              </button>
            );
          })}
        </div>
      </section>
      <aside className="shop-detail card" aria-label="Условия спарринга" aria-live="polite">
        <div className="detail-heading"><span className="eyebrow">ЖИВОЙ БОЙ НА 10 СЕКУНД</span><span className="detail-category"><ClubIcon name="body" /></span></div>
        <h3>Спарринг: {TECH_INFO[tech].name}</h3>
        <p className="detail-desc">Завсегдатай бара жмёт вполсилы от твоей. Выиграешь пин или сильно прижмёшь руку — «Отлично», проиграешь — «Слабо». Опыт получают оба стата техники.</p>
        <div className="detail-effect">
          {gains.map((g) => (
            <div key={g.stat}>
              <span>{upgradeById(g.stat).name} · ур. {levels[g.stat]} · опыт {xp[g.stat]} / {xpToNext(upgradeById(g.stat), levels[g.stat])}</span>
              <b>+{g.xp} опыта при «Норм» · свежесть {pct(freshness(fatigue[g.stat] ?? 0))}</b>
            </div>
          ))}
        </div>
        <button className="btn big" disabled={!can} onClick={() => beginSparring(tech)}>
          {can ? <>Драться за {SPARRING_COST} монет<ClubIcon name="arrow" /></> : <><ClubIcon name="lock" />Не хватает монет</>}
        </button>
        <p className={`purchase-note ${can ? '' : 'shortfall'}`}>
          {can ? 'Сдача и фол опыта не дают и денег не стоят. Бой с соперником сбросит усталость.' : `Нужно ${SPARRING_COST} монет, у тебя ${coins}. Выиграй бой в разделе «Бои».`}
        </p>
      </aside>
    </>
  );
}
