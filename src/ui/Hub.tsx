import type { CSSProperties } from 'react';
import { ROSTERS, type OpponentDef } from '../core/opponents';
import { BEATS, TECHNIQUES, TECH_INFO } from '../core/techniques';
import { isUnlocked, useGame } from '../store/game';
import { useHud } from '../store/hud';
import { OPPONENT_BG, opponentBgUrl } from '../game/art';
import { Portrait } from './Portrait';
import { SoundToggle } from './SoundToggle';
import { ClubIcon } from './ClubIcon';
import { UpgradeArt } from './UpgradeArt';
import { Training, canBuySomething } from './Training';
import { beginMatch } from './matchControl';
import './hub.css';

const fmt = (n: number) => n.toLocaleString('ru-RU');
const prerequisite = (roster: readonly OpponentDef[], id: string) => roster[Math.max(0, roster.findIndex((o) => o.id === id) - 1)];
/** Общий подвал «Яма»: фон хаба и боя у соперников без своего фона. */
const SHARED_BG = `${import.meta.env.BASE_URL}art/scene/bg.png`;

export function Hub() {
  const tab = useGame((s) => s.tab);
  const coins = useGame((s) => s.coins);
  const setTab = useGame((s) => s.setTab);
  const version = useGame((s) => s.version);
  const setVersion = useGame((s) => s.setVersion);
  const owned = useGame((s) => s.owned);
  const gym = useGame((s) => s.gym);
  const canBuyAny = canBuySomething(coins, owned, gym);
  return (
    <div className={`hub club-hub hub-${tab}`} style={{ '--hub-background': `url("${SHARED_BG}")` } as CSSProperties}>
      <header className="hub-bar">
        <div className="logo">
          <span className="logo-mark"><UpgradeArt id="biceps" /></span>
          <div><span className="logo-title">АРМ-КЛУБ</span><span className="logo-caption">СИЛА РЕШАЕТ. ТЕХНИКА ПОБЕЖДАЕТ.</span></div>
        </div>
        <div className="version-switch" role="group" aria-label="Версия состава">
          {([1, 2] as const).map((v) => <button key={v} className={`version-btn ${version === v ? 'on' : ''}`} aria-pressed={version === v} onClick={() => setVersion(v)}>Версия {v}</button>)}
        </div>
        <nav className="tabs" aria-label="Разделы клуба">
          <button className={`tab ${tab === 'fights' ? 'on' : ''}`} aria-current={tab === 'fights' ? 'page' : undefined} onClick={() => setTab('fights')}><ClubIcon name="fight" /> Бои</button>
          <button className={`tab ${tab === 'shop' ? 'on' : ''}`} aria-current={tab === 'shop' ? 'page' : undefined} onClick={() => setTab('shop')}><ClubIcon name="body" /> Тренировка{canBuyAny && <i className="dot" aria-hidden="true" title="В лавке есть что купить" />}</button>
        </nav>
        <div className="hub-right"><SoundToggle slider /><div className="coins" title="Монеты"><span className="coin" />{fmt(coins)}</div></div>
      </header>
      <main className="hub-body">{tab === 'fights' ? <Fights /> : <Training />}</main>
      <footer className="hub-footer"><span>БАР «ЯМА» <i /> ПОДВАЛЬНАЯ ЛИГА</span><span>{tab === 'fights' ? 'КАЖДЫЙ ЧЕМПИОН НАЧИНАЛ С ПЕРВОГО БОЯ' : 'СИЛЬНЕЕ С КАЖДОЙ ТРЕНИРОВКОЙ'}</span></footer>
    </div>
  );
}

function Fights() {
  const wins = useGame((s) => s.wins);
  const ready = useHud((s) => s.ready);
  const setTab = useGame((s) => s.setTab);
  const version = useGame((s) => s.version);
  const roster = ROSTERS[version];
  const defeated = roster.filter((o) => (wins[o.id] ?? 0) > 0).length;
  // Из закрытых раскрыт только ближайший — остальные инкогнито.
  const nextId = roster.find((o) => !isUnlocked(o.id, wins, roster))?.id;
  return (
    <div className="fights">
      <aside className="fight-sidebar">
        <section className="cheat card">
          <div className="eyebrow">ПАМЯТКА БОЙЦА</div><h3>Как победить</h3>
          <ol>
            <li><span className="step-number">01</span><div><b>Дави, но знай меру</b><p>Кликай или жми <kbd>ПРОБЕЛ</kbd>. Частые клики выматывают — делай паузы.</p></div></li>
            <li><span className="step-number">02</span><div><b>Читай соперника</b><p>Оскал и брови вниз? Он меняет технику. Переключайся: <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd>.</p></div></li>
            <li><span className="step-number">03</span><div><b>Выбирай контртехнику</b><p>У каждой техники есть слабое место.</p></div></li>
          </ol>
          <div className="cycle">{TECHNIQUES.map((t) => <div key={t} className="cycle-row"><span className="chip" style={{ '--c': TECH_INFO[t].color } as CSSProperties}><ClubIcon name={t} />{TECH_INFO[t].name}</span><ClubIcon name="arrow" /><span className="chip" style={{ '--c': TECH_INFO[BEATS[t]].color } as CSSProperties}><ClubIcon name={BEATS[t]} />{TECH_INFO[BEATS[t]].name}</span></div>)}</div>
          <p className="cheat-note"><b>Совет из подвала</b>Пресс особенно силён, когда ты уже впереди.</p>
        </section>
        <button className="sidebar-training" onClick={() => setTab('shop')}><ClubIcon name="body" /><span><b>Не хватает силы?</b><small>Загляни на тренировку</small></span><ClubIcon name="arrow" /></button>
      </aside>
      <section className="fight-roster" aria-labelledby="roster-title">
        <div className="section-heading"><div><div className="eyebrow">ПОДВАЛЬНАЯ ЛИГА</div><h2 id="roster-title">Выбери соперника</h2></div><span className="roster-progress"><ClubIcon name="check" /> Побеждено <b>{defeated} / {roster.length}</b></span></div>
        <div className="opps">{roster.map((o, i) => <OpponentCard key={o.id} opp={o} index={i} wins={wins[o.id] ?? 0} unlocked={isUnlocked(o.id, wins, roster)} unknown={!isUnlocked(o.id, wins, roster) && o.id !== nextId} ready={ready} />)}</div>
      </section>
    </div>
  );
}

function OpponentCard({ opp, index, wins, unlocked, unknown, ready }: { opp: OpponentDef; index: number; wins: number; unlocked: boolean; unknown: boolean; ready: boolean }) {
  const favorite = TECHNIQUES.reduce((a, b) => opp.weights[a] >= opp.weights[b] ? a : b);
  const version = useGame((s) => s.version);
  return (
    <article className={`opp card opp-${opp.id} ${opp.boss ? 'boss' : ''} ${unlocked ? '' : 'locked'} ${unknown ? 'unknown' : ''}`}>
      {/* на карточке тот же фон, на котором идёт бой */}
      <div className="opp-pic" style={{ backgroundImage: `url("${OPPONENT_BG[opp.id] ? opponentBgUrl(opp.id) : SHARED_BG}")`, backgroundSize: 'cover', backgroundPosition: 'center 35%' }}>
        <span className="fighter-number">{String(index + 1).padStart(2, '0')}</span><span className={`fighter-status ${unlocked ? 'available' : ''}`}>{opp.boss ? 'БОСС ЛИГИ' : wins > 0 ? 'ПОБЕЖДЁН' : unlocked ? 'ДОСТУПЕН' : 'ЗАКРЫТ'}</span>
        <Portrait look={opp.look} id={opp.id} bust />
        {!unlocked && <div className="lock"><ClubIcon name="lock" /></div>}
        {!unknown && <span className="fighter-tech" title={`Любимая техника: ${TECH_INFO[favorite].name}`}><ClubIcon name={favorite} />{TECH_INFO[favorite].name}</span>}
      </div>
      {unknown
        ? <div className="opp-info"><h4>???</h4><div className="nick">«???»</div><p>Сначала пройди предыдущих соперников.</p></div>
        : <div className="opp-info"><h4>{opp.name}</h4><div className="nick">«{opp.nick}»</div><p>{unlocked ? opp.desc : `Сначала победи: ${prerequisite(ROSTERS[version], opp.id).name}.`}</p></div>}
      <div className="opp-foot">
        <div className="reward"><small>НАГРАДА</small><span><span className="coin" />{unknown ? '???' : opp.reward}</span></div>
        {wins > 0 && <span className="wins" title="Число побед"><ClubIcon name="check" /> ×{wins}</span>}
        <button className="btn" aria-label={unlocked ? `В бой: ${opp.name}` : `${unknown ? 'Соперник' : opp.name}: закрыт`} disabled={!unlocked || !ready} onClick={() => beginMatch(opp.id)}>{!unlocked ? <><ClubIcon name="lock" />Закрыто</> : !ready ? 'Загрузка…' : <>В бой<ClubIcon name="arrow" /></>}</button>
      </div>
    </article>
  );
}
