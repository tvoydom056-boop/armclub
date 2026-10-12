import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';

test.use({ actionTimeout: 20000, navigationTimeout: 20000 });
test.setTimeout(180000);

const out = 'artifacts/training';
const itemIds = ['jump_rope', 'gripper', 'strap', 'tricep_rope', 'fat_grip', 'roller', 'medball', 'cone', 'gripper_pro', 'eccentric', 'triple', 'multispin'];
const stats = ['biceps', 'wrist', 'fingers', 'pronation', 'triceps', 'shoulder', 'grip', 'stamina', 'explosive'];
const HOME = ['pushups', 'run', 'jump_rope', 'gripper', 'gripper_pro', 'strap_dumbbell', 'medball'];
const GYM = ['straight_bar', 'dips', 'tricep_rope', 'strap_block', 'fat_grip', 'roller', 'cone', 'eccentric', 'triple', 'multispin'];
const names = { pushups: 'Отжимания', run: 'Пробежка', jump_rope: 'Скакалка', gripper: 'Эспандер', gripper_pro: 'Эспандер «Капитан»', strap_dumbbell: 'Ремень с гантелью', medball: 'Броски медбола', straight_bar: 'Блок: прямая рукоять', dips: 'Брусья', tricep_rope: 'Блок: канат', strap_block: 'Блок: ремень', fat_grip: 'Блок: толстая ручка', roller: 'Блок: ролик', cone: 'Блок: коническая ручка', eccentric: 'Блок: эксцентрик', triple: 'Блок: три отверстия', multispin: 'Блок: мультиспин' };

async function fixture(page, patch = {}) {
  mkdirSync(out, { recursive: true });
  const base = { coins: 3000, levels: Object.fromEntries(stats.map((s) => [s, 0])), xp: Object.fromEntries(stats.map((s) => [s, 0])), owned: itemIds, gym: true, fatigue: {}, wins: {}, losses: 0, ...patch };
  await page.addInitScript((state) => localStorage.setItem('armwrestling-club-save', JSON.stringify({ state, version: 2 })), base);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Тренировка', exact: true }).click({ noWaitAfter: true });
  await expect(page.getByRole('region', { name: 'Карта района' })).toBeVisible();
  return errors;
}
async function activate(button, frozen) {
  if (frozen) await button.press('Enter'); else await button.click();
}
async function enter(page, place, frozen = false) {
  await activate(page.getByRole('button', { name: place === 'home' ? 'Гараж' : 'Качалка «Железо»', exact: true }), frozen);
  if (frozen) await page.clock.runFor(650);
  await expect(page.locator(`.room-${place}`)).toBeVisible();
}
async function pick(page, id, frozen = false) {
  const button = ['strap_block', 'fat_grip', 'roller', 'cone', 'eccentric', 'triple', 'multispin'].includes(id)
    ? page.getByRole('button', { name: `Ручка: ${names[id]}`, exact: true })
    : page.getByRole('button', { name: names[id], exact: true });
  await activate(button, frozen);
  await activate(page.getByRole('button', { name: 'Сделать подход' }), frozen);
  await expect(page.getByRole('button', { name: 'Начать', exact: true })).toBeEnabled({ timeout: 30000 });
  await activate(page.getByRole('button', { name: 'Начать', exact: true }), frozen);
  await expect(page.locator('.tgame-countdown')).toBeVisible();
  if (frozen) await page.clock.runFor(3100);
  await expect(page.locator('.training-game-canvas')).toBeVisible({ timeout: 6000 });
  await expect(page.locator('.training-game-canvas')).toHaveAttribute('data-ready', 'true');
  if (!frozen) await page.waitForTimeout(100);
}
async function snap(page, name) { await page.screenshot({ path: `${out}/${name}.png`, fullPage: true }); }
async function state(page) { return page.evaluate(async () => (await import('/src/store/game.ts')).useGame.getState().fatigue); }
async function freeze(page) {
  await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2030-01-02T00:00:00Z'));
}
async function pixels(page, rect = [0, 0, 1536, 1024]) {
  return page.locator('.training-game-canvas').evaluate((c, area) => {
    const data = c.getContext('2d').getImageData(...area).data;
    let hash = 2166136261;
    for (const byte of data) hash = Math.imul(hash ^ byte, 16777619);
    return hash >>> 0;
  }, rect);
}

test('карта, покупки, замок, реакции продавца и усталость', async ({ page }) => {
  const errors = await fixture(page, { coins: 100, gym: false, owned: [], fatigue: { stamina: 2, triceps: 2 } });
  await freeze(page);
  await expect(page.locator('.mark-chain')).toBeVisible(); await expect(page.locator('.mark-star')).toBeVisible(); await expect(page.locator('.mark-steam')).toBeVisible();
  await snap(page, 'map-locked');
  await page.getByRole('button', { name: 'Качалка «Железо»', exact: true }).press('Enter');
  await page.getByRole('button', { name: 'В лавку за картой' }).press('Enter');
  await page.getByRole('button', { name: 'Купить', exact: false }).press('Enter');
  await expect(page.locator('.shop-speech')).toHaveText('Забирай, снаряд твой!'); await snap(page, 'shop-success');
  await page.clock.runFor(1150);
  await expect(page.locator('.shop-speech')).toHaveText('Подбирай снаряд — хват станет крепче.');
  await page.getByRole('button', { name: 'Эспандер «Капитан», 220 монет', exact: true }).press('Enter');
  await page.getByRole('button', { name: 'Купить', exact: false }).press('Enter');
  await expect(page.locator('.shop-speech')).toHaveText('Монет маловато. Выиграй ещё бой.'); await snap(page, 'shop-poor');
  await page.getByRole('button', { name: '← На карту' }).press('Enter');
  await expect(page.locator('.mark-chain')).toHaveCount(0);
  await expect(page.locator('.mark-star')).toHaveCount(0);
  await enter(page, 'gym', true); await snap(page, 'room-gym-locked-items');
  await page.getByRole('button', { name: 'Армстол · 7 ручек', exact: true }).press('Enter');
  await expect(page.locator('.table-shelf button')).toHaveCount(7);
  await page.getByRole('button', { name: /Блок: ремень/ }).press('Enter');
  await expect(page.getByRole('button', { name: 'Закрыто', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'В лавку', exact: true }).press('Enter');
  await expect(page.locator('.shop-scene')).toBeVisible();
  expect(errors).toEqual([]);
});

test('все 17 сцен и четыре механики в браузере', async ({ page }) => {
  test.setTimeout(600000);
  const errors = await fixture(page);
  await freeze(page);
  await snap(page, 'map-open');
  for (const [place, ids] of [['home', HOME], ['gym', GYM]]) {
    await enter(page, place, true); await snap(page, `room-${place}`);
    for (const id of ids) {
      await pick(page, id, true);
      await expect(page.getByRole('dialog')).toHaveAttribute('aria-label', `Подход: ${names[id]}`);
      const table = ['strap_block', 'fat_grip', 'roller', 'cone', 'eccentric', 'triple', 'multispin'].includes(id);
      const supports = table ? await pixels(page, [350, 700, 200, 150]) : null;
      await page.keyboard.press('Space');
      await page.clock.runFor(20);
      if (['gripper', 'gripper_pro', 'fat_grip'].includes(id)) {
        await page.clock.runFor(350);
        await page.keyboard.down('Space'); await page.clock.runFor(850); await snap(page, `${id}-effort`); await page.keyboard.up('Space');
        await page.clock.runFor(20);
      } else if (['run', 'jump_rope', 'medball'].includes(id)) {
        await expect(page.locator('.tgame-flash')).toContainText('Фальстарт');
        await page.clock.runFor(300);
        const waiting = id === 'run' ? null : await pixels(page);
        for (let i = 0; i < 20 && await page.locator('.tg-sign').textContent() !== 'ГО!'; i++) await page.clock.runFor(100);
        await expect(page.locator('.tg-sign')).toHaveText('ГО!');
        await snap(page, `${id}-signal`);
        if (waiting !== null) expect(await pixels(page), `${id}: один сигнал не меняет позу`).toBe(waiting);
        await page.keyboard.press('Space'); await page.clock.runFor(20); await snap(page, `${id}-hit`);
        if (waiting !== null) expect(await pixels(page), `${id}: ввод меняет позу`).not.toBe(waiting);
        if (id === 'run') {
          for (let i = 0; i < 75; i++) {
            if (await page.locator('.tg-sign').textContent() === 'ГО!') await page.keyboard.press('Space');
            await page.clock.runFor(100);
          }
          await snap(page, 'run-road-seam');
        }
      } else if (['roller', 'eccentric', 'multispin'].includes(id)) {
        await page.clock.runFor(700); await page.keyboard.press('Space'); await page.clock.runFor(20); await snap(page, `${id}-spin`);
      } else {
        for (let i = 0; i < 7; i++) await page.keyboard.press('Space');
        await page.clock.runFor(20);
        await snap(page, `${id}-effort`);
        for (let i = 0; i < 8; i++) await page.keyboard.press('Space');
        await page.clock.runFor(20);
        await expect(page.locator('.tg-pull')).toHaveClass(/stun/); await snap(page, `${id}-fail`);
      }
      if (table) expect(await pixels(page, [350, 700, 200, 150]), `${id}: стол стоит`).toBe(supports);
      await page.getByRole('button', { name: 'Выйти без опыта' }).press('Enter');
      expect(await state(page)).toEqual({});
    }
    await page.getByRole('button', { name: '← На карту' }).press('Enter');
  }
  expect(errors).toEqual([]);
});

test('отсутствующий кадр оставляет понятную сцену и рабочее управление', async ({ page }) => {
  await page.route('**/art/training/games/gripper_*.png', (route) => route.abort());
  const errors = await fixture(page);
  await enter(page, 'home');
  await page.getByRole('button', { name: 'Эспандер', exact: true }).click();
  await page.getByRole('button', { name: 'Сделать подход' }).click();
  await page.getByRole('button', { name: 'Начать', exact: true }).click();
  await expect(page.locator('.scene-error')).toContainText('Шкала и управление работают.', { timeout: 6000 });
  await page.keyboard.down('Space');
  await expect(page.locator('.tg-squeeze p')).toHaveText('Держи… отпусти в цели');
  await page.keyboard.up('Space');
  await snap(page, 'missing-frame-fallback');
  await page.getByRole('button', { name: 'Выйти без опыта' }).click();
  expect(await state(page)).toEqual({}); expect(errors).toEqual([]);
});

test('отсчёт, удержание/отмена, результат, повтор, опыт и возврат в бой', async ({ page }) => {
  const errors = await fixture(page, { xp: Object.fromEntries(stats.map((s) => [s, s === 'triceps' ? 24 : 0])) });
  await enter(page, 'gym');
  await page.getByRole('button', { name: 'Брусья', exact: true }).click();
  await page.getByRole('button', { name: 'Сделать подход' }).click();
  await page.getByRole('button', { name: 'Начать', exact: true }).click();
  await page.keyboard.press('Space'); await snap(page, 'countdown');
  await expect(page.locator('.training-game-canvas')).toBeVisible({ timeout: 6000 });
  await expect(page.locator('.tgame-score')).toContainText('0%');
  await expect(page.locator('.tgame-result')).toBeVisible({ timeout: 13000 });
  await snap(page, 'result-level');
  expect(await state(page)).toEqual({ triceps: 1, shoulder: 1 });
  await page.waitForTimeout(1200); expect(await state(page)).toEqual({ triceps: 1, shoulder: 1 });
  await page.getByRole('button', { name: 'Ещё подход' }).click();
  await expect(page.locator('.tgame-countdown')).toBeVisible();
  await page.getByRole('button', { name: 'Выйти без опыта' }).click();
  expect(await state(page)).toEqual({ triceps: 1, shoulder: 1 });
  await pick(page, 'dips');
  await expect(page.locator('.tgame-result')).toBeVisible({ timeout: 13000 });
  expect(await state(page)).toEqual({ triceps: 2, shoulder: 2 });
  await page.getByRole('button', { name: 'В бой', exact: true }).click();
  await expect(page.locator('.hub-fights')).toBeVisible();
  expect(errors).toEqual([]);
});

test('узкий экран, фокус станций и уменьшенное движение', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors = await fixture(page);
  await snap(page, 'mobile-map');
  await enter(page, 'home'); await snap(page, 'mobile-home');
  const sizes = await page.locator('.room-station').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [r.width, r.height, r.left, r.right]; }));
  for (const [w, h, left, right] of sizes) { expect(w).toBeGreaterThanOrEqual(44); expect(h).toBeGreaterThanOrEqual(44); expect(left).toBeGreaterThanOrEqual(0); expect(right).toBeLessThanOrEqual(390); }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await pick(page, 'gripper');
  await page.keyboard.down('Space'); await page.waitForTimeout(300);
  await page.locator('.tgame-field').dispatchEvent('pointercancel', { pointerId: 1 });
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.keyboard.up('Space');
  await page.waitForTimeout(100); await expect(page.locator('.tg-squeeze p')).not.toHaveText('Держи… отпусти в цели');
  await snap(page, 'mobile-reduced');
  await page.getByRole('button', { name: 'Выйти без опыта' }).click();
  expect(await state(page)).toEqual({}); expect(errors).toEqual([]);
});
