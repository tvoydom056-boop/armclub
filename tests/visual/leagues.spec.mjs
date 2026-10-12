import { test, expect } from '@playwright/test';

async function isolateFighterArt(page) {
  await page.waitForFunction(() => !!window.__arm);
  // Эти тесты проверяют интерфейс и сохранение карьеры. Риг и спрайты проверяются отдельно:
  // создание текстур бойца в программном WebGL может блокировать браузерную приёмку.
  await page.evaluate(() => {
    window.__arm.useArt = () => {};
    window.__arm.renderFrame = () => {};
  });
}

async function seed(page, patch = {}) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async (patch) => {
    const { useGame } = await import('/src/store/game.ts');
    useGame.getState().resetSave();
    useGame.setState(patch);
  }, patch);
  await expect(page.getByRole('heading', { name: 'Твоя карьера' })).toBeVisible();
  await isolateFighterArt(page);
}

/** Результат проходит через тот же мост Phaser → React, что и настоящий бой. */
async function endBout(page, id, won = true) {
  await page.evaluate(async ({ id, won }) => {
    const { bus } = await import('/src/game/bus.ts');
    bus.emit('match:end', { oppId: id, result: won ? 'won' : 'lost', reason: 'pin', time: 12, clicks: 50 });
  }, { id, won });
  await expect(page.locator('.modal')).toBeVisible();
}

test('новая карьера: отбор, закрытые лиги и тренировка доступны с понятными условиями', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await seed(page);
  await expect(page.getByRole('button', { name: 'В бой: Дядя Боря', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Лева: закрыт', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Войти в турнир' })).toBeDisabled();
  await page.getByRole('button', { name: /Городская лига Нужен/ }).click();
  await expect(page.getByRole('button', { name: 'Дэнч: закрыт', exact: true })).toBeDisabled();
  await expect(page.locator('.league-description')).toContainText('Выиграй переходный турнир');
  await page.getByRole('button', { name: /Подвальная лига Лига открыта/ }).click();
  await page.screenshot({ path: 'artifacts/leagues/start.png' });
  // Проверяем, что карточки и кнопка турнира помещаются в сцену.
  const clipping = await page.evaluate(() => {
    const stage = document.querySelector('.stage').getBoundingClientRect();
    return [...document.querySelectorAll('.league-opps .opp, .league-tournament, .career-rule')].some((node) => {
      const box = node.getBoundingClientRect();
      return box.bottom > stage.bottom + 1 || box.right > stage.right + 1;
    });
  });
  expect(clipping).toBe(false);
  await page.getByRole('button', { name: 'В бой: Дядя Боря', exact: true }).click();
  await expect(page.locator('.hud')).toBeVisible();
  await endBout(page, 'boris');
  await page.getByRole('button', { name: 'Дальше: Лева' }).click();
  await endBout(page, 'leva');
  await expect(page.locator('.modal')).toContainText('Открыт турнир');
  await expect(page.getByRole('button', { name: 'Дальше: Дэнч' })).toHaveCount(0);
  await page.getByRole('button', { name: 'К лигам', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Войти в турнир' })).toBeEnabled();
  await page.getByRole('button', { name: 'Тренировка', exact: true }).click();
  await expect(page.locator('.training-district')).toBeVisible();
  expect(errors).toEqual([]);
});

test('полуфинал сохраняется после перезагрузки, финал открывает городскую лигу', async ({ page }) => {
  test.setTimeout(90_000); // Три загрузки всех текстур Phaser в одном сценарии.
  await seed(page, { wins: { boris: 1, leva: 1 } });
  await page.getByRole('button', { name: 'Войти в турнир' }).click();
  await expect(page.locator('.hud')).toBeVisible();
  await endBout(page, 'boris');
  await expect(page.locator('.modal')).toContainText('Впереди финал');
  await expect(page.getByRole('button', { name: 'Реванш', exact: true })).toHaveCount(0);
  await page.reload();
  await isolateFighterArt(page);
  await expect(page.getByRole('button', { name: 'Продолжить турнир' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Тренировка', exact: true })).toBeDisabled();
  await page.screenshot({ path: 'artifacts/leagues/semifinal.png' });
  expect(await page.evaluate(() => {
    const panel = document.querySelector('.league-tournament').getBoundingClientRect();
    const actions = document.querySelector('.tournament-actions').getBoundingClientRect();
    return actions.bottom <= panel.bottom;
  })).toBe(true);
  await page.getByRole('button', { name: 'Продолжить турнир' }).click();
  await endBout(page, 'leva');
  await expect(page.getByRole('heading', { name: 'КУБОК ТВОЙ!' })).toBeVisible();
  await expect(page.locator('.modal')).toContainText('Открыта городская лига');
  await page.screenshot({ path: 'artifacts/leagues/promotion.png' });
  await page.getByRole('button', { name: 'В следующую лигу', exact: true }).click();
  await expect(page.getByRole('button', { name: 'В бой: Дэнч', exact: true })).toBeEnabled();
  await expect(page.locator('.roster-progress')).toContainText('1 / 3');
  await page.reload();
  await isolateFighterArt(page);
  await expect(page.getByRole('button', { name: 'В бой: Дэнч', exact: true })).toBeEnabled();
});

test('поражение в финале и добровольный выход возвращают к подготовке', async ({ page }) => {
  await seed(page, { wins: { boris: 1, leva: 1 } });
  await page.getByRole('button', { name: 'Войти в турнир' }).click();
  await endBout(page, 'boris');
  await page.getByRole('button', { name: 'Финал: Лева', exact: true }).click();
  await endBout(page, 'leva', false);
  await expect(page.getByRole('heading', { name: 'ТУРНИР ОКОНЧЕН' })).toBeVisible();
  await page.getByRole('button', { name: 'К лигам', exact: true }).click();
  await expect(page.locator('.roster-progress')).toContainText('0 / 3');
  await page.getByRole('button', { name: 'Войти в турнир' }).click();
  await endBout(page, 'boris');
  await page.locator('.modal').getByRole('button', { name: 'Выйти из турнира', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Войти в турнир' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Тренировка', exact: true })).toBeEnabled();
});

test('последний кубок завершает карьеру и оставляет доступ к старым лигам', async ({ page }) => {
  await seed(page, { cups: ['basement', 'city'], wins: { boris: 1, leva: 1, dench: 1, vitalik: 1, ilya: 1, ermes: 1 } });
  await page.getByRole('button', { name: 'Войти в турнир' }).click();
  await endBout(page, 'ilya');
  await page.getByRole('button', { name: 'Финал: Ермес', exact: true }).click();
  await endBout(page, 'ermes');
  await expect(page.locator('.modal')).toContainText('Ты чемпион всех трёх лиг');
  await page.getByRole('button', { name: 'К лигам', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Карьера чемпиона' })).toBeVisible();
  await expect(page.locator('.roster-progress')).toContainText('3 / 3');
  await page.getByRole('button', { name: /Подвальная лига Кубок подвала/ }).click();
  await expect(page.getByRole('button', { name: 'В бой: Дядя Боря', exact: true })).toBeEnabled();
  await page.screenshot({ path: 'artifacts/leagues/champion.png' });
});
