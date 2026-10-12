# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: training.spec.mjs >> все 17 сцен и четыре механики в браузере
- Location: tests\visual\training.spec.mjs:89:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.training-game-canvas')
Expected: visible
Error: Target crashed 

Call log:
  - Expect "toBeVisible" locator('.training-game-canvas') with timeout 6000ms
  - waiting for locator('.training-game-canvas')
  - Target crashed

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { mkdirSync } from 'node:fs';
  3   | 
  4   | test.use({ actionTimeout: 20000, navigationTimeout: 20000 });
  5   | test.setTimeout(180000);
  6   | 
  7   | const out = 'artifacts/training';
  8   | const itemIds = ['jump_rope', 'gripper', 'strap', 'tricep_rope', 'fat_grip', 'roller', 'medball', 'cone', 'gripper_pro', 'eccentric', 'triple', 'multispin'];
  9   | const stats = ['biceps', 'wrist', 'fingers', 'pronation', 'triceps', 'shoulder', 'grip', 'stamina', 'explosive'];
  10  | const HOME = ['pushups', 'run', 'jump_rope', 'gripper', 'gripper_pro', 'strap_dumbbell', 'medball'];
  11  | const GYM = ['straight_bar', 'dips', 'tricep_rope', 'strap_block', 'fat_grip', 'roller', 'cone', 'eccentric', 'triple', 'multispin'];
  12  | const names = { pushups: 'Отжимания', run: 'Пробежка', jump_rope: 'Скакалка', gripper: 'Эспандер', gripper_pro: 'Эспандер «Капитан»', strap_dumbbell: 'Ремень с гантелью', medball: 'Броски медбола', straight_bar: 'Блок: прямая рукоять', dips: 'Брусья', tricep_rope: 'Блок: канат', strap_block: 'Блок: ремень', fat_grip: 'Блок: толстая ручка', roller: 'Блок: ролик', cone: 'Блок: коническая ручка', eccentric: 'Блок: эксцентрик', triple: 'Блок: три отверстия', multispin: 'Блок: мультиспин' };
  13  | 
  14  | async function fixture(page, patch = {}) {
  15  |   mkdirSync(out, { recursive: true });
  16  |   const base = { coins: 3000, levels: Object.fromEntries(stats.map((s) => [s, 0])), xp: Object.fromEntries(stats.map((s) => [s, 0])), owned: itemIds, gym: true, fatigue: {}, wins: {}, losses: 0, ...patch };
  17  |   await page.addInitScript((state) => localStorage.setItem('armwrestling-club-save', JSON.stringify({ state, version: 2 })), base);
  18  |   const errors = [];
  19  |   page.on('pageerror', (e) => errors.push(e.message));
  20  |   await page.goto('/');
  21  |   await page.getByRole('button', { name: 'Тренировка', exact: true }).click({ noWaitAfter: true });
  22  |   await expect(page.getByRole('region', { name: 'Карта района' })).toBeVisible();
  23  |   return errors;
  24  | }
  25  | async function activate(button, frozen) {
  26  |   if (frozen) await button.press('Enter'); else await button.click();
  27  | }
  28  | async function enter(page, place, frozen = false) {
  29  |   await activate(page.getByRole('button', { name: place === 'home' ? 'Гараж' : 'Качалка «Железо»', exact: true }), frozen);
  30  |   if (frozen) await page.clock.runFor(650);
  31  |   await expect(page.locator(`.room-${place}`)).toBeVisible();
  32  | }
  33  | async function pick(page, id, frozen = false) {
  34  |   const button = ['strap_block', 'fat_grip', 'roller', 'cone', 'eccentric', 'triple', 'multispin'].includes(id)
  35  |     ? page.getByRole('button', { name: `Ручка: ${names[id]}`, exact: true })
  36  |     : page.getByRole('button', { name: names[id], exact: true });
  37  |   await activate(button, frozen);
  38  |   await activate(page.getByRole('button', { name: 'Сделать подход' }), frozen);
  39  |   await expect(page.getByRole('button', { name: 'Начать', exact: true })).toBeEnabled({ timeout: 30000 });
  40  |   await activate(page.getByRole('button', { name: 'Начать', exact: true }), frozen);
  41  |   await expect(page.locator('.tgame-countdown')).toBeVisible();
  42  |   if (frozen) await page.clock.runFor(3100);
> 43  |   await expect(page.locator('.training-game-canvas')).toBeVisible({ timeout: 6000 });
      |                                                       ^ Error: expect(locator).toBeVisible() failed
  44  |   await expect(page.locator('.training-game-canvas')).toHaveAttribute('data-ready', 'true');
  45  |   if (!frozen) await page.waitForTimeout(100);
  46  | }
  47  | async function snap(page, name) { await page.screenshot({ path: `${out}/${name}.png`, fullPage: true }); }
  48  | async function state(page) { return page.evaluate(async () => (await import('/src/store/game.ts')).useGame.getState().fatigue); }
  49  | async function freeze(page) {
  50  |   await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
  51  |   await page.clock.pauseAt(new Date('2030-01-02T00:00:00Z'));
  52  | }
  53  | async function pixels(page, rect = [0, 0, 1536, 1024]) {
  54  |   return page.locator('.training-game-canvas').evaluate((c, area) => {
  55  |     const data = c.getContext('2d').getImageData(...area).data;
  56  |     let hash = 2166136261;
  57  |     for (const byte of data) hash = Math.imul(hash ^ byte, 16777619);
  58  |     return hash >>> 0;
  59  |   }, rect);
  60  | }
  61  | 
  62  | test('карта, покупки, замок, реакции продавца и усталость', async ({ page }) => {
  63  |   const errors = await fixture(page, { coins: 100, gym: false, owned: [], fatigue: { stamina: 2, triceps: 2 } });
  64  |   await freeze(page);
  65  |   await expect(page.locator('.mark-chain')).toBeVisible(); await expect(page.locator('.mark-star')).toBeVisible(); await expect(page.locator('.mark-steam')).toBeVisible();
  66  |   await snap(page, 'map-locked');
  67  |   await page.getByRole('button', { name: 'Качалка «Железо»', exact: true }).press('Enter');
  68  |   await page.getByRole('button', { name: 'В лавку за картой' }).press('Enter');
  69  |   await page.getByRole('button', { name: 'Купить', exact: false }).press('Enter');
  70  |   await expect(page.locator('.shop-speech')).toHaveText('Забирай, снаряд твой!'); await snap(page, 'shop-success');
  71  |   await page.clock.runFor(1150);
  72  |   await expect(page.locator('.shop-speech')).toHaveText('Подбирай снаряд — хват станет крепче.');
  73  |   await page.getByRole('button', { name: 'Эспандер «Капитан», 220 монет', exact: true }).press('Enter');
  74  |   await page.getByRole('button', { name: 'Купить', exact: false }).press('Enter');
  75  |   await expect(page.locator('.shop-speech')).toHaveText('Монет маловато. Выиграй ещё бой.'); await snap(page, 'shop-poor');
  76  |   await page.getByRole('button', { name: '← На карту' }).press('Enter');
  77  |   await expect(page.locator('.mark-chain')).toHaveCount(0);
  78  |   await expect(page.locator('.mark-star')).toHaveCount(0);
  79  |   await enter(page, 'gym', true); await snap(page, 'room-gym-locked-items');
  80  |   await page.getByRole('button', { name: 'Армстол · 7 ручек', exact: true }).press('Enter');
  81  |   await expect(page.locator('.table-shelf button')).toHaveCount(7);
  82  |   await page.getByRole('button', { name: /Блок: ремень/ }).press('Enter');
  83  |   await expect(page.getByRole('button', { name: 'Закрыто', exact: true })).toBeDisabled();
  84  |   await page.getByRole('button', { name: 'В лавку', exact: true }).press('Enter');
  85  |   await expect(page.locator('.shop-scene')).toBeVisible();
  86  |   expect(errors).toEqual([]);
  87  | });
  88  | 
  89  | test('все 17 сцен и четыре механики в браузере', async ({ page }) => {
  90  |   test.setTimeout(600000);
  91  |   const errors = await fixture(page);
  92  |   await freeze(page);
  93  |   await snap(page, 'map-open');
  94  |   for (const [place, ids] of [['home', HOME], ['gym', GYM]]) {
  95  |     await enter(page, place, true); await snap(page, `room-${place}`);
  96  |     for (const id of ids) {
  97  |       await pick(page, id, true);
  98  |       await expect(page.getByRole('dialog')).toHaveAttribute('aria-label', `Подход: ${names[id]}`);
  99  |       const table = ['strap_block', 'fat_grip', 'roller', 'cone', 'eccentric', 'triple', 'multispin'].includes(id);
  100 |       const supports = table ? await pixels(page, [350, 700, 200, 150]) : null;
  101 |       await page.keyboard.press('Space');
  102 |       await page.clock.runFor(20);
  103 |       if (['gripper', 'gripper_pro', 'fat_grip'].includes(id)) {
  104 |         await page.clock.runFor(350);
  105 |         await page.keyboard.down('Space'); await page.clock.runFor(850); await snap(page, `${id}-effort`); await page.keyboard.up('Space');
  106 |         await page.clock.runFor(20);
  107 |       } else if (['run', 'jump_rope', 'medball'].includes(id)) {
  108 |         await expect(page.locator('.tgame-flash')).toContainText('Фальстарт');
  109 |         await page.clock.runFor(300);
  110 |         const waiting = id === 'run' ? null : await pixels(page);
  111 |         for (let i = 0; i < 20 && await page.locator('.tg-sign').textContent() !== 'ГО!'; i++) await page.clock.runFor(100);
  112 |         await expect(page.locator('.tg-sign')).toHaveText('ГО!');
  113 |         await snap(page, `${id}-signal`);
  114 |         if (waiting !== null) expect(await pixels(page), `${id}: один сигнал не меняет позу`).toBe(waiting);
  115 |         await page.keyboard.press('Space'); await page.clock.runFor(20); await snap(page, `${id}-hit`);
  116 |         if (waiting !== null) expect(await pixels(page), `${id}: ввод меняет позу`).not.toBe(waiting);
  117 |         if (id === 'run') {
  118 |           for (let i = 0; i < 75; i++) {
  119 |             if (await page.locator('.tg-sign').textContent() === 'ГО!') await page.keyboard.press('Space');
  120 |             await page.clock.runFor(100);
  121 |           }
  122 |           await snap(page, 'run-road-seam');
  123 |         }
  124 |       } else if (['roller', 'eccentric', 'multispin'].includes(id)) {
  125 |         await page.clock.runFor(700); await page.keyboard.press('Space'); await page.clock.runFor(20); await snap(page, `${id}-spin`);
  126 |       } else {
  127 |         for (let i = 0; i < 7; i++) await page.keyboard.press('Space');
  128 |         await page.clock.runFor(20);
  129 |         await snap(page, `${id}-effort`);
  130 |         for (let i = 0; i < 8; i++) await page.keyboard.press('Space');
  131 |         await page.clock.runFor(20);
  132 |         await expect(page.locator('.tg-pull')).toHaveClass(/stun/); await snap(page, `${id}-fail`);
  133 |       }
  134 |       if (table) expect(await pixels(page, [350, 700, 200, 150]), `${id}: стол стоит`).toBe(supports);
  135 |       await page.getByRole('button', { name: 'Выйти без опыта' }).press('Enter');
  136 |       expect(await state(page)).toEqual({});
  137 |     }
  138 |     await page.getByRole('button', { name: '← На карту' }).press('Enter');
  139 |   }
  140 |   expect(errors).toEqual([]);
  141 | });
  142 | 
  143 | test('отсутствующий кадр оставляет понятную сцену и рабочее управление', async ({ page }) => {
```