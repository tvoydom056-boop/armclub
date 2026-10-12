import { useEffect } from 'react';
import { sfx } from '../audio/sfx';
import { SPARRING_COST } from '../core/sparring';
import { GRADES } from '../core/training';
import { TECH_INFO } from '../core/techniques';
import { upgradeById } from '../core/upgrades';
import { useGame } from '../store/game';
import { beginSparring, leaveMatch } from './matchControl';
import './matchLearning.css';

const REASON: Record<string, string> = {
  pin: 'Чистый пин',
  foul: 'Два предупреждения — фол',
  time: 'Десять секунд вышли',
};

/** Итог спарринга: оценка, опыт обоим статам и цена. Награду начислил стор, здесь только показ. */
export function SparringModal() {
  const r = useGame((s) => s.sparringResult);
  const coins = useGame((s) => s.coins);
  const levelUp = r?.gains.some((g) => g.levelsGained > 0) ?? false;
  useEffect(() => {
    if (levelUp) sfx.ui.coins();
  }, [levelUp, r]);
  if (!r) return null;

  const foul = r.reason === 'foul';
  return (
    <div className="modal-wrap">
      <div className={`modal card ${foul || r.grade === 'weak' ? 'lose' : 'win'}`}>
        <h2>{foul ? 'ФОЛ' : `СПАРРИНГ: ${GRADES[r.grade].name.toUpperCase()}`}</h2>
        <p className="muted">{REASON[r.reason]} · {r.time.toFixed(1)} с · {TECH_INFO[r.tech].name}</p>
        {foul
          ? <p className="note">Опыт не начислен, партнёру ничего не заплачено.</p>
          : <ul className="sparring-gains">
            {r.gains.map((g) => (
              <li key={g.stat}><b>{upgradeById(g.stat).name}</b> +{g.xp} опыта{g.levelsGained > 0 && <em> — новый уровень!</em>}</li>
            ))}
          </ul>}
        {r.cost > 0 && <p className="note">Партнёру: −{r.cost} монет. Подход добавил усталость обоим статам — бой её сбросит.</p>}
        <div className="modal-actions">
          <button className="btn green" disabled={coins < SPARRING_COST} onClick={() => beginSparring(r.tech)}>
            Ещё раз · {SPARRING_COST} монет
          </button>
          <button className="btn ghost" onClick={() => leaveMatch('shop')}>В район</button>
        </div>
      </div>
    </div>
  );
}
