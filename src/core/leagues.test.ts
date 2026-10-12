import { describe, expect, it } from 'vitest';
import { ROSTERS } from './opponents';
import { LEAGUES, enterTournament, finishTournamentBout, isLeagueOpen, isLeagueOpponentOpen, tournamentOpponent, type LeagueProgress } from './leagues';

const qualified = { boris: 1, leva: 1 };
const fresh = (): LeagueProgress => ({ cups: [], tournament: null });

describe('лиги и переходный турнир', () => {
  it('все шесть бойцов версии 2 входят в карьеру по одному разу', () => {
    expect(LEAGUES.flatMap((league) => league.opponents)).toEqual(ROSTERS[2].map((opp) => opp.id));
  });

  it('обычные победы не открывают следующую лигу', () => {
    expect(isLeagueOpen('basement', [])).toBe(true);
    expect(isLeagueOpen('city', [])).toBe(false);
    expect(isLeagueOpponentOpen('dench', qualified, [])).toBe(false);
    expect(isLeagueOpponentOpen('leva', {}, [])).toBe(false);
    expect(isLeagueOpponentOpen('leva', { boris: 1 }, [])).toBe(true);
    expect(isLeagueOpponentOpen('unknown', qualified, [])).toBe(false);
  });

  it('турнир требует открытой лиги и побед над всеми её соперниками', () => {
    expect(enterTournament('basement', { boris: 1 }, fresh())).toBeNull();
    expect(enterTournament('city', { dench: 1, vitalik: 1 }, fresh())).toBeNull();
    const run = enterTournament('basement', qualified, fresh());
    expect(run).toEqual({ leagueId: 'basement', completed: 0 });
    expect(enterTournament('basement', qualified, { ...fresh(), tournament: run })).toBeNull();
  });

  it('кубок и переход выдаются только после двух последовательных побед', () => {
    const progress = { ...fresh(), tournament: enterTournament('basement', qualified, fresh()) };
    expect(tournamentOpponent(progress.tournament!)).toBe('boris');
    const semifinal = finishTournamentBout(progress, 'boris', true)!;
    expect(semifinal.status).toBe('advanced');
    expect(semifinal.cups).toEqual([]);
    expect(semifinal.bonus).toBe(0);
    expect(isLeagueOpen('city', semifinal.cups)).toBe(false);
    expect(tournamentOpponent(semifinal.tournament!)).toBe('leva');
    const final = finishTournamentBout(semifinal, 'leva', true)!;
    expect(final.status).toBe('won');
    expect(final.cups).toEqual(['basement']);
    expect(final.tournament).toBeNull();
    expect(final.bonus).toBe(LEAGUES[0].prize);
    expect(isLeagueOpen('city', final.cups)).toBe(true);
    expect(isLeagueOpen('pro', final.cups)).toBe(false);
    expect(isLeagueOpponentOpen('boris', qualified, final.cups)).toBe(true);
    expect(enterTournament('basement', qualified, final)).toBeNull();
    expect(finishTournamentBout(final, 'leva', true)).toBeNull();
  });

  it('поражение в полуфинале или финале обнуляет попытку и допускает новый вход', () => {
    for (const completed of [0, 1]) {
      const s: LeagueProgress = { cups: [], tournament: { leagueId: 'basement', completed } };
      const lost = finishTournamentBout(s, tournamentOpponent(s.tournament!)!, false)!;
      expect(lost).toMatchObject({ status: 'lost', tournament: null, cups: [], bonus: 0 });
      expect(enterTournament('basement', qualified, lost)).toEqual({ leagueId: 'basement', completed: 0 });
    }
  });

  it('результат не того соперника не продвигает турнир', () => {
    const s: LeagueProgress = { cups: [], tournament: { leagueId: 'basement', completed: 0 } };
    expect(finishTournamentBout(s, 'leva', true)).toBeNull();
    expect(s.tournament?.completed).toBe(0);
  });

  it('финальный турнир завершает карьеру без четвёртой лиги', () => {
    const s: LeagueProgress = { cups: ['basement', 'city'], tournament: { leagueId: 'pro', completed: 1 } };
    const result = finishTournamentBout(s, 'ermes', true)!;
    expect(result.cups).toEqual(['basement', 'city', 'pro']);
    expect(result.tournament).toBeNull();
    expect(result.bonus).toBe(LEAGUES[2].prize);
  });
});
