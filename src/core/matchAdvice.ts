import { TUNING, type EndReason, type MatchMetrics } from './match';

export interface MatchAdvice {
  id: string;
  title: string;
  text: string;
}

const seconds = (n: number) => n.toFixed(1).replace('.', ',');

/** Наблюдения, а не диагноз: без данных не приписываем игроку ошибки. */
export function matchAdvice(reason: EndReason, metrics: MatchMetrics | null): MatchAdvice[] {
  if (reason === 'foul') return [{
    id: 'foul', title: 'Борьба не началась',
    text: 'Два нажатия до «ГО!» завершили матч. За фол монеты не выдаются, перетрен остаётся. Дождись сигнала в следующем бою.',
  }];
  const advice: MatchAdvice[] = [];
  if (reason === 'time') advice.push({
    id: 'time', title: 'Решение по позиции руки',
    text: `Через ${TUNING.maxTime} секунд выигрывает тот, на чьей стороне перевес. Ровно в центре победа засчитывается тебе.`,
  });
  if (!metrics) return advice;
  const observations = [
    { id: 'stamina', duration: metrics.lowStaminaSeconds, minimum: 2, title: 'Выносливость ниже 20%',
      text: `Выносливость была низкой ${seconds(metrics.lowStaminaSeconds)} с: клики давали меньше силы. Делай короткую паузу в кликах, чтобы восстановиться.` },
    { id: 'press', duration: metrics.weakPressSeconds, minimum: 1, title: 'Пресс из слабой позиции',
      text: `${seconds(metrics.weakPressSeconds)} с пресс работал со штрафом. Сначала доведи маркер до отметки пресса или левее неё.` },
    { id: 'counter', duration: metrics.counteredSeconds, minimum: 2, title: 'Соперник контрил твою технику',
      text: `${seconds(metrics.counteredSeconds)} с твоя техника была под контрой. Смотри на его следующий хват и подбирай ответ кнопками 1 · 2 · 3.` },
    { id: 'switch', duration: metrics.switchingSeconds, minimum: 1, title: 'Время на перестройку',
      text: `${seconds(metrics.switchingSeconds)} с действовал штраф смены техники. Переключайся под конкретный хват соперника, а не после каждого клика.` },
    { id: 'rest', duration: metrics.oppRestSeconds - metrics.oppRestPressedSeconds, minimum: 1, title: 'Пауза соперника не использована',
      text: `Соперник выдыхался ${seconds(metrics.oppRestSeconds)} с и давил вполсилы, а ты жал только ${seconds(metrics.oppRestPressedSeconds)} с. В его паузе дави без остановки.` },
  ].filter((item) => item.duration >= item.minimum).sort((a, b) => b.duration - a.duration);
  advice.push(...observations.map(({ id, title, text }) => ({ id, title, text })));
  if (!advice.length && metrics.counterSeconds >= 1) advice.push({
    id: 'good-counter', title: 'Ты использовал контртехнику',
    text: `${seconds(metrics.counterSeconds)} с ты давил с преимуществом по технике. Продолжай следить за сменой хвата и запасом выносливости.`,
  });
  if (!advice.length && metrics.oppRestPressedSeconds >= 1) advice.push({
    id: 'good-rest', title: 'Ты использовал паузу соперника',
    text: `${seconds(metrics.oppRestPressedSeconds)} с ты давил, пока он выдыхался. Так и выигрывают у тех, кто выдыхается по расписанию.`,
  });
  return advice.slice(0, 2);
}
