import { COUNTER, TECH_INFO } from '../core/techniques';
import { TUNING } from '../core/match';
import { useHud } from '../store/hud';
import { useSettings } from '../store/settings';

/** Подсказки следуют реальному матчу; их выполнение не даёт наград и не задерживает бой. */
export function MatchCoach() {
  const h = useHud();
  const disable = useSettings((s) => s.setCoachEnabled);
  const counter = COUNTER[h.oppNext ?? h.oppTech];
  const learned = [h.phase !== 'ready', h.metrics.counterSeconds >= 1,
    h.metrics.recoveredStamina >= .1, h.metrics.strongPressSeconds >= 1];
  const step = learned.findIndex((done) => !done);
  let message = 'Основы освоены. Следи за хватом соперника и береги выносливость.';
  if (step === 0) message = 'Дождись «ГО!», затем кликай или нажимай ПРОБЕЛ. Два фальстарта — фол без награды.';
  if (step === 1) message = counter === 'press' && h.position < h.pressGate
    ? 'Пресс контрит топролл, но пока слаб из-за позиции. Доберись до отметки пресса; у других хватов выбирай ответ по подписи кнопки.'
    : `Ответь на ${h.oppNext ? 'следующий' : 'текущий'} хват: ${TECH_INFO[counter].name}, клавиша ${TECH_INFO[counter].key}. Удержи преимущество хотя бы секунду.`;
  if (step === 2) message = `Сделай паузу в кликах: через ${String(TUNING.idleAfter).replace('.', ',')} с начнётся восстановление. Попробуй вернуть 10% шкалы, когда соперник ослаб.`;
  if (step === 3) message = h.position >= h.pressGate
    ? h.oppTech === 'hook' || h.oppNext === 'hook'
      ? 'Позиция для пресса готова, но Боря использует или готовит крюк — контру прессу. Дождись подходящего хвата.'
      : 'Позиция для пресса готова. Нажми 3 и дави; следи, чтобы соперник не ответил крюком.'
    : 'Пресс усиливается у золотой отметки и левее неё. Сначала получи позицию крюком или топроллом.';
  return <div className="match-coach">
    <div className="coach-heading"><b>Основы с Борей · {learned.filter(Boolean).length}/4</b><button type="button" onClick={(e) => { disable(false); e.currentTarget.blur(); }} aria-label="Скрыть подсказки в бою">Скрыть</button></div>
    <p role="status">{message}</p>
  </div>;
}
