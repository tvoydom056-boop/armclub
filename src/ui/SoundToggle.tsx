import { sfx } from '../audio/sfx';
import { useSettings } from '../store/settings';

/** Кнопка «звук вкл/выкл» (клавиша M) и, по желанию, ползунок громкости. */
export function SoundToggle({ slider = false }: { slider?: boolean }) {
  const muted = useSettings((s) => s.muted);
  const volume = useSettings((s) => s.volume);
  const toggleMute = useSettings((s) => s.toggleMute);
  const setVolume = useSettings((s) => s.setVolume);
  const off = muted || volume === 0;

  return (
    <div className="sound">
      <button
        className="sound-btn"
        data-sfx="none"
        title="Звук (M)"
        onClick={(e) => {
          toggleMute();
          // иначе ПРОБЕЛ (клик по сопернику) нажимал бы эту же кнопку
          e.currentTarget.blur();
          if (muted) sfx.ui.click();
        }}
      >
        {off ? '🔇' : '🔊'}
      </button>
      {slider && (
        <input
          className="sound-range"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={muted ? 0 : volume}
          title="Громкость"
          onChange={(e) => setVolume(Number(e.target.value))}
          onPointerUp={(e) => {
            sfx.ui.click();
            e.currentTarget.blur();
          }}
        />
      )}
    </div>
  );
}
