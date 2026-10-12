import { STYLES } from '../core/styles';
import { useGame } from '../store/game';

/** Боевой принцип перед боем: бесплатно и в любой момент вне матча. */
export function StylePicker() {
  const style = useGame((s) => s.style);
  const setStyle = useGame((s) => s.setStyle);
  return (
    <fieldset className="style-picker">
      <legend>Боевой принцип</legend>
      <div className="style-options">
        {STYLES.map((item) => (
          <button key={item.id} type="button" className={`style-option ${style === item.id ? 'selected' : ''}`} aria-pressed={style === item.id} onClick={() => setStyle(item.id)}>
            <b>{item.name}</b>
            {item.id === 'neutral'
              ? <small>Без плюсов и минусов</small>
              : <small><span className="plus">+ {item.plus}</span><span className="minus">− {item.minus}</span></small>}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
