/** Карьера версии 2: победы в отборе дают право на турнир, кубок открывает следующую лигу. */
export type LeagueId = 'basement' | 'city' | 'pro';

export interface LeagueDef {
  id: LeagueId;
  name: string;
  venue: string;
  description: string;
  opponents: readonly string[];
  cup: string;
  prize: number;
}

export const LEAGUES: readonly LeagueDef[] = [
  { id: 'basement', name: 'Подвальная лига', venue: 'Бар «Яма»', description: 'Первый шаг: докажи, что за столом тебе есть место.', opponents: ['boris', 'leva'], cup: 'Кубок подвала', prize: 60 },
  { id: 'city', name: 'Городская лига', venue: 'Качалка «Железо»', description: 'Борьба за звание лучшего в городе. Здесь одной силы мало.', opponents: ['dench', 'vitalik'], cup: 'Кубок города', prize: 120 },
  { id: 'pro', name: 'Профессиональная лига', venue: 'Арена чемпионов', description: 'Последняя ступень: техника, выдержка и борьба до самого пина.', opponents: ['ilya', 'ermes'], cup: 'Кубок чемпионов', prize: 200 },
];

/** Уже выигранные бои турнира. Текущий незавершённый бой после перезагрузки играется заново. */
export interface TournamentRun {
  leagueId: LeagueId;
  completed: number;
}

export interface LeagueProgress {
  cups: LeagueId[];
  tournament: TournamentRun | null;
}

export const leagueById = (id: string): LeagueDef | undefined => LEAGUES.find((league) => league.id === id);
export const leagueForOpponent = (id: string): LeagueDef | undefined => LEAGUES.find((league) => league.opponents.includes(id));

export function isLeagueOpen(id: LeagueId, cups: readonly LeagueId[]): boolean {
  const index = LEAGUES.findIndex((league) => league.id === id);
  return index >= 0 && (index === 0 || cups.includes(LEAGUES[index - 1].id));
}

export function isQualified(league: LeagueDef, wins: Record<string, number>): boolean {
  return league.opponents.every((id) => (wins[id] ?? 0) > 0);
}

export function isLeagueOpponentOpen(id: string, wins: Record<string, number>, cups: readonly LeagueId[]): boolean {
  const league = leagueForOpponent(id);
  if (!league || !isLeagueOpen(league.id, cups)) return false;
  const index = league.opponents.indexOf(id);
  return index === 0 || (wins[league.opponents[index - 1]] ?? 0) > 0;
}

export function enterTournament(id: LeagueId, wins: Record<string, number>, progress: LeagueProgress): TournamentRun | null {
  const league = leagueById(id);
  if (!league || progress.tournament || progress.cups.includes(id) || !isLeagueOpen(id, progress.cups) || !isQualified(league, wins)) return null;
  return { leagueId: id, completed: 0 };
}

export function tournamentOpponent(run: TournamentRun): string | undefined {
  return leagueById(run.leagueId)?.opponents[run.completed];
}

export interface TournamentOutcome extends LeagueProgress {
  status: 'advanced' | 'won' | 'lost';
  leagueId: LeagueId;
  bonus: number;
}

/** Учитывает только ожидаемого соперника; чужой или повторный результат не продвигает сетку. */
export function finishTournamentBout(progress: LeagueProgress, opponentId: string, won: boolean): TournamentOutcome | null {
  const run = progress.tournament;
  if (!run || tournamentOpponent(run) !== opponentId) return null;
  const league = leagueById(run.leagueId)!;
  if (!won) return { cups: progress.cups, tournament: null, status: 'lost', leagueId: league.id, bonus: 0 };
  if (run.completed + 1 < league.opponents.length) {
    return { cups: progress.cups, tournament: { ...run, completed: run.completed + 1 }, status: 'advanced', leagueId: league.id, bonus: 0 };
  }
  const firstCup = !progress.cups.includes(league.id);
  return { cups: firstCup ? [...progress.cups, league.id] : progress.cups, tournament: null, status: 'won', leagueId: league.id, bonus: firstCup ? league.prize : 0 };
}
