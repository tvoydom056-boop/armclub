import { useState, type CSSProperties } from 'react';
import { OPPONENTS, type OpponentDef } from '../core/opponents';
import { BEATS, TECHNIQUES, TECH_INFO } from '../core/techniques';
import { CATEGORY_INFO, UPGRADES, upgradeCost, type UpgradeCategory, type UpgradeDef } from '../core/upgrades';
import { isUnlocked, useGame } from '../store/game';
import { useHud } from '../store/hud';
import { sfx } from '../audio/sfx';
import { OPPONENT_BG, opponentBgUrl } from '../game/art';
import { Portrait } from './Portrait';
import { SoundToggle } from './SoundToggle';
import { ClubIcon } from './ClubIcon';
import { UpgradeArt } from './UpgradeArt';
import { beginMatch } from './matchControl';
import './hub.css';

const fmt = (n: number) => n.toLocaleString('ru-RU');
const CATS: UpgradeCategory[] = ['hook', 'toproll', 'press', 'body'];
const prerequisite = (id: string) => OPPONENTS[Math.max(0, OPPONENTS.findIndex((o) => o.id === id) - 1)];
/** Общий подвал «Яма»: фон хаба и боя у соперников без своего фона. */
const SHARED_BG = `${import.meta.env.BASE_URL}art/scene/bg.png`;

export function Hub() {
  const tab = useGame((s) => s.tab);
  const coins = useGame((s) => s.coins);
  const setTab = useGame((s) => s.setTab);
  const levels = useGame((s) => s.levels);
  const canBuyAny = UPGRADES.some((u) => levels[u.id] < u.maxLevel && coins >= upgradeCost(u, levels[u.id]));
  return (
    <div className={`hub club-hub hub-${tab}`} style={{ '--hub-background': `url("${SHARED_BG}")` } as CSSProperties}>
      <header className="hub-bar">
        <div className="logo">
          <span className="logo-mark"><UpgradeArt id="biceps" /></span>
          <div><span className="logo-title">АРМ-КЛУБ</span><span className="logo-caption">СИЛА РЕШАЕТ. ТЕХНИКА ПОБЕЖДАЕТ.</span></div>
        </div>
        <nav className="tabs" aria-label="Разделы клуба">
          <button className={`tab ${tab === 'fights' ? 'on' : ''}`} aria-current={tab === 'fights' ? 'page' : undefined} onClick={() => setTab('fights')}><ClubIcon name="fight" /> Бои</button>
          <button className={`tab ${tab === 'shop' ? 'on' : ''}`} aria-current={tab === 'shop' ? 'page' : undefined} onClick={() => setTab('shop')}><ClubIcon name="body" /> Тренировка{canBuyAny && <i className="dot" aria-hidden="true" title="Есть доступные улучшения" />}</button>
        </nav>
        <div className="hub-right"><SoundToggle slider /><div className="coins" title="Монеты"><span className="coin" />{fmt(coins)}</div></div>
      </header>
      <main className="hub-body">{tab === 'fights' ? <Fights /> : <Shop />}</main>
      <footer className="hub-footer"><span>БАР «ЯМА» <i /> ПОДВАЛЬНАЯ ЛИГА</span><span>{tab === 'fights' ? 'КАЖДЫЙ ЧЕМПИОН НАЧИНАЛ С ПЕРВОГО БОЯ' : 'СИЛЬНЕЕ С КАЖДОЙ ТРЕНИРОВКОЙ'}</span></footer>
    </div>
  );
}

function Fights() {
  const wins = useGame((s) => s.wins);
  const ready = useHud((s) => s.ready);
  const setTab = useGame((s) => s.setTab);
  const defeated = OPPONENTS.filter((o) => (wins[o.id] ?? 0) > 0).length;
  // Из закрытых раскрыт только ближайший — остальные инкогнито.
  const nextId = OPPONENTS.find((o) => !isUnlocked(o.id, wins))?.id;
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
        <div className="section-heading"><div><div className="eyebrow">ПОДВАЛЬНАЯ ЛИГА</div><h2 id="roster-title">Выбери соперника</h2></div><span className="roster-progress"><ClubIcon name="check" /> Побеждено <b>{defeated} / {OPPONENTS.length}</b></span></div>
        <div className="opps">{OPPONENTS.map((o, i) => <OpponentCard key={o.id} opp={o} index={i} wins={wins[o.id] ?? 0} unlocked={isUnlocked(o.id, wins)} unknown={!isUnlocked(o.id, wins) && o.id !== nextId} ready={ready} />)}</div>
      </section>
    </div>
  );
}

function OpponentCard({ opp, index, wins, unlocked, unknown, ready }: { opp: OpponentDef; index: number; wins: number; unlocked: boolean; unknown: boolean; ready: boolean }) {
  const favorite = TECHNIQUES.reduce((a, b) => opp.weights[a] >= opp.weights[b] ? a : b);
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
        : <div className="opp-info"><h4>{opp.name}</h4><div className="nick">«{opp.nick}»</div><p>{unlocked ? opp.desc : `Сначала победи: ${prerequisite(opp.id).name}.`}</p></div>}
      <div className="opp-foot">
        <div className="reward"><small>НАГРАДА</small><span><span className="coin" />{unknown ? '???' : opp.reward}</span></div>
        {wins > 0 && <span className="wins" title="Число побед"><ClubIcon name="check" /> ×{wins}</span>}
        <button className="btn" aria-label={unlocked ? `В бой: ${opp.name}` : `${unknown ? 'Соперник' : opp.name}: закрыт`} disabled={!unlocked || !ready} onClick={() => beginMatch(opp.id)}>{!unlocked ? <><ClubIcon name="lock" />Закрыто</> : !ready ? 'Загрузка…' : <>В бой<ClubIcon name="arrow" /></>}</button>
      </div>
    </article>
  );
}

function Shop() {
  const levels = useGame((s) => s.levels);
  const coins = useGame((s) => s.coins);
  const buy = useGame((s) => s.buy);
  const [cat, setCat] = useState<UpgradeCategory>('hook');
  const [selId, setSelId] = useState(UPGRADES.find((u) => u.category === 'hook')!.id);
  const [popId, setPopId] = useState<string | null>(null);
  const list = UPGRADES.filter((u) => u.category === cat);
  const sel = list.find((u) => u.id === selId) ?? list[0];
  const level = levels[sel.id];
  const maxed = level >= sel.maxLevel;
  const cost = upgradeCost(sel, level);
  const affordable = coins >= cost;
  const catColor = CATEGORY_INFO[cat].color;
  const totalLevels = UPGRADES.reduce((sum, u) => sum + levels[u.id], 0);
  const affordableIn = (c: UpgradeCategory) => UPGRADES.some((u) => u.category === c && levels[u.id] < u.maxLevel && coins >= upgradeCost(u, levels[u.id]));
  const pick = (c: UpgradeCategory) => { setCat(c); setSelId(UPGRADES.find((u) => u.category === c)!.id); };
  const doBuy = () => { if (buy(sel.id)) { sfx.ui.buy(); setPopId(sel.id); setTimeout(() => setPopId(null), 450); } };
  return (
    <div className="training" style={{ '--cat': catColor } as CSSProperties}>
      <div className="section-heading"><div><div className="eyebrow">КУЙ СВОЮ ПОБЕДУ</div><h2>Тренировочный зал</h2></div><span className="roster-progress"><ClubIcon name="body" /> Улучшений <b>{totalLevels}</b></span></div>
      <div className="shop">
        <nav className="shop-cats" aria-label="Группы улучшений">{CATS.map((c) => <button key={c} className={`cat ${cat === c ? 'on' : ''}`} aria-pressed={cat === c} style={{ '--c': CATEGORY_INFO[c].color } as CSSProperties} onClick={() => pick(c)}><span className="cat-icon"><ClubIcon name={c} /></span><span className="cat-name">{CATEGORY_INFO[c].name}</span>{affordableIn(c) && <i className="dot" />}</button>)}</nav>
        <section className="training-center" aria-label={`Улучшения: ${CATEGORY_INFO[cat].name}`}>
          <div className="training-label"><span><ClubIcon name={cat} />{cat === 'body' ? 'Общая подготовка' : `Техника: ${CATEGORY_INFO[cat].name}`}</span><small>ВЫБЕРИ УЛУЧШЕНИЕ</small></div>
          <div className="shop-grid">{list.map((u) => <UpgradeCard key={u.id} def={u} level={levels[u.id]} selected={u.id === sel.id} coins={coins} pop={popId === u.id} onPick={() => setSelId(u.id)} />)}</div>
          <div className="training-advice"><span className="advice-mark"><ClubIcon name="body" /></span><div><div className="eyebrow">РАБОТАЙ НА РЕЗУЛЬТАТ</div><h3>Сила приходит с опытом.</h3><p>Победы приносят монеты. Вкладывай их в любимую технику — и возвращайся за следующим соперником.</p><button onClick={() => useGame.getState().setTab('fights')}>Вернуться к боям<ClubIcon name="arrow" /></button></div></div>
        </section>
        <aside className={`shop-detail card ${popId === sel.id ? 'purchased' : ''}`} aria-label="Выбранное улучшение" aria-live="polite">
          <div className="detail-heading"><span className="eyebrow">ТВОЙ СЛЕДУЮЩИЙ ШАГ</span><span className="detail-category"><ClubIcon name={cat} /></span></div>
          <h3>{sel.name}</h3><p className="detail-desc">{sel.desc}</p>
          <div className="detail-art"><span className="art-rays" /><UpgradeArt id={sel.id} className={popId === sel.id ? 'pop' : ''} /><b className="lvl">УРОВЕНЬ {level} / {sel.maxLevel}</b></div>
          <div className="detail-effect"><div><span>Сейчас</span><b>{sel.effect(level)}</b></div>{!maxed && <div className="next-effect"><span>После улучшения</span><b>{sel.effect(level + 1)}</b></div>}</div>
          <button className={`btn big ${affordable || maxed ? '' : 'poor'}`} data-sfx="none" disabled={maxed || !affordable} onClick={doBuy}>{maxed ? <><ClubIcon name="check" />Максимум</> : <>Улучшить<span className="buy-price"><span className="coin" />{fmt(cost)}</span></>}</button>
          <p className={`purchase-note ${maxed || affordable ? '' : 'shortfall'}`}>{maxed ? 'Ты достиг максимального уровня.' : !affordable ? `Не хватает ${fmt(cost - coins)} монет. Выиграй ещё бой.` : 'Улучшение остаётся с тобой навсегда.'}</p>
        </aside>
      </div>
    </div>
  );
}

function UpgradeCard({ def, level, selected, coins, pop, onPick }: { def: UpgradeDef; level: number; selected: boolean; coins: number; pop: boolean; onPick: () => void }) {
  const cost = upgradeCost(def, level);
  const maxed = level >= def.maxLevel;
  const can = !maxed && coins >= cost;
  return (
    <button className={`ucard ${selected ? 'on' : ''} ${can ? 'can' : ''} ${pop ? 'pop' : ''}`} aria-pressed={selected} aria-label={`${def.name}, уровень ${level} из ${def.maxLevel}, ${maxed ? 'максимум' : `${fmt(cost)} монет`}`} onClick={onPick}>
      <span className="ucard-top"><span>УР. {level} / {def.maxLevel}</span>{selected && <ClubIcon name="check" />}</span>
      <UpgradeArt id={def.id} className="ucard-icon" /><span className="ucard-name">{def.name}</span>
      <span className="ucard-lvl" role="progressbar" aria-label={`Уровень: ${def.name}`} aria-valuemin={0} aria-valuemax={def.maxLevel} aria-valuenow={level}><i style={{ width: `${(level / def.maxLevel) * 100}%` }} /></span>
      <span className="ucard-bottom"><small>{selected ? 'ВЫБРАНО' : 'УЛУЧШЕНИЕ'}</small><span className="ucard-price">{maxed ? 'МАКС.' : <><span className="coin" />{fmt(cost)}</>}</span></span>
    </button>
  );
}
