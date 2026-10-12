import { useEffect, useRef, useState } from 'react';
import { EXERCISES, GYM_MEMBERSHIP, canDo, freshness, itemById, type ExerciseDef, type PlaceId } from '../core/training';
import { upgradeById } from '../core/upgrades';
import { itemArt, mapArt, sceneArt, type MapArt } from '../game/trainingArt';
import { useGame } from '../store/game';
import { TrainingArtImage } from './TrainingArtImage';
import { placeIsTired, STATIONS, TABLE_IDS } from './trainingPlaces';
import './trainingDistrict.css';

const BUILDINGS = [
  { id: 'home', name: 'Гараж', x: .25, y: .70 }, { id: 'shop', name: 'Арм-лавка', x: .75, y: .70 },
  { id: 'gym', name: 'Качалка «Железо»', x: .72, y: .32 }, { id: 'bar', name: 'Бар «Яма»', x: .28, y: .32 },
] as const;
type Destination = 'home' | 'gym' | 'shop' | 'bar';

export function TrainingDistrict({ onEnter, affordable }: { onEnter: (id: Destination) => void; affordable: boolean }) {
  const { owned, gym, fatigue } = useGame();
  const [notice, setNotice] = useState('Выбери место на карте. Гараж открыт всегда.');
  const [walking, setWalking] = useState<Destination | null>(null);
  const moving = useRef<Destination | null>(null);
  const [position, setPosition] = useState({ x: .53, y: .64 });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const arrive = () => {
    const dest = moving.current;
    if (!dest) return;
    moving.current = null;
    if (timer.current) clearTimeout(timer.current);
    setWalking(null);
    onEnter(dest);
  };
  const enter = (id: typeof BUILDINGS[number]['id']) => {
    if (moving.current) return;
    if (id === 'gym' && !gym) { setNotice(`Нужна клубная карта за ${GYM_MEMBERSHIP} монет. Купить её можно в арм-лавке.`); return; }
    moving.current = id;
    setWalking(id);
    const dest = id === 'home' ? { x: .32, y: .83 } : id === 'shop' ? { x: .76, y: .86 } : id === 'bar' ? { x: .3, y: .46 } : { x: .76, y: .46 };
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    setPosition({ x: .53, y: .69 });
    timer.current = setTimeout(() => {
      setPosition(dest);
      timer.current = setTimeout(arrive, reduced ? 0 : 450);
    }, reduced ? 0 : 150);
  };
  return <section className="training-district" aria-label="Карта района">
    <div className="training-scene district-map">
      <TrainingArtImage className="scene-bg" src={sceneArt('map_base')} label="Район" />
      {BUILDINGS.map((b) => <button key={b.id} className="district-building" aria-label={b.name} aria-disabled={!!walking} style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%` }} onClick={() => enter(b.id)}>
        <TrainingArtImage src={mapArt(b.id)} label={b.name} />
        <span className="building-label">{b.name}{b.id === 'gym' && !gym ? ' · закрыто' : b.id === 'bar' ? ' · спарринг' : ''}</span>
        {b.id === 'gym' && !gym && <MapMark id="chain" />}
        {b.id === 'shop' && affordable && <MapMark id="star" />}
        {(b.id === 'home' || b.id === 'gym') && placeIsTired(b.id, owned, gym, fatigue) && <MapMark id="steam" />}
      </button>)}
      <TrainingArtImage className="district-player" src={mapArt('player')} label="Ты" style={{ left: `${position.x * 100}%`, top: `${position.y * 100}%` }} />
    </div>
    <div className="district-note" role="status">{walking ? 'Идём по дорожке…' : notice}</div>
    {walking && <button className="btn" onClick={arrive}>Пропустить прогулку</button>}
    {!gym && notice.includes('клубная карта') && <button className="btn" onClick={() => onEnter('shop')}>В лавку за картой</button>}
  </section>;
}

function MapMark({ id }: { id: MapArt }) {
  return <TrainingArtImage className={`map-mark mark-${id}`} src={mapArt(id)} label={id === 'chain' ? 'Замок' : id === 'star' ? 'Есть покупки' : id === 'steam' ? 'Статы устали' : 'Закрыто'} />;
}

export function TrainingRoom({ place, selected, onPick }: { place: PlaceId; selected: string; onPick: (id: string) => void }) {
  const { owned, gym, fatigue } = useGame();
  const [table, setTable] = useState(false);
  const description = (ex: ExerciseDef) => [ex.primary, ex.secondary].filter((s) => !!s).map((stat) => `${upgradeById(stat!).name}: свежесть ${Math.round(freshness(fatigue[stat!] ?? 0) * 100)}%`).join('; ');
  const pick = (id: string) => { if (id === 'table') setTable((v) => !v); else { setTable(false); onPick(id); } };
  return <>
    <div className={`training-scene room-${place}`} aria-label={place === 'home' ? 'Станции гаража' : 'Станции качалки'}>
      <TrainingArtImage className="scene-bg" src={sceneArt(`room_${place}`)} label={place === 'home' ? 'Гараж' : 'Качалка'} />
      {STATIONS[place].map((station) => {
        const ex = EXERCISES.find((e) => e.id === station.id);
        const open = !ex || canDo(ex, owned, gym);
        const label = ex?.name ?? 'Армстол · 7 ручек';
        return <button key={station.id} className={`room-station ${selected === station.id ? 'selected' : ''} ${open ? '' : 'locked'}`} style={{ left: `${station.x * 100}%`, top: `${station.y * 100}%` }} onClick={() => pick(station.id)} aria-label={label} title={ex ? `${description(ex)}${open ? '' : `; нужен ${ex.item ? itemById(ex.item).name : 'абонемент'}`}` : label}>
          {ex?.item && owned.includes(ex.item) && <TrainingArtImage className="station-item" src={itemArt(ex.item)} label={itemById(ex.item).name} />}
          <span>{label}{open ? '' : ' 🔒'}</span>
        </button>;
      })}
      {place === 'gym' && TABLE_IDS.map((id, i) => {
        const ex = EXERCISES.find((e) => e.id === id)!;
        return owned.includes(ex.item!) ? <button key={id} className="room-hook" style={{ left: `${69 + i * 4.1}%`, top: '31%' }} aria-label={`Ручка: ${ex.name}`} title={description(ex)} onClick={() => { setTable(false); onPick(id); }}><TrainingArtImage src={itemArt(ex.item!)} label={ex.name} /></button> : null;
      })}
    </div>
    {table && <div className="table-shelf" role="group" aria-label="Ручки армстола">{TABLE_IDS.map((id) => {
      const ex = EXERCISES.find((e) => e.id === id)!;
      const can = canDo(ex, owned, gym);
      return <button key={id} onClick={() => onPick(id)} className={selected === id ? 'selected' : ''} title={description(ex)}><TrainingArtImage src={can ? itemArt(ex.item!) : null} label="Пустое гнездо" /><b>{ex.name}</b><small>{can ? description(ex) : `${itemById(ex.item!).price} монет · в лавке`}</small></button>;
    })}</div>}
  </>;
}
