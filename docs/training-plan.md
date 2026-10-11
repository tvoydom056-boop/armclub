# План: тренировки вместо покупки уровней (размер M)

> Сейчас уровень стата покупается за монеты (`buy` в `src/store/game.ts`, цены в `src/core/upgrades.ts`).
> Делаем как в Punch Club: монеты тратятся на снаряды, ручки и клубную карту качалки, а уровень стата приходит только через тренировку.
> Тренировка — мини-игра на 10 секунд, она даёт опыт стату. **Дневной энергии нет** (решение 2026-10-11, §10).

## 0. Что взяли из ресёрча

| Источник | Что берём | Что не берём |
|---|---|---|
| Punch Club 1: тренажёры в гараже и в зале Сильвера (вход $10), снаряды для дома продаются в спортивном магазине | Три места: **дом** бесплатно, но снаряды слабее; **качалка** по клубной карте, там сильнее; **бар** — спарринг | Энергию и дни, голод, сон по часам, скуку, падение статов. В research.md уже записано, что падение статов игроки ненавидят, и в PC2 его убрали |
| Punch Club: подходы на один и тот же снаряд подряд дают всё меньше (перетрен, сбрасывается за 1–2 дня) | Мягкий перетрен **между боями**: каждый следующий подход на тот же стат даёт меньше, а бой сбрасывает счётчик | Перетрен длиной в несколько дней (запутывает, а игроки его обходят) |
| Punch Club 2: множители тренировки ×1.5 и ×0.75 от «софта» | Тир снаряда и ручки — множитель опыта | — |
| Реальный армрестлинг: ручки на блок (коническая, эксцентрик, ролик, ручка с тремя отверстиями ArmSport UltraGrip), ремни, кистевые эспандеры | Каждая ручка — свой набор статов. Узнаваемо для тех, кто тренируется, и понятно новичку | Точную биомеханику: упрощаем до одного–двух статов на ручку |

Главная мысль, которая держит всё остальное: **`levels` остаются единственным входом для `deriveStats`**. Матч, `match.ts` и баланс ботов не меняются: меняется только способ, которым растёт уровень (раньше монеты, теперь опыт).

## 1. Кор-луп

```
бой с соперником  → монеты, перетрен сброшен
лавка             → монеты уходят на снаряды и клубную карту
подходы           → мини-игра 10 с → опыт стату (каждый следующий на тот же стат слабее)
спарринг (T5)     → 10 монет партнёру → опыт статам техники
```

Ограничитель — не энергия, а **перетрен**: после 2–3 подходов на один стат выгоднее сменить снаряд или сходить в бой.
Тупика нет: дома всегда можно тренироваться бесплатно (отжимания, пробежка), а бои бесплатные.

## 2. Места

| Место | Вход | Что там | Чем хорошо |
|---|---|---|---|
| **Дом (гараж)** | бесплатно | Без покупок: отжимания (трицепс) и пробежка (выносливость). Свои снаряды из лавки: эспандеры, ремень с гантелью, скакалка, медбол | Бесплатно, но тир места ×0.7 |
| **Качалка «Железо»** | клубная карта, 100 монет один раз | Блочный тренажёр (на него вешаются **твои** ручки из лавки, без ручки — прямая рукоять на трицепс), брусья | Тир ×1.0, ручки на блок работают только здесь |
| **Бар «Яма»** (T5) | 10 монет партнёру за спарринг | Спарринг: 10 секунд борьбы с завсегдатаем на настоящем ядре матча | Опыт сразу двум статам выбранной техники, и это живая практика |

## 3. Лавка «Арм-лавка» (магазин ручек и снарядов)

Покупка навсегда. Предмет открывает упражнение, у каждого упражнения свои статы и своя механика мини-игры (§5).
Статы — существующие `UpgradeId`, новых не вводим.

| id | Предмет | Где работает | Статы (основной + побочный) | Мини-игра | Тир | Цена (старт) |
|---|---|---|---|---|---|---|
| `jump_rope` | Скакалка | дом | выносливость + взрывной старт | Взрыв | 1.0 | 30 |
| `gripper` | Кистевой эспандер | дом | хват | Сжатие | 1.0 | 40 |
| `strap` | Ремень-петля на кисть | дом (с гантелью), зал (с блоком) | бицепс + запястье | Тяга | 1.0 | 60 |
| `tricep_rope` | Канат для трицепса | зал | трицепс | Тяга | 1.25 | 90 |
| `fat_grip` | Толстая ручка | зал | хват + пальцы | Сжатие | 1.0 | 100 |
| `roller` | Ролик-рукоять | зал | пальцы + пронация | Вращение | 1.0 | 120 |
| `medball` | Медбол | дом | взрывной старт | Взрыв | 1.0 | 140 |
| `cone` | Коническая ручка | зал | бицепс | Тяга | 1.5 | 150 |
| `gripper_pro` | Эспандер «Капитан» (жёсткий) | дом | хват | Сжатие | 1.5 | 220 |
| `eccentric` | Эксцентрик-ручка | зал | запястье (каппинг) + пальцы | Вращение | 1.25 | 250 |
| `triple` | Ручка с тремя отверстиями | зал | плечо + трицепс (боковое давление) | Тяга | 1.25 | 300 |
| `multispin` | Мультиспин | зал | пронация + запястье | Вращение | 1.5 | 400 |

Клубная карта качалки (100) продаётся там же, но это не предмет: флаг `gym` в сохранении.
Бесплатные упражнения: дома отжимания (трицепс, тир 0.8) и пробежка (выносливость, 0.8), в зале прямая рукоять на блоке (трицепс, 1.0) и брусья (трицепс + плечо, 1.0).
Чем дороже ручка, тем выше её тир. Поэтому коническая ручка за 150 обгоняет ремень за 60 по бицепсу, хотя ремень заодно качает запястье.
Покрытие: у каждого из 9 статов есть путь не дороже 150 монет (проверяет `src/core/training.test.ts`). Данные — `src/core/training.ts`.

## 4. Опыт и уровни

```
опыт за подход = 10 × тир места × тир снаряда × оценка × свежесть × доля стата
```

- **Тир места:** дом 0.7, зал 1.0. Спарринг считается отдельно (§5.5).
- **Тир снаряда:** 0.8 (без снаряда) … 1.5 (дорогие ручки), см. таблицу §3.
- **Оценка мини-игры:** «Слабо» 0.6, «Норм» 1.0, «Отлично» 1.3. Счётчик на экране, чтобы было видно, за что.
- **Свежесть:** 1-й подход на этот стат после боя 1.0, 2-й 0.75, 3-й 0.55, дальше 0.4. Бой сбрасывает. Подталкивает чередовать снаряды и бои.
- **Доля стата:** основной стат 1.0, побочный 0.5.
- **Порог уровня:** `xpToNext(level) = ceil(baseCost / 2 × growth^level)`. `baseCost`/`growth`/`maxLevel` из `UPGRADES` переиспользуем, кривая знакомая и уже отбалансирована. Опыт сверх порога переходит в следующий уровень.
- **Падения статов нет.**

Ориентир: бицепс 0→1 стоит 10 опыта, это один нормальный подход. 10→11 стоит ≈40 опыта, это 3–4 подхода. Числа — стартовые, дальше подгоняем таблицей баланса (§8, этап T7).

## 5. Мини-игры (10 секунд)

Пять механик на все упражнения, чтобы каждый снаряд ощущался по-разному, а кода было мало. Оценка — доля времени или попаданий в «хорошей» зоне.

1. **Тяга** (блок, ремень, канат, коническая, тройная ручка, отжимания, брусья). Клики поднимают полоску нагрузки, она сама падает. Держи её в зелёной зоне. Выше красной линии — срыв: полоска падает в ноль, 1 секунда паузы.
2. **Вращение** (ролик, эксцентрик, мультиспин). Метроном с ускорением: клик в такт крутит рукоять. Точность попаданий даёт оценку.
3. **Сжатие** (эспандеры, толстая ручка). Зажми пробел или кнопку мыши — полоска растёт. Отпусти в узкой зоне пика. Повторяй. Чем ближе к центру, тем лучше.
4. **Взрыв** (скакалка, медбол, пробежка). Случайные сигналы «ГО!», кликай как можно быстрее после сигнала. Это прямая тренировка «взрывного старта» из матча.
5. **Спарринг** (бар, T5). 10 секунд на ядре `match.ts` против партнёра на 70–90 % твоей силы. Игрок выбирает технику, за которую идёт опыт (крюк → бицепс и запястье, топролл → пальцы и пронация, пресс → трицепс и плечо). Оценка по итоговой позиции руки. Оба стата получают полный опыт, цена — 10 монет партнёру.

Управление то же, что в матче: клик или пробел.

## 6. Сохранение и миграция

`SaveData` (`src/core/save.ts`) = прежние `coins`, `levels`, `wins`, `losses` + `xp`, `owned: ItemId[]`, `gym: boolean`, `fatigue` (подходы на стат с последнего боя).
`persist.version: 1 → 2`. `migrateSave` собирает сохранение по полям: старые `levels` остаются как есть, `xp` = 0, неизвестные снаряды и лишние поля отбрасываются.

## 7. Архитектура (файлы)

| Файл | Что меняется |
|---|---|
| `src/core/training.ts` (T1) | Предметы, упражнения, `canDo`, `setGains`, `xpToNext`, `applyXp`; действия `buyItem`, `buyGym`, `trainSet` как чистые функции над `TrainingState`. Чистый TS |
| `src/core/training.test.ts` (T1) | Покрытие статов, переход уровней, свежесть, покупки, подходы |
| `src/core/save.ts` (T2) | `SaveData`, `freshSave`, `migrateSave` — схема сохранения и перенос старых версий (вместе с переносом побед Вити → Йос). Тесты — `save.test.ts` |
| `src/core/trainingGames.ts` (T4) | Пять мини-игр как `step(state, input, dt)` + `grade(state)` — в том же стиле, что `match.ts`, без React |
| `src/core/upgrades.ts` | Тексты `desc` под тренировку. `deriveStats` **не трогаем** |
| `src/store/game.ts` (T2) | `buyItem`, `buyGym`, `train(exerciseId, grade)`; `finishMatch` сбрасывает перетрен. Старый `buy` уходит в T3 вместе с витриной |
| `src/ui/Hub.tsx` (T3) | Вкладка «Тренировка» становится тремя подвкладками: **Зал** (места → упражнения), **Лавка**, **Статы** (опыт и эффект, переиспользуем `effect()` и `UpgradeArt`) |
| `src/ui/TrainingGame.tsx` (T4) | Оверлей мини-игры на React + rAF, рисует состояние из `trainingGames.ts`. Спарринг (T5) запускает существующую `MatchScene` в режиме «10 с, партнёр» |
| `public/art/training/` (T6) | Спрайты из §9. Пока их нет — SVG-заглушки, как было с ареной |

## 8. Этапы

| Этап | Что | Готово, когда |
|---|---|---|
| T1 ✅ | `core/training.ts` и тесты | `npx vitest run` зелёный. У каждого стата есть путь прокачки, опыт за подход считается по формуле §4 |
| T2 ✅ | Стор: опыт, снаряды, клубная карта, миграция | Старое сохранение открывается с теми же уровнями. Бой сбрасывает перетрен |
| T3 ✅ | UI: Лавка, места, Статы (на заглушках) — `src/ui/Training.tsx`; до T4 подход засчитывается кнопкой с оценкой «Норм» | Можно купить ручку и клубную карту, зайти в зал и увидеть упражнения |
| T4 | Мини-игры 1–4 | Каждая проходится за 10 с, оценка совпадает с ощущением. Опыт капает в стат |
| T5 | Спарринг на ядре матча (после T1–T4 и T6) | 10-секундный бой с партнёром даёт опыт двум статам. До этого этапа бара в списке мест нет |
| T6 | Спрайты из §9 | Лавка, места и мини-игры на нарисованном арте |
| T7 | Баланс | Бот-симуляция «бой → подходы»: лига v2 проходится за разумное число циклов. Таблица в `match.test.ts` остаётся в коридоре 20–60 с |

## 9. Спрайты: промты для GPT

Порядок как в [art-brief.md](art-brief.md) §0: к каждому запросу прикладывать `docs/art-reference/style_fighter.webp` и `target_scene.webp`, а в начало промта вставлять блок стиля из art-brief §1 (ниже он повторён).
Предметы лавки рисуем **одной сеткой**, затем режем: так у них гарантированно один масштаб и одна манера. Если GPT путает предметы — генерировать по одному, приложив первую готовую иконку как эталон.

**Блок стиля (в начало каждого промта):**

```
Flat vector cartoon illustration in the style of a bold American comic poster.
Thick dark brown outline (#3b1d14) of even weight around every shape.
Flat color fills with exactly two shading tones (one mid shadow, one deep shadow) as hard-edged shapes,
a few small light highlight shapes, light hatching texture on skin and hair only.
Saturated warm palette: tan skin, maroon, orange, cream.
No gradients, no glow, no photo texture, no painterly blur, no text, no logos, no cast shadow, no background.
Light comes from above-front. Match the attached style reference exactly.
```

### 9.1 Иконки предметов лавки — `public/art/training/items/<id>.png`, 512×512, прозрачные

**Сетка 1 (6 предметов):**

```
[STYLE BLOCK]
A sprite sheet of 6 armwrestling training items on a flat #FF00FF background, arranged in a 3×2 grid,
each item centered in its own equal 512×512 cell with generous empty margin, same scale and same 3/4 top-front view, no overlap:
1) a jump rope with red rubber handles, coiled loosely;
2) a simple spring hand gripper with two orange plastic handles and a steel spring;
3) a wrist strap loop for armwrestling: a thick black nylon strap with a steel D-ring and a carabiner;
4) a triceps rope cable attachment: thick braided black rope with two rubber end stoppers and a steel clip in the middle;
5) a fat grip: a thick chunky cylindrical orange rubber sleeve wrapped around a short steel bar;
6) an armwrestling roller handle: a knurled steel cylinder that spins on an axle inside a U-shaped steel bracket with a hook ring on top.
Chunky, slightly exaggerated cartoon proportions so each item reads at 64 px. No hands, no people.
```

**Сетка 2 (6 предметов):**

```
[STYLE BLOCK]
A sprite sheet of 6 armwrestling training items on a flat #FF00FF background, arranged in a 3×2 grid,
each item centered in its own equal 512×512 cell with generous empty margin, same scale and same 3/4 top-front view as the attached first sheet, no overlap:
1) a heavy leather medicine ball, maroon with cream stitched seams;
2) an armwrestling cone handle: a cone-shaped steel grip, wide at the bottom and narrow at the top, with a swivel hook ring;
3) a heavy-duty "captain" style hand gripper: thick knurled steel handles, a fat black spring, battle-worn look;
4) an armwrestling eccentric handle: a thick steel grip mounted off-center on a round steel disc, with a carabiner;
5) a triple-hole armwrestling handle: a flat thick steel plate with three round finger holes in a row and a hook ring;
6) a multispin armwrestling handle: a round steel wheel with a grip bar across it, mounted on a rotating swivel.
Chunky, slightly exaggerated cartoon proportions so each item reads at 64 px. No hands, no people.
```

**Клубная карта качалки (один предмет):**

```n[STYLE BLOCK]
A single game UI icon on a flat #FF00FF background, centered with generous margin, same scale and view as the item sheets:
a gym membership card: a thick cream plastic card with rounded corners, a maroon dumbbell silhouette on it and a hole punched in one corner with a short steel ring (no letters, no numbers).
```

### 9.2 Места — `public/art/training/places/`, 2560×1440, без прозрачности

Эти фоны идут под карточки в хабе, поэтому центр должен быть спокойным.

```
[STYLE BLOCK, but WITH background]
Background illustration, 16:9, 2560×1440. A cramped home garage turned into a gym:
concrete floor, a worn rug, a dumbbell rack, a homemade armwrestling table from old planks, a hanging bare light bulb,
a pull-up bar on the wall, a calendar and a poster silhouette of a flexing arm (no text).
Keep the central 50% of the image calm and low-detail (cards will be placed on top). Warm evening light. No people.
```
→ `home.png`

```
[STYLE BLOCK, but WITH background]
Background illustration, 16:9, 2560×1440. An old-school iron gym "Zhelezo": brick walls painted maroon,
a cable pulley machine (crossover) on the left, a professional armwrestling table with a low cable pulley on the right,
dip bars, chalk dust on the floor, rubber floor tiles, fluorescent ceiling lights. Keep the center calm and low-detail.
No people, no text, no logos.
```
→ `gym.png`

```
[STYLE BLOCK, but WITH background]
Background illustration, 16:9, 2560×1440. A tiny armwrestling gear shop: wooden counter in the foreground,
wall pegboard behind it full of steel handles, straps, grippers and ropes hanging on hooks, a shelf with protein tubs (no labels),
a vintage cash register on the counter. Keep the area above the counter clear for a shopkeeper character. No people, no text.
```
→ `shop.png`

### 9.3 Продавец лавки — `public/art/training/shopkeeper.png`, 1000×1200, прозрачный

Сначала концепт в полный рост, как в sprite-spec §2 шаг 1. Потом поясной кадр за прилавком.

```
[STYLE BLOCK]
Half-body character on a flat #FF00FF background, 1000×1200, visible from the waist up as if standing behind a counter (cut flat at the waist).
A retired armwrestling veteran running a gear shop: about 60 years old, bald with a thick grey walrus mustache,
one massive right forearm much bigger than the left, rolled-up sleeves of a maroon flannel shirt, a leather apron,
a pencil behind his ear, leaning on the counter with both fists, sly friendly grin. Parody character, not a real person.
```

### 9.4 Мини-игры от первого лица — `public/art/training/games/`, 2560×1440, прозрачный верх

На каждый тип мини-игры — две картинки: покой и пик усилия. Пик делается **правкой** покоя («то же самое, меняем только…»), иначе кадры не совпадут.
Рука игрока — та же, что в бою: загорелая, с напульсником. Приложить `public/art/me/free_grip.png` как эталон руки.

**Тяга (блок + ручка):**

```
[STYLE BLOCK]
First-person view, 2560×1440, flat #FF00FF background. The player's own right arm (tan skin, the same wristband as in the attached hand reference)
enters from the bottom-right corner and grips a steel armwrestling cone handle attached to a cable that goes up and away
to a pulley at the top-left. Arm relaxed, elbow on a padded table edge at the bottom of the frame. Only the arm, cable, handle and table edge.
```
Затем правка: `Same image, change only the arm: the hand is pulled in toward the camera, wrist curled inward (cupped), biceps bulging, veins visible, the cable is taut.` → `pull_rest.png`, `pull_peak.png`.
Ручка на картинке — коническая. Остальные ручки код подставит поверх кисти иконкой из §9.1, поэтому отдельные кадры на каждую ручку не нужны.

**Вращение (ролик):**

```
[STYLE BLOCK]
First-person view, 2560×1440, flat #FF00FF background. The player's own right hand (same wristband as the attached reference)
grips a knurled steel roller handle from above with the fingertips, the roller is hanging on a cable. Wrist neutral.
```
Правка: `Same image, change only the hand: fingers rolled over the top of the roller, wrist pronated (turned inward), knuckles white with effort.` → `roll_rest.png`, `roll_peak.png`.

**Сжатие (эспандер):**

```
[STYLE BLOCK]
First-person view, 2560×1440, flat #FF00FF background. The player's own right hand (same wristband as the attached reference),
palm facing the camera, holds an open spring hand gripper at chest height. Fingers relaxed.
```
Правка: `Same image, change only the hand and the gripper: the gripper is squeezed fully closed, fingers white at the knuckles, forearm tendons visible, small sweat drops.` → `squeeze_rest.png`, `squeeze_peak.png`.

**Взрыв (медбол):**

```
[STYLE BLOCK]
First-person view, 2560×1440, flat #FF00FF background. Both of the player's hands (same wristband on the right one) hold a maroon leather medicine ball
close to the chest at the bottom of the frame, ready to throw.
```
Правка: `Same image, the arms are fully extended forward and the ball is flying away from the hands toward the center of the frame, motion lines behind the ball.` → `burst_rest.png`, `burst_peak.png`.

Спарринг отдельного арта не требует: он идёт на сцене боя. Партнёр — один из уже нарисованных бойцов v2 со своим фоном.

### 9.5 Проверка спрайтов

- Иконки: при уменьшении до 64 px каждый предмет узнаётся, а сетка режется на одинаковые ячейки без обрезанных краёв.
- Кадры покоя и пика совпадают по краю стола и по месту, откуда входит рука (наложить слоем с прозрачностью 50 %).
- Фон `#FF00FF` вырезается чисто, и пурпура нет в самих спрайтах.

## 10. Решения (2026-10-11)

1. **Дневной энергии нет.** Пользователь убрал её: шкала «40/100», дни, сон и расход энергии на бой и подход не нужны. Ограничитель тренировок — перетрен, и бой его сбрасывает. Поэтому цикл получается «бой → подходы → бой». Бои бесплатные, награды за бой не меняем.
2. **Качалка — клубная карта за 100 монет один раз** вместо оплаты за день и абонемента: без дней их не к чему привязать. «Домашний блок» и протеиновый коктейль убраны: первый был нужен только чтобы не платить за вход, второй восстанавливал энергию.
3. **Спарринг откладываем: сначала T1–T4 и T6, потом T5.** Спарринг требует режима в `MatchScene` (лимит 10 с, партнёр-бот, без награды, возврат в хаб). Это хрупкая сцена Phaser, а кор-луп работает и без спарринга. Бар появится в списке мест только на этапе T5.
4. **Ручки на блок работают только в зале.** Так у клубной карты есть смысл, а домашние снаряды остаются дешёвым стартом.