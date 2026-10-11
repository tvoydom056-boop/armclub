/**
 * Общее для сцены и проверок в Node (tools/characterValidation.mjs): размеры шаблонов спрайтов, лица,
 * точки свободной руки. Всё — в px шаблона. JS, а не TS: его без сборки читают тесты и dev-сервер.
 */
export const TEMPLATE = {
  torso: { x: 1572, y: 1001 },
  head: { x: 600, y: 700 },
  armFree: { x: 560, y: 620 },
  cuff: { x: 151, y: 151 },
  armsMotion: { x: 1670, y: 941 },
};
export const HEAD_KEYS = ['calm', 'strain', 'telegraph', 'tired', 'lose', 'win', 'press'];
/** Свободная рука: origin — где рукав входит под торс, grip — где кулак держит штырь (одинаково у всех). */
export const FREE_ANCHORS ={ origin: { x: 60, y: 45 }, grip: { x: 501, y: 493 } };
