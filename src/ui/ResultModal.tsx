import { useEffect } from 'react';
import { sfx } from '../audio/sfx';
import { ROSTERS, opponentById } from '../core/opponents';
import { isUnlocked, useGame } from '../store/game';
import { beginMatch, leaveMatch } from './matchControl';

const REASON: Record<string, string> = {
  pin: 'Чистый пин',
  foul: 'Два предупреждения — фол',
  time: 'Решение судьи по времени',
};

export function ResultModal() {
  const result = useGame((s) => s.result);
  const wins = useGame((s) => s.wins);
  const version = useGame((s) => s.version);
  const won = result?.won;
  useEffect(() => {
    if (won) sfx.ui.coins();
  }, [won, result]);
  if (!result) return null;

  const opp = opponentById(result.oppId);
  const roster = ROSTERS[version];
  const idx = roster.findIndex((o) => o.id === opp.id);
  const next = roster[idx + 1];
  const nextOpen = result.won && next && isUnlocked(next.id, wins, roster);
  const allDone = result.won && opp.boss;

  return (
    <div className="modal-wrap">
      <div className={`modal card ${result.won ? 'win' : 'lose'}`}>
        <h2>{result.won ? 'ПОБЕДА!' : 'ПОРАЖЕНИЕ'}</h2>
        <p className="muted">
          {REASON[result.reason]} · {result.time.toFixed(1)} с · {opp.name}
        </p>
        <div className="prize">
          <span className="coin" /> +{result.reward}
        </div>
        {result.firstWin && next && !allDone && <p className="note">Открыт новый соперник: <b>{next.name}</b></p>}
        {allDone && result.firstWin && <p className="note">Босс подвала повержен! Новые лиги — в разработке.</p>}
        {!result.won && <p className="muted">Подсказка: смотри на лицо соперника и держи технику, которая бьёт его.</p>}
        <div className="modal-actions">
          <button className="btn" onClick={() => beginMatch(opp.id)}>Реванш</button>
          {nextOpen && next && (
            <button className="btn green" onClick={() => beginMatch(next.id)}>Дальше: {next.name}</button>
          )}
          <button className="btn blue" onClick={() => leaveMatch('shop')}>Тренировка</button>
          <button className="btn ghost" onClick={() => leaveMatch('fights')}>К соперникам</button>
        </div>
      </div>
    </div>
  );
}
