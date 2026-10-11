import type { Pt } from './layout';

/**
 * Манифест нарисованного персонажа: src/game/characters/<id>.json рядом со спрайтами public/art/opponents/<id>/.
 * Все точки — в px шаблона своего спрайта (что видно в любом редакторе картинок), а не в координатах сцены:
 * торс 1572×1001, голова 600×700, свободная рука 560×620. Картинка другого разрешения растягивается до шаблона.
 * Сцена сама ставит торс точкой shoulder на плечо рабочей руки, голову — точкой neck на шею торса.
 * Как добавить персонажа — docs/adding-opponent.md; подогнать точки — редактор ?rig=<id> в dev.
 */
export interface CharacterArt {
  /** Свой фон: имя PNG в папке персонажа без расширения. Нет — общий подвал. */
  bg?: string;
  torso: {
    /** px сцены на px шаблона 1572×1001 */
    scale: number;
    /** Куда входит рукав рабочей руки: эта точка торса стоит на плече листа рук. */
    shoulder: Pt;
    /** Основание шеи: сюда встаёт голова. */
    neck: Pt;
    /** Откуда растёт свободная рука. */
    freeShoulder: Pt;
  };
  head: {
    /** px сцены на px шаблона 600×700 */
    scale: number;
    /** Низ шеи на картинке головы. */
    neck: Pt;
    /**
     * Строки шаблона 600×700, где низ головы плавно гаснет (from — ещё видно, to — уже нет):
     * широкий обрубок шеи не ложится на одежду прямоугольником, под ним видна шея торса.
     */
    fade?: { from: number; to: number };
  };
  arms: {
    /** Размер связки рук (общий шаблон кадров ARM_POSES); захват остаётся на месте. */
    scale: number;
    /** Сдвиг захвата вниз в px сцены; торс и голова едут за плечом руки. */
    drop: number;
    /** Наклон кулака вниз на пути к нашему штырю (рад) и сдвиг захвата (px), который держит плечо на месте. */
    sag: { angle: number; drop: number };
  };
  freeArm: {
    /** px сцены на px шаблона 560×620 */
    scale: number;
  };
  /** Накладка на стык рукава и торса (cuff.png); нет — стык закрыт самим рисунком. */
  cuff?: { scale: number };
  /** Голова на карточке в хабе: ширина и сдвиг низа, em. */
  bust?: { width: number; bottom: number };
}

/** Размеры шаблонов, в которых заданы точки манифеста. */
export { TEMPLATE } from './characterSpec.mjs';

const files = import.meta.glob<CharacterArt>('./characters/*.json', { eager: true, import: 'default' });

/** Все персонажи с нарисованными спрайтами, по id (имя файла манифеста). */
export const CHARACTERS: Readonly<Record<string, CharacterArt>> = Object.fromEntries(
  Object.entries(files).map(([path, art]) => [path.replace(/^.*\/(.+)\.json$/, '$1'), art]),
);

export const characterArt = (id: string): CharacterArt | undefined => CHARACTERS[id];
