import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  EXERCISES, GYM_MEMBERSHIP, ITEMS, PLACES, canDo, freshness, itemById, setGains, xpToNext,
  type ExerciseDef, type GameKind, type ItemId, type PlaceId,
} from '../core/training';
import { UPGRADES, upgradeById, type UpgradeId } from '../core/upgrades';
import { useGame } from '../store/game';
import { sfx } from '../audio/sfx';
import { ClubIcon, type IconName } from './ClubIcon';
import { UpgradeArt } from './UpgradeArt';
import { TrainingGame } from './TrainingGame';
import { fxArt, itemArt, sceneArt } from '../game/trainingArt';
import { TrainingDistrict, TrainingRoom } from './TrainingDistrict';
import { TrainingArtImage } from './TrainingArtImage';

const fmt = (n: number) => n.toLocaleString('ru-RU');
const pct = (v: number) => `${Math.round(v * 100)}%`;

type Section = 'gym' | 'shop' | 'stats';

const SECTIONS: { id: Section; name: string; icon: IconName; color: string; eyebrow: string; title: string }[] = [
  { id: 'gym', name: 'Район', icon: 'body', color: '#7bd34a', eyebrow: 'ПОДХОД — 10 СЕКУНД', title: 'Твой тренировочный район' },
  { id: 'shop', name: 'Лавка', icon: 'bag', color: '#eab14a', eyebrow: 'СНАРЯДЫ НАВСЕГДА', title: 'Арм-лавка' },
  { id: 'stats', name: 'Статы', icon: 'stats', color: '#2fa8ff', eyebrow: 'ОПЫТ И УРОВНИ', title: 'Твои статы' },
];

const GAME_NAMES: Record<GameKind, string> = { pull: 'Тяга', spin: 'Вращение', squeeze: 'Сжатие', burst: 'Взрыв' };

const statName = (id: UpgradeId) => upgradeById(id).name;
const exercisesOf = (item: ItemId) => EXERCISES.filter((e) => e.item === item);
/** Стат, который снаряд качает первым: им рисуется снаряд, пока нет спрайта. */
const itemStat = (item: ItemId) => exercisesOf(item)[0].primary;
const placesOf = (item: ItemId) => [...new Set(exercisesOf(item).map((e) => e.place))];

/** Есть ли в лавке что-то, на что уже хватает монет: точка на вкладке. */
export const canBuySomething = (coins: number, owned: readonly ItemId[], gym: boolean): boolean =>
  (!gym && coins >= GYM_MEMBERSHIP) || ITEMS.some((i) => !owned.includes(i.id) && coins >= i.price);

export function Training() {
  const [section, setSection] = useState<Section>('gym');
  const [place, setPlace] = useState<PlaceId | 'map'>('map');
  const [playing, setPlaying] = useState<ExerciseDef | null>(null);
  const coins = useGame((s) => s.coins);
  const owned = useGame((s) => s.owned);
  const gym = useGame((s) => s.gym);
  const levels = useGame((s) => s.levels);
  const info = SECTIONS.find((s) => s.id === section)!;
  const totalLevels = UPGRADES.reduce((sum, u) => sum + levels[u.id], 0);
  const progress = section === 'shop'
    ? <>Снарядов <b>{owned.length} / {ITEMS.length}</b></>
    : <>Уровней <b>{totalLevels}</b></>;
  return (
    <div className="training" style={{ '--cat': info.color } as CSSProperties}>
      <div className="section-heading"><div><div className="eyebrow">{info.eyebrow}</div><h2>{info.title}</h2></div><span className="roster-progress"><ClubIcon name={info.icon} /> {progress}</span></div>
      <div className="shop">
        <nav className="shop-cats" aria-label="Разделы тренировки">
          {SECTIONS.map((s) => <button key={s.id} className={`cat ${section === s.id ? 'on' : ''}`} aria-pressed={section === s.id} style={{ '--c': s.color } as CSSProperties} onClick={() => { setSection(s.id); if (s.id === 'gym') setPlace('map'); }}><span className="cat-icon"><ClubIcon name={s.icon} /></span><span className="cat-name">{s.name}</span>{s.id === 'shop' && canBuySomething(coins, owned, gym) && <i className="dot" />}</button>)}
        </nav>
        {section === 'gym' && (place === 'map'
          ? <TrainingDistrict affordable={canBuySomething(coins, owned, gym)} onEnter={(id) => id === 'shop' ? setSection('shop') : setPlace(id)} />
          : <Gym key={place} place={place} onMap={() => setPlace('map')} toShop={() => setSection('shop')} onStart={setPlaying} />)}
        {section === 'shop' && <Shop onMap={() => { setSection('gym'); setPlace('map'); }} />}
        {section === 'stats' && <Stats toGym={() => setSection('gym')} />}
      </div>
      {playing && <TrainingGame ex={playing} onClose={() => setPlaying(null)} />}
    </div>
  );
}

function Gym({ place, onMap, toShop, onStart }: { place: PlaceId; onMap: () => void; toShop: () => void; onStart: (ex: ExerciseDef) => void }) {
  const owned = useGame((s) => s.owned);
  const gym = useGame((s) => s.gym);
  const fatigue = useGame((s) => s.fatigue);
  const levels = useGame((s) => s.levels);
  const xp = useGame((s) => s.xp);
  const [selId, setSelId] = useState('pushups');
  const list = EXERCISES.filter((e) => e.place === place);
  const sel = list.find((e) => e.id === selId) ?? list[0];
  const can = canDo(sel, owned, gym);
  const gains = setGains(sel, 'ok', fatigue);
  return (
    <>
      <section className="training-center" aria-label={`Упражнения: ${PLACES[place].name}`}>
        <div className="training-label">
          <div className="place-switch" role="group" aria-label="Место">
            <button className="place-btn" onClick={onMap}>← На карту</button><strong className="place-name">{place === 'home' ? 'Гараж' : PLACES[place].name}</strong>
          </div>
          <small>ОПЫТ ×{PLACES[place].tier.toFixed(1)} {place === 'home' ? '· БЕСПЛАТНО' : gym ? '· ПО КЛУБНОЙ КАРТЕ' : '· НУЖНА КЛУБНАЯ КАРТА'}</small>
        </div>
        <TrainingRoom place={place} selected={sel.id} onPick={setSelId} />
      </section>
      <aside className="shop-detail card" aria-label="Выбранное упражнение" aria-live="polite">
        <div className="detail-heading"><span className="eyebrow">МИНИ-ИГРА: {GAME_NAMES[sel.game].toUpperCase()}</span><span className="detail-category"><ClubIcon name="body" /></span></div>
        <h3>{sel.name}</h3>
        <p className="detail-desc">{sel.item ? itemById(sel.item).desc : 'Без снарядов — можно всегда.'}</p>
        <div className="detail-art"><span className="art-rays" /><ExerciseArt ex={sel} /><b className="lvl">СНАРЯД ×{sel.tier}</b></div>
        <div className="detail-effect">
          {gains.map((g, i) => <div key={g.stat} className={i === 0 ? 'next-effect' : ''}><span>{statName(g.stat)} · {i === 0 ? 'основной' : 'побочный'} · ур. {levels[g.stat]} · опыт {xp[g.stat]} / {xpToNext(upgradeById(g.stat), levels[g.stat])}</span><b>+{g.xp} опыта · свежесть {pct(freshness(fatigue[g.stat] ?? 0))}<FreshnessArt sets={fatigue[g.stat] ?? 0} /></b>{(fatigue[g.stat] ?? 0) >= 3 && <small>Стат устал — бой сбросит усталость</small>}</div>)}
        </div>
        <button className="btn big" disabled={!can} onClick={() => onStart(sel)}>{can ? <>Сделать подход<ClubIcon name="arrow" /></> : <><ClubIcon name="lock" />Закрыто</>}</button>
        <p className="purchase-note">
          {!can
            ? <>{sel.place === 'gym' && !gym ? 'Нужна клубная карта качалки. ' : ''}{sel.item && !owned.includes(sel.item) ? `Нужен снаряд «${itemById(sel.item).name}». ` : ''}<button className="link-btn" onClick={toShop}>В лавку</button></>
            : 'Опыт — «Норм». «Отлично» даёт ×1.3, «Слабо» ×0.6. Следующий подход на тот же стат слабее, бой снимает перетрен.'}
        </p>
      </aside>
    </>
  );
}

type Goods = ItemId | 'gym';

function Shop({ onMap }: { onMap: () => void }) {
  const coins = useGame((s) => s.coins);
  const owned = useGame((s) => s.owned);
  const gym = useGame((s) => s.gym);
  const buyItem = useGame((s) => s.buyItem);
  const buyGym = useGame((s) => s.buyGym);
  const [selId, setSelId] = useState<Goods>('gym');
  const [popId, setPopId] = useState<Goods | null>(null);
  const [mood, setMood] = useState<'shopkeeper' | 'shopkeeper_happy' | 'shopkeeper_doubt'>('shopkeeper');
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (reactionTimer.current) clearTimeout(reactionTimer.current); }, []);
  const isOwned = (id: Goods) => (id === 'gym' ? gym : owned.includes(id));
  const priceOf = (id: Goods) => (id === 'gym' ? GYM_MEMBERSHIP : itemById(id).price);
  const price = priceOf(selId);
  const have = isOwned(selId);
  const affordable = coins >= price;
  const doBuy = () => {
    if (reactionTimer.current) clearTimeout(reactionTimer.current);
    const success = selId === 'gym' ? buyGym() : buyItem(selId);
    setMood(success ? 'shopkeeper_happy' : 'shopkeeper_doubt');
    reactionTimer.current = setTimeout(() => { setMood('shopkeeper'); setPopId(null); }, 1100);
    if (!success) return;
    sfx.ui.buy();
    setPopId(selId);
  };
  const needsGym = selId !== 'gym' && !gym && placesOf(selId).every((p) => p === 'gym');
  return (
    <>
      <section className="training-center" aria-label="Товары лавки">
        <div className="training-label"><button className="place-btn" onClick={onMap}>← На карту</button><small>ПОКУПКА НАВСЕГДА</small></div>
        <div className="training-scene shop-scene"><TrainingArtImage className="scene-bg" src={sceneArt('room_shop')} label="Лавка" /><div className="shopkeeper"><TrainingArtImage src={sceneArt(mood)} label="Продавец" /><svg className="shopkeeper-blink" viewBox="0 0 1024 1536" aria-hidden="true"><path d="M511 277 Q538 269 568 280 M638 296 Q649 291 664 300" fill="none" stroke="#eda252" strokeWidth="21" /><path d="M512 282 Q537 292 568 284 M638 300 Q650 307 664 302" fill="none" stroke="#5c3020" strokeWidth="4" /></svg></div><p className="shop-speech" role="status">{mood === 'shopkeeper_happy' ? 'Забирай, снаряд твой!' : mood === 'shopkeeper_doubt' ? 'Монет маловато. Выиграй ещё бой.' : 'Подбирай снаряд — хват станет крепче.'}</p></div>
        <div className="shop-grid dense">
          {(['gym', ...ITEMS.map((i) => i.id)] as Goods[]).map((id) => <GoodsCard key={id} id={id} selected={id === selId} owned={isOwned(id)} can={!isOwned(id) && coins >= priceOf(id)} pop={popId === id} onPick={() => setSelId(id)} />)}
        </div>
      </section>
      <aside className={`shop-detail card ${popId === selId ? 'purchased' : ''}`} aria-label="Выбранный товар" aria-live="polite">
        <div className="detail-heading"><span className="eyebrow">{selId === 'gym' ? 'КАЧАЛКА «ЖЕЛЕЗО»' : placesOf(selId).map((p) => PLACES[p].name.toUpperCase()).join(' И ')}</span><span className="detail-category"><ClubIcon name="bag" /></span></div>
        <h3>{selId === 'gym' ? 'Клубная карта' : itemById(selId).name}</h3>
        <p className="detail-desc">{selId === 'gym' ? 'Пускают в качалку навсегда: блок, брусья и ручки на блок. Опыт ×1.0 вместо ×0.7 дома.' : itemById(selId).desc}</p>
        <div className="detail-art"><span className="art-rays" /><GoodsArt id={selId} className={popId === selId ? 'pop' : ''} />{have && <b className="lvl">КУПЛЕНО</b>}</div>
        <div className="detail-effect">
          {(selId === 'gym' ? EXERCISES.filter((e) => e.place === 'gym' && !e.item) : exercisesOf(selId)).map((e) => <div key={e.id}><span>{e.name} · {PLACES[e.place].name}</span><b>{[e.primary, e.secondary].filter((s): s is UpgradeId => !!s).map(statName).join(' + ')} · снаряд ×{e.tier}</b></div>)}
        </div>
        <button className={`btn big ${affordable || have ? '' : 'poor'}`} data-sfx="none" disabled={have} onClick={doBuy}>{have ? <><ClubIcon name="check" />Куплено</> : <>Купить<span className="buy-price"><span className="coin" />{fmt(price)}</span></>}</button>
        <p className={`purchase-note ${have || affordable ? '' : 'shortfall'}`}>{have ? 'Уже твоё.' : !affordable ? `Не хватает ${fmt(price - coins)} монет. Выиграй ещё бой.` : needsGym ? 'Работает только в качалке — понадобится клубная карта.' : 'Покупка остаётся с тобой навсегда.'}</p>
      </aside>
    </>
  );
}

/** Спрайт снаряда из лавки; пока его нет — рисунок стата, который он качает (клубная карта — значок зала). */
function GoodsArt({ id, className = '' }: { id: Goods; className?: string }) {
  const src = itemArt(id === 'gym' ? 'gym_card' : id);
  if (src) return <TrainingArtImage className={`goods-img ${className}`} src={src} label={id === 'gym' ? 'Клубная карта' : itemById(id).name} />;
  return id === 'gym' ? <span className={`goods-icon ${className}`}><ClubIcon name="body" /></span> : <UpgradeArt id={itemStat(id)} className={className} />;
}

/** Упражнение со снарядом показывает снаряд, без снаряда — стат. */
function ExerciseArt({ ex, className = '' }: { ex: ExerciseDef; className?: string }) {
  return ex.item && itemArt(ex.item) ? <GoodsArt id={ex.item} className={className} /> : <UpgradeArt id={ex.primary} className={className} />;
}

function GoodsCard({ id, selected, owned, can, pop, onPick }: { id: Goods; selected: boolean; owned: boolean; can: boolean; pop: boolean; onPick: () => void }) {
  const name = id === 'gym' ? 'Клубная карта' : itemById(id).name;
  const price = id === 'gym' ? GYM_MEMBERSHIP : itemById(id).price;
  return (
    <button className={`ucard ${selected ? 'on' : ''} ${can ? 'can' : ''} ${pop ? 'pop' : ''}`} aria-pressed={selected} aria-label={`${name}, ${owned ? 'куплено' : `${fmt(price)} монет`}`} onClick={onPick}>
      <span className="ucard-top"><span>{id === 'gym' ? 'ЗАЛ' : placesOf(id).map((p) => (p === 'home' ? 'ДОМ' : 'ЗАЛ')).join(' + ')}</span>{(selected || owned) && <ClubIcon name="check" />}</span>
      <GoodsArt id={id} className="ucard-icon" /><span className="ucard-name">{name}</span>
      <span className="ucard-bottom"><small>{owned ? 'КУПЛЕНО' : 'ТОВАР'}</small><span className="ucard-price">{owned ? '✓' : <><span className="coin" />{fmt(price)}</>}</span></span>
    </button>
  );
}

function Stats({ toGym }: { toGym: () => void }) {
  const levels = useGame((s) => s.levels);
  const xp = useGame((s) => s.xp);
  const [selId, setSelId] = useState<UpgradeId>('biceps');
  const sel = upgradeById(selId);
  const level = levels[selId];
  const maxed = level >= sel.maxLevel;
  const ways = EXERCISES.filter((e) => e.primary === selId || e.secondary === selId);
  return (
    <>
      <section className="training-center" aria-label="Статы">
        <div className="training-label"><span><ClubIcon name="stats" />Уровень растёт от опыта подходов</span><small>ВЫБЕРИ СТАТ</small></div>
        <div className="shop-grid dense">
          {UPGRADES.map((u) => {
            const l = levels[u.id];
            const top = l >= u.maxLevel;
            const need = xpToNext(u, l);
            return (
              <button key={u.id} className={`ucard ${u.id === selId ? 'on' : ''}`} aria-pressed={u.id === selId} aria-label={`${u.name}, уровень ${l} из ${u.maxLevel}`} onClick={() => setSelId(u.id)}>
                <span className="ucard-top"><span>УР. {l} / {u.maxLevel}</span>{u.id === selId && <ClubIcon name="check" />}</span>
                <UpgradeArt id={u.id} className="ucard-icon" /><span className="ucard-name">{u.name}</span>
                <span className="ucard-lvl" role="progressbar" aria-label={`Опыт до уровня: ${u.name}`} aria-valuemin={0} aria-valuemax={need} aria-valuenow={xp[u.id]}><i style={{ width: top ? '100%' : `${(xp[u.id] / need) * 100}%` }} /></span>
                <span className="ucard-bottom"><small>ОПЫТ</small><span className="ucard-price">{top ? 'МАКС.' : `${xp[u.id]} / ${need}`}</span></span>
              </button>
            );
          })}
        </div>
      </section>
      <aside className="shop-detail card" aria-label="Выбранный стат" aria-live="polite">
        <div className="detail-heading"><span className="eyebrow">КАК КАЧАТЬ</span><span className="detail-category"><ClubIcon name="stats" /></span></div>
        <h3>{sel.name}</h3><p className="detail-desc">{sel.desc}</p>
        <div className="detail-art"><span className="art-rays" /><UpgradeArt id={selId} /><b className="lvl">УРОВЕНЬ {level} / {sel.maxLevel}</b></div>
        <div className="detail-effect"><div><span>Сейчас</span><b>{sel.effect(level)}</b></div>{!maxed && <div className="next-effect"><span>На следующем уровне</span><b>{sel.effect(level + 1)}</b></div>}</div>
        <p className="purchase-note">Упражнения: {ways.map((e) => `${e.name}${e.primary === selId ? '' : ' (½)'}`).join(', ')}.</p>
        <button className="btn big" onClick={toGym}>В зал<ClubIcon name="arrow" /></button>
      </aside>
    </>
  );
}

/** Основная и побочная свежесть имеют отдельные подсказки, как и отдельный опыт. */
function FreshnessArt({ sets }: { sets: number }) {
  if (!sets) return null;
  return <span className={`freshness-art ${sets >= 2 ? 'tired' : ''}`} aria-hidden="true">{Array.from({ length: sets === 2 ? 2 : 1 }, (_, i) => <TrainingArtImage key={i} src={fxArt(sets >= 3 ? 'steam' : 'sweat')} label="Усталость" />)}</span>;
}
