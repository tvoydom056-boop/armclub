import { useEffect } from 'react';
import { sfx } from '../audio/sfx';
import { matchAdvice } from '../core/matchAdvice';
import './matchLearning.css';
import { ROSTERS, opponentById } from '../core/opponents';
import { isUnlocked, useGame } from '../store/game';
import { LEAGUES, isLeagueOpponentOpen, isQualified, leagueForOpponent, leagueById, tournamentOpponent } from '../core/leagues';
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
  const cups = useGame((s) => s.cups);
  const tournament = useGame((s) => s.tournament);
  const won = result?.won;
  useEffect(() => {
    if (won) sfx.ui.coins();
  }, [won, result]);
  if (!result) return null;

  const opp = opponentById(result.oppId, version);
  const roster = ROSTERS[version];
  const idx = roster.findIndex((o) => o.id === opp.id);
  const next = roster[idx + 1];
  const nextOpen = !result.tournament && result.won && next && (version === 2 ? isLeagueOpponentOpen(next.id, wins, cups) : isUnlocked(next.id, wins, roster));
  const allDone = version === 1 && result.won && opp.boss;
  const league = version === 2 ? leagueForOpponent(opp.id) : undefined;
  const tournamentLeague = result.tournament ? leagueById(result.tournament.leagueId) : undefined;
  const promoted = tournamentLeague && result.tournament?.status === 'won' ? LEAGUES[LEAGUES.indexOf(tournamentLeague) + 1] : undefined;
  const nextBout = tournament && tournamentOpponent(tournament);
  const tournamentReady = !result.tournament && result.won && league && isQualified(league, wins) && !cups.includes(league.id);
  const advice = matchAdvice(result.reason, result.metrics);

  return (
    <div className="modal-wrap">
      <div className={`modal card ${result.won ? 'win' : 'lose'}`}>
        <h2>{result.tournament?.status === 'won' ? 'КУБОК ТВОЙ!' : result.tournament?.status === 'lost' ? 'ТУРНИР ОКОНЧЕН' : result.won ? 'ПОБЕДА!' : 'ПОРАЖЕНИЕ'}</h2>
        {result.tournament?.status === 'advanced' && <p className="note">Полуфинал пройден. Впереди финал!</p>}
        <p className="muted">
          {REASON[result.reason]} · {result.time.toFixed(1)} с · {opp.name}
        </p>
        <div className="prize">
          <span className="coin" /> +{result.reward}
        </div>
        {result.firstWin && nextOpen && next && !allDone && <p className="note">Открыт новый соперник: <b>{next.name}</b></p>}
        {tournamentReady && <p className="note">Отбор пройден! Открыт турнир: <b>{league.cup}</b>. Победи в нём, чтобы {LEAGUES.indexOf(league) < LEAGUES.length - 1 ? 'перейти в следующую лигу' : 'стать чемпионом'}.</p>}
        {tournamentLeague && result.tournament?.status === 'won' && <p className="note"><b>{tournamentLeague.cup}</b> завоёван! Бонус за кубок: +{result.tournament.bonus} монет. {promoted ? <>Открыта <b>{promoted.name.toLowerCase()}</b>.</> : <b>Ты чемпион всех трёх лиг!</b>}</p>}
        {result.tournament?.status === 'lost' && <p className="note">Попытка завершена. Прокачка и открытые лиги сохранены — тренируйся и попробуй снова.</p>}
        {allDone && result.firstWin && <p className="note">Босс подвала повержен! Новые лиги — в разработке.</p>}
        {advice.length > 0 && <section className="match-review" aria-label="Разбор боя"><h3>Что показал бой</h3><ul>{advice.map((item) => <li key={item.id}><b>{item.title}</b><p>{item.text}</p></li>)}</ul></section>}
        <div className="modal-actions">
          {nextBout ? <button className="btn green" onClick={() => beginMatch(nextBout)}>Финал: {opponentById(nextBout, version).name}</button> : !result.tournament && <button className="btn" onClick={() => beginMatch(opp.id)}>Реванш</button>}
          {nextOpen && next && (
            <button className="btn green" onClick={() => beginMatch(next.id)}>Дальше: {next.name}</button>
          )}
          {!nextBout && <button className="btn blue" onClick={() => leaveMatch('shop')}>Тренировка</button>}
          <button className="btn ghost" onClick={() => leaveMatch('fights')}>{nextBout ? 'Выйти из турнира' : version === 2 ? promoted ? 'В следующую лигу' : 'К лигам' : 'К соперникам'}</button>
        </div>
      </div>
    </div>
  );
}
