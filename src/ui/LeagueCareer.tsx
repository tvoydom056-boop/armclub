import { useState } from 'react';
import { LEAGUES, isLeagueOpen, isLeagueOpponentOpen, isQualified, leagueById, tournamentOpponent, type LeagueId } from '../core/leagues';
import { opponentById } from '../core/opponents';
import { TUNING } from '../core/match';
import { useGame } from '../store/game';
import { useHud } from '../store/hud';
import { useSettings } from '../store/settings';
import { ClubIcon } from './ClubIcon';
import { OpponentCard } from './OpponentCard';
import { beginMatch } from './matchControl';
import './leagueCareer.css';
import './matchLearning.css';

export function LeagueCareer() {
  const wins = useGame((s) => s.wins);
  const cups = useGame((s) => s.cups);
  const tournament = useGame((s) => s.tournament);
  const ready = useHud((s) => s.ready);
  const coachEnabled = useSettings((s) => s.coachEnabled);
  const setCoachEnabled = useSettings((s) => s.setCoachEnabled);
  const [selected, selectLeague] = useState<LeagueId | null>(null);
  const current = LEAGUES.filter((league) => isLeagueOpen(league.id, cups)).at(-1)!;
  const league = leagueById(tournament?.leagueId ?? selected ?? current.id)!;
  const open = isLeagueOpen(league.id, cups);
  const qualified = isQualified(league, wins);
  const champion = cups.includes(league.id);
  const defeated = league.opponents.filter((id) => (wins[id] ?? 0) > 0).length;
  const previous = LEAGUES[LEAGUES.indexOf(league) - 1];
  const next = LEAGUES[LEAGUES.indexOf(league) + 1];
  const allDone = cups.length === LEAGUES.length;
  const start = () => {
    if (useGame.getState().startTournament(league.id)) beginMatch(league.opponents[0]);
  };
  return (
    <section className="league-career" aria-labelledby="career-title">
      <div className="section-heading">
        <div><div className="eyebrow">ОТ ГАРАЖА ДО ЧЕМПИОНСТВА</div><h2 id="career-title">{allDone ? 'Карьера чемпиона' : 'Твоя карьера'}</h2></div>
        <span className="roster-progress"><ClubIcon name="check" /> Кубки <b>{cups.length} / {LEAGUES.length}</b></span>
      </div>
      <details className="career-guide">
        <summary>Первый бой? Как побеждать</summary>
        <ol>
          <li>Дождись «ГО!». Клик или ПРОБЕЛ давит руку; два фальстарта — поражение без монет и сброса перетрена.</li>
          <li>Выбирай ответ: топролл бьёт крюк, крюк — пресс, пресс — топролл. Клавиши 1 · 2 · 3 меняют технику с коротким штрафом.</li>
          <li>Пауза в кликах восстанавливает выносливость. Используй отдых соперника, чтобы передохнуть или усилить давление.</li>
          <li>Пресс сильнее от золотой отметки влево. Через {TUNING.maxTime} секунд исход решает перевес руки; в центре выигрываешь ты.</li>
        </ol>
        <label><input type="checkbox" checked={coachEnabled} onChange={(e) => setCoachEnabled(e.target.checked)} /> Подсказки во время боя с Борей</label>
      </details>
      <nav className="league-path" aria-label="Лиги">
        {LEAGUES.map((item, index) => {
          const available = isLeagueOpen(item.id, cups);
          const won = cups.includes(item.id);
          return <button key={item.id} className={`league-step ${league.id === item.id ? 'selected' : ''} ${available ? '' : 'closed'} ${won ? 'complete' : ''}`} aria-pressed={league.id === item.id} disabled={!!tournament && tournament.leagueId !== item.id} onClick={() => selectLeague(item.id)}>
            <span className="league-number">{won ? <ClubIcon name="check" /> : available ? `0${index + 1}` : <ClubIcon name="lock" />}</span>
            <span><b>{item.name}</b><small>{won ? item.cup : available ? 'Лига открыта' : `Нужен ${LEAGUES[index - 1].cup.toLowerCase()}`}</small></span>
          </button>;
        })}
      </nav>
      <div className="league-content">
        <div className="league-qualifying">
          <div className="league-caption"><div><div className="eyebrow">{league.venue}</div><h3>{league.name}</h3></div><span>Отбор: {defeated} / {league.opponents.length}</span></div>
          <p className="league-description">{open ? league.description : `Выиграй переходный турнир лиги «${previous.name}», чтобы попасть сюда.`}</p>
          <div className="opps league-opps">{league.opponents.map((id, index) => {
            const opp = opponentById(id, 2);
            const unlocked = !tournament && isLeagueOpponentOpen(id, wins, cups);
            const lockedReason = tournament ? 'Заверши турнир или выйди из него, чтобы вернуться к обычным боям.' : !open ? `Нужен ${previous.cup.toLowerCase()}.` : undefined;
            return <OpponentCard key={id} opp={opp} index={index} wins={wins[id] ?? 0} unlocked={unlocked} unknown={false} ready={ready} lockedReason={lockedReason} />;
          })}</div>
        </div>
        <aside className={`league-tournament card ${qualified && open && !champion ? 'eligible' : ''}`}>
          <div className="eyebrow">{next ? 'ПЕРЕХОДНЫЙ ТУРНИР' : 'ФИНАЛЬНЫЙ ТУРНИР'}</div>
          <h3>{league.cup}</h3>
          <p>{champion ? next ? `Кубок твой. Открыта ${next.name.toLowerCase()}.` : 'Ты чемпион всех лиг! Возвращайся к знакомым соперникам и улучшай свои результаты.' : 'Две победы подряд. Поражение завершает попытку — прокачка остаётся.'}</p>
          <ol className="tournament-bracket">{league.opponents.map((id, index) => <li key={id} className={champion || tournament && index < tournament.completed ? 'done' : ''}>
            <span className="bracket-marker">{champion || tournament && index < tournament.completed ? <ClubIcon name="check" /> : index + 1}</span>
            <span><small>{index === league.opponents.length - 1 ? 'Финал' : 'Полуфинал'}</small><b>{opponentById(id, 2).name}</b></span>
          </li>)}</ol>
          {!champion && !tournament && <div className="tournament-prize"><span className="coin" /> +{league.prize} за кубок <small>{next ? `и переход в лигу «${next.name}»` : 'и звание чемпиона'}</small></div>}
          <div className="tournament-actions">
            {tournament ? <>
              <p className="tournament-hint" role="status">Побед: {tournament.completed} / {league.opponents.length}. Между боями турнира тренировки недоступны.</p>
              <button className="btn" disabled={!ready} onClick={() => { const id = tournamentOpponent(tournament); if (id) beginMatch(id); }}>Продолжить турнир<ClubIcon name="arrow" /></button>
              <button className="btn ghost" onClick={() => useGame.getState().abandonTournament()}>Выйти из турнира</button>
            </> : champion ? <span className="cup-earned"><ClubIcon name="check" /> Кубок завоёван</span> : <>
              <p className="tournament-hint">{!open ? `Сначала получи ${previous.cup.toLowerCase()}.` : qualified ? 'Отбор пройден. Можно бороться за кубок!' : 'Победи каждого соперника в отборе, чтобы открыть турнир.'}</p>
              <button className="btn" disabled={!open || !qualified || !ready} onClick={start}>Войти в турнир<ClubIcon name="arrow" /></button>
            </>}
          </div>
        </aside>
      </div>
      <p className="career-rule">Тренировка → победы в отборе → турнир → следующая лига. В открытые лиги можно возвращаться.</p>
    </section>
  );
}
