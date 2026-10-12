import type { CSSProperties } from 'react';
import { ROSTERS, type OpponentDef } from '../core/opponents';
import { TECHNIQUES, TECH_INFO } from '../core/techniques';
import { useGame } from '../store/game';
import { OPPONENT_BG, opponentBgUrl } from '../game/art';
import { Portrait } from './Portrait';
import { ClubIcon } from './ClubIcon';
import { beginMatch } from './matchControl';

const SHARED_BG = `${import.meta.env.BASE_URL}art/scene/bg.png`;

export function OpponentCard({ opp, index, wins, unlocked, unknown, ready, lockedReason }: {
  opp: OpponentDef; index: number; wins: number; unlocked: boolean; unknown: boolean; ready: boolean; lockedReason?: string;
}) {
  const favorite = TECHNIQUES.reduce((a, b) => opp.weights[a] >= opp.weights[b] ? a : b);
  const version = useGame((s) => s.version);
  const roster = ROSTERS[version];
  const previous = roster[Math.max(0, roster.findIndex((o) => o.id === opp.id) - 1)];
  return (
    <article className={`opp card opp-${opp.id} ${opp.boss ? 'boss' : ''} ${unlocked ? '' : 'locked'} ${unknown ? 'unknown' : ''}`}>
      {/* На карточке тот же фон, на котором идёт бой. */}
      <div className="opp-pic" style={{ backgroundImage: `url("${OPPONENT_BG[opp.id] ? opponentBgUrl(opp.id) : SHARED_BG}")`, backgroundSize: 'cover', backgroundPosition: 'center 35%' } as CSSProperties}>
        <span className="fighter-number">{String(index + 1).padStart(2, '0')}</span><span className={`fighter-status ${unlocked ? 'available' : ''}`}>{opp.boss ? 'БОСС ЛИГИ' : wins > 0 ? 'ПОБЕЖДЁН' : unlocked ? 'ДОСТУПЕН' : 'ЗАКРЫТ'}</span>
        <Portrait look={opp.look} id={opp.id} bust />
        {!unlocked && <div className="lock"><ClubIcon name="lock" /></div>}
        {!unknown && <span className="fighter-tech" title={`Любимая техника: ${TECH_INFO[favorite].name}`}><ClubIcon name={favorite} />{TECH_INFO[favorite].name}</span>}
      </div>
      {unknown
        ? <div className="opp-info"><h4>???</h4><div className="nick">«???»</div><p>Сначала пройди предыдущих соперников.</p></div>
        : <div className="opp-info"><h4>{opp.name}</h4><div className="nick">«{opp.nick}»</div><p>{unlocked ? opp.desc : lockedReason ?? `Сначала победи: ${previous.name}.`}</p></div>}
      <div className="opp-foot">
        <div className="reward"><small>НАГРАДА</small><span><span className="coin" />{unknown ? '???' : opp.reward}</span></div>
        {wins > 0 && <span className="wins" title="Число побед"><ClubIcon name="check" /> ×{wins}</span>}
        <button className="btn" aria-label={unlocked ? `В бой: ${opp.name}` : `${unknown ? 'Соперник' : opp.name}: закрыт`} disabled={!unlocked || !ready} onClick={() => beginMatch(opp.id)}>{!unlocked ? <><ClubIcon name="lock" />Закрыто</> : !ready ? 'Загрузка…' : <>В бой<ClubIcon name="arrow" /></>}</button>
      </div>
    </article>
  );
}
