import { useState, type CSSProperties } from 'react';
import { OPPONENTS, type OpponentDef } from '../core/opponents';
import { BEATS, TECHNIQUES, TECH_INFO } from '../core/techniques';
import {
  CATEGORY_INFO,
  UPGRADES,
  upgradeCost,
  type UpgradeCategory,
  type UpgradeDef,
} from '../core/upgrades';
import { isUnlocked, useGame } from '../store/game';
import { useHud } from '../store/hud';
import { sfx } from '../audio/sfx';
import { Portrait } from './Portrait';
import { SoundToggle } from './SoundToggle';
import { beginMatch } from './matchControl';

const fmt = (n: number) => n.toLocaleString('ru-RU');

export function Hub() {
  const tab = useGame((s) => s.tab);
  const coins = useGame((s) => s.coins);
  const setTab = useGame((s) => s.setTab);
  const levels = useGame((s) => s.levels);
  const canBuyAny = UPGRADES.some((u) => levels[u.id] < u.maxLevel && coins >= upgradeCost(u, levels[u.id]));

  return (
    <div className="hub">
      <header className="hub-bar">
        <div className="logo">
          <span className="logo-icon">💪</span>
          <span>АРМ-КЛУБ</span>
        </div>
        <nav className="tabs">
          <button className={`tab ${tab === 'fights' ? 'on' : ''}`} onClick={() => setTab('fights')}>
            Бои
          </button>
          <button className={`tab ${tab === 'shop' ? 'on' : ''}`} onClick={() => setTab('shop')}>
            Тренировка
            {canBuyAny && <i className="dot" />}
          </button>
        </nav>
        <div className="hub-right">
          <SoundToggle slider />
          <div className="coins" title="Монеты">
            <span className="coin" />
            {fmt(coins)}
          </div>
        </div>
      </header>
      <main className="hub-body">{tab === 'fights' ? <Fights /> : <Shop />}</main>
    </div>
  );
}

/* ---------------- Бои ---------------- */

function Fights() {
  const wins = useGame((s) => s.wins);
  const ready = useHud((s) => s.ready);

  return (
    <div className="fights">
      <section className="cheat card">
        <h3>Как победить</h3>
        <ol>
          <li>Жми <b>мышью</b> или <b>ПРОБЕЛ</b> — давишь руку. Спам выматывает.</li>
          <li><b>1 · 2 · 3</b> — смена техники. Читай лицо: оскал и брови вниз — он сейчас сменит технику.</li>
          <li>Выбери ту, что <b>бьёт его</b>:</li>
        </ol>
        <div className="cycle">
          {TECHNIQUES.map((t) => (
            <div key={t} className="cycle-row" style={{ '--c': TECH_INFO[t].color } as CSSProperties}>
              <span className="chip">{TECH_INFO[t].icon} {TECH_INFO[t].name}</span>
              <span className="arrow">бьёт</span>
              <span className="chip" style={{ '--c': TECH_INFO[BEATS[t]].color } as CSSProperties}>
                {TECH_INFO[BEATS[t]].icon} {TECH_INFO[BEATS[t]].name}
              </span>
            </div>
          ))}
        </div>
        <p className="muted">Пресс силён, только когда ты уже впереди.</p>
      </section>

      <div className="opps">
        {OPPONENTS.map((o) => (
          <OpponentCard key={o.id} opp={o} wins={wins[o.id] ?? 0} unlocked={isUnlocked(o.id, wins)} ready={ready} />
        ))}
      </div>
    </div>
  );
}

function OpponentCard({ opp, wins, unlocked, ready }: { opp: OpponentDef; wins: number; unlocked: boolean; ready: boolean }) {
  return (
    <article className={`opp card ${opp.boss ? 'boss' : ''} ${unlocked ? '' : 'locked'}`}>
      {opp.boss && <div className="ribbon">БОСС</div>}
      <div className="opp-pic">
        <Portrait look={opp.look} id={opp.id} />
        {!unlocked && <div className="lock">🔒</div>}
      </div>
      <div className="opp-info">
        <h4>{opp.name}</h4>
        <div className="nick">«{opp.nick}»</div>
        <p>{unlocked ? opp.desc : 'Победи предыдущего соперника, чтобы открыть.'}</p>
      </div>
      <div className="opp-foot">
        <span className="reward">
          <span className="coin" /> {opp.reward}
        </span>
        {wins > 0 && <span className="wins">✔ ×{wins}</span>}
        <button className="btn" disabled={!unlocked || !ready} onClick={() => beginMatch(opp.id)}>
          {ready ? 'В бой' : 'Загрузка…'}
        </button>
      </div>
    </article>
  );
}

/* ---------------- Тренировка (магазин) ---------------- */

const CATS: UpgradeCategory[] = ['hook', 'toproll', 'press', 'body'];

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

  const pick = (c: UpgradeCategory) => {
    setCat(c);
    setSelId(UPGRADES.find((u) => u.category === c)!.id);
  };

  const doBuy = () => {
    if (buy(sel.id)) {
      sfx.ui.buy();
      setPopId(sel.id);
      setTimeout(() => setPopId(null), 450);
    }
  };

  const affordableIn = (c: UpgradeCategory) => UPGRADES.some((u) => u.category === c && levels[u.id] < u.maxLevel && coins >= upgradeCost(u, levels[u.id]));

  return (
    <div className="shop" style={{ '--cat': catColor } as CSSProperties}>
      <div className="shop-cats">
        {CATS.map((c) => (
          <button key={c} className={`cat ${cat === c ? 'on' : ''}`} style={{ '--c': CATEGORY_INFO[c].color } as CSSProperties} onClick={() => pick(c)}>
            <span className="cat-icon">{CATEGORY_INFO[c].icon}</span>
            <span className="cat-name">{CATEGORY_INFO[c].name}</span>
            {affordableIn(c) && <i className="dot" />}
          </button>
        ))}
      </div>

      <div className="shop-grid">
        {list.map((u) => (
          <UpgradeCard key={u.id} def={u} level={levels[u.id]} selected={u.id === sel.id} coins={coins} pop={popId === u.id} onPick={() => setSelId(u.id)} />
        ))}
      </div>

      <aside className="shop-detail card">
        <h3>{sel.name}</h3>
        <p className="detail-desc">{sel.desc}</p>
        <div className="detail-art" style={{ '--c': catColor } as CSSProperties}>
          <span className={popId === sel.id ? 'pop' : ''}>{sel.icon}</span>
          <b className="lvl">Ур. {level}</b>
        </div>
        <div className="detail-effect">
          <div><span className="muted">Сейчас:</span> {sel.effect(level)}</div>
          {!maxed && <div><span className="muted">Дальше:</span> <b>{sel.effect(level + 1)}</b></div>}
        </div>
        <button className={`btn big ${affordable || maxed ? '' : 'poor'}`} data-sfx="none" disabled={maxed || !affordable} onClick={doBuy}>
          {maxed ? 'МАКСИМУМ' : (
            <>
              Улучшить <span className="coin" /> {fmt(cost)}
            </>
          )}
        </button>
        {!maxed && !affordable && <p className="muted center">Не хватает {fmt(cost - coins)} — выиграй ещё бой.</p>}
      </aside>
    </div>
  );
}

function UpgradeCard({ def, level, selected, coins, pop, onPick }: { def: UpgradeDef; level: number; selected: boolean; coins: number; pop: boolean; onPick: () => void }) {
  const cost = upgradeCost(def, level);
  const maxed = level >= def.maxLevel;
  const can = !maxed && coins >= cost;
  return (
    <button className={`ucard ${selected ? 'on' : ''} ${can ? 'can' : ''} ${pop ? 'pop' : ''}`} onClick={onPick}>
      <span className="ucard-icon">{def.icon}</span>
      <span className="ucard-name">{def.name}</span>
      <span className="ucard-lvl">
        <i style={{ width: `${(level / def.maxLevel) * 100}%` }} />
      </span>
      <span className="ucard-price">{maxed ? 'MAX' : <><span className="coin" /> {fmt(cost)}</>}</span>
    </button>
  );
}
