import type { CSSProperties } from 'react';
import { ROSTERS } from '../core/opponents';
import { BEATS, TECHNIQUES, TECH_INFO } from '../core/techniques';
import { isUnlocked, useGame } from '../store/game';
import { useHud } from '../store/hud';
import { SoundToggle } from './SoundToggle';
import { ClubIcon } from './ClubIcon';
import { UpgradeArt } from './UpgradeArt';
import { Training, canBuySomething } from './Training';
import { OpponentCard } from './OpponentCard';
import { LeagueCareer } from './LeagueCareer';
import './hub.css';

const fmt = (n: number) => n.toLocaleString('ru-RU');
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
  const tournament = useGame((s) => s.tournament);
  const canBuyAny = canBuySomething(coins, owned, gym);
  return (
    <div className={`hub club-hub hub-${tab}`} style={{ '--hub-background': `url("${SHARED_BG}")` } as CSSProperties}>
      <header className="hub-bar">
        <div className="logo">
          <span className="logo-mark"><UpgradeArt id="biceps" /></span>
          <div><span className="logo-title">АРМ-КЛУБ</span><span className="logo-caption">СИЛА РЕШАЕТ. ТЕХНИКА ПОБЕЖДАЕТ.</span></div>
        </div>
        <div className="version-switch" role="group" aria-label="Версия состава">
          {([1, 2] as const).map((v) => <button key={v} className={`version-btn ${version === v ? 'on' : ''}`} aria-pressed={version === v} disabled={!!tournament} onClick={() => setVersion(v)}>Версия {v}</button>)}
        </div>
        <nav className="tabs" aria-label="Разделы клуба">
          <button className={`tab ${tab === 'fights' ? 'on' : ''}`} aria-current={tab === 'fights' ? 'page' : undefined} onClick={() => setTab('fights')}><ClubIcon name="fight" /> {version === 2 ? 'Лиги' : 'Бои'}</button>
          <button className={`tab ${tab === 'shop' ? 'on' : ''}`} disabled={!!tournament} title={tournament ? 'Заверши турнир или выйди из него перед тренировкой' : undefined} aria-current={tab === 'shop' ? 'page' : undefined} onClick={() => setTab('shop')}><ClubIcon name="body" /> Тренировка{canBuyAny && <i className="dot" aria-hidden="true" title="В лавке есть что купить" />}</button>
        </nav>
        <div className="hub-right"><SoundToggle slider /><div className="coins" title="Монеты"><span className="coin" />{fmt(coins)}</div></div>
      </header>
      <main className="hub-body">{tab === 'fights' ? version === 2 ? <LeagueCareer /> : <Fights /> : <Training />}</main>
      <footer className="hub-footer"><span>АРМ-КЛУБ <i /> {version === 2 ? 'ТРИ ЛИГИ — ОДИН ЧЕМПИОН' : 'ПОДВАЛЬНАЯ ЛИГА'}</span><span>{tab === 'fights' ? 'КАЖДЫЙ ЧЕМПИОН НАЧИНАЛ С ПЕРВОГО БОЯ' : 'СИЛЬНЕЕ С КАЖДОЙ ТРЕНИРОВКОЙ'}</span></footer>
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
