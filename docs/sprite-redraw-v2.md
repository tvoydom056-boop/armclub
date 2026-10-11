# Перерисовка торса и рук бойцов версии 2 по канону Бори

Задание для GPT (ChatGPT или Codex). Правила — [sprite-spec.md §0](sprite-spec.md#0-единый-стиль-культя-и-руки-как-у-бори).
Каждый промт собран целиком: стиль из art-brief §1, STYLE LOCK и задание. Копируется одним блоком.
Если поменялось правило в sprite-spec §0, блок STYLE LOCK обновить во всех промтах.

**Кого и что:** Лёва, Дэнч, Илья, Эрмес — `torso_motion`, `arms_motion`, `arm_free`, `cuff`. Головы не трогаем. Виталик уже соответствует правилу.

## Порядок для каждого бойца

1. **Торс.** Изображение 1 — `public/art/opponents/boris/torso_motion.png`, изображение 2 — `public/art/opponents/<id>/head_calm.png`.
   Старый торс бойца **не прикладывать**: он принесёт свой неправильный силуэт.
2. **Лист рук.** Изображение 1 — `boris/arms_motion.png`, 2 — `head_calm.png` бойца, 3 — новый торс из шага 1.
3. **Свободная рука.** Изображение 1 — `boris/arm_free.png`, 2 — `head_calm.png`, 3 — новый торс.
4. **Накладка.** Изображение 1 — `boris/cuff.png`, 2 — новый торс.
5. **Сверка до игры.** В Photopea или Krita положить слоем сверху подложку из `docs/art-reference/boris-guides/`.
   Контур рукава и руки должен лечь на пурпурную линию. Если не лёг, перегенерировать, а не подгонять ригом.
6. **Подключение.** Положить файлы в `public/art/opponents/<id>/` поверх старых (старые есть в git).
   Открыть `?rig=<id>` и выставить точки торса как у Бори: плечо (233.3, 682.7), шея (751.7, 214.5), свободное плечо (1070, 310).
   Точку шеи головы не трогать. Проверить шею: низ шеи головы должен уходить **под воротник** нового торса, а не лежать на одежде
   (так было у Эрмеса). Если лежит — включить «растворять низ шеи» и подогнать «с/до», чтобы шея гасла у воротника.
   Шея торса должна остаться на коже шеи торса. Если голова встала не там — «Подсказать точки по картинкам» даёт старт.
   Сохранить и посмотреть лист `?sheet=<id>`.
7. **Проверка.** Предупреждения «Контур культи не по Боре» у бойца быть не должно:
   ```
   npx vitest run tools/characters.test.mjs --reporter=verbose
   ```
8. **Эталон визуального теста.** Посмотреть лист глазами и записать новый эталон: `npm run test:visual:update`.

## Лёва (`leva`)

Эмблему на груди убираем: стиль запрещает логотипы. Полосы на рукаве остаются, это рисунок внутри контура.

### torso_motion.png

```
Flat vector cartoon illustration in the style of a bold American comic poster.
Thick dark brown outline (#3b1d14) of even weight around every shape.
Flat color fills with exactly two shading tones (one mid shadow, one deep shadow) as hard-edged shapes,
a few small light highlight shapes, light hatching texture on skin and hair only.
Saturated warm palette: tan skin, maroon, orange, cream.
No gradients, no glow, no photo texture, no painterly blur, no text, no logos, no cast shadow, no background.
Light comes from above-front. Match the attached style reference exactly.

STYLE LOCK — the canon is image 1 (Uncle Borya). Match image 1, not the concept art, wherever they disagree:
- The outer silhouette of the sleeve stump, upper arm, forearm and free arm is EXACTLY image 1's silhouette:
  same width, same bulges, same rolled sleeve cuff above the biceps. Change colors and textures INSIDE it only.
- The character wears a short or rolled sleeve that covers the shoulder exactly like image 1.
  No tank top, no bare shoulder, no flared, puffy or wider sleeve.
- Muscles are flat inner shadow wedges only; never widen the arm. No veins, no balloon biceps or delts.
- Same rendering as image 1: even dark-brown outline (#3b1d14) of the same thickness, flat fill + exactly two
  hard-edged shadow tones + a few small highlights. No gradients, no airbrush, no glossy 3D shading.
  Arm hair: a few short hatch strokes only. Black cloth is dark grey #2a2a2a with visible fold wedges.

Image 1 is the EDIT TARGET and the ONLY source of geometry: Uncle Borya's torso_motion.png, canvas 1572×1001.
Keep its canvas size and ratio, the pose, scale and transparent background, and the anchor points:
neck stump top at (752, 215), working-arm sleeve opening toward (233, 683), free shoulder at (1070, 310), flat cut at the bottom.
Image 2 is LEVA's approved head: take ONLY the skin tone of the neck from it.
Redraw image 1 as LEVA: TORSO ONLY, no head, no working arm, no free arm.
Replace the green hoodie with a bright yellow crew-neck t-shirt (base #f0d000, shadows #c8a400 and #9c7f00) with two short black diagonal stripes on the sleeve; no chest emblem, no lettering. Remove the hood and the drawstrings; crew neckline around the same neck stump.
Neck skin: tan skin (#e09050) with a few short dark hatch strokes of forearm hair.
The rolled sleeve on the working-arm shoulder (left side of the image) keeps image 1's hooked outline exactly; only its color and fabric change.
Do not move, rotate, resize or recrop anything. Do not add a background, shadow, text or checkerboard. Genuine transparent alpha.
```

### arms_motion.png

```
Flat vector cartoon illustration in the style of a bold American comic poster.
Thick dark brown outline (#3b1d14) of even weight around every shape.
Flat color fills with exactly two shading tones (one mid shadow, one deep shadow) as hard-edged shapes,
a few small light highlight shapes, light hatching texture on skin and hair only.
Saturated warm palette: tan skin, maroon, orange, cream.
No gradients, no glow, no photo texture, no painterly blur, no text, no logos, no cast shadow, no background.
Light comes from above-front. Match the attached style reference exactly.

STYLE LOCK — the canon is image 1 (Uncle Borya). Match image 1, not the concept art, wherever they disagree:
- The outer silhouette of the sleeve stump, upper arm, forearm and free arm is EXACTLY image 1's silhouette:
  same width, same bulges, same rolled sleeve cuff above the biceps. Change colors and textures INSIDE it only.
- The character wears a short or rolled sleeve that covers the shoulder exactly like image 1.
  No tank top, no bare shoulder, no flared, puffy or wider sleeve.
- Muscles are flat inner shadow wedges only; never widen the arm. No veins, no balloon biceps or delts.
- Same rendering as image 1: even dark-brown outline (#3b1d14) of the same thickness, flat fill + exactly two
  hard-edged shadow tones + a few small highlights. No gradients, no airbrush, no glossy 3D shading.
  Arm hair: a few short hatch strokes only. Black cloth is dark grey #2a2a2a with visible fold wedges.

Image 1 is the EDIT TARGET and the ONLY source of geometry: Uncle Borya's arms_motion.png, a 3×3 sheet of 9 poses, exactly 1670×941.
Keep the canvas, the grid, every pose, the clasped grip and the sleeve cuffs pixel-aligned with image 1.
OUR arm (with the red-and-white wristband, coming from the bottom right of each cell) stays completely unchanged in all 9 cells.
Image 2 is LEVA's approved head: skin tone only. Image 3 is LEVA's new torso_motion.png: sleeve color and fabric only.
Redraw ONLY the opponent's sleeve and skin in all 9 cells:
sleeve = bright yellow t-shirt sleeve (#f0d000) with two short black diagonal stripes; skin = tan skin (#e09050) with a few short dark hatch strokes of forearm hair.
In every cell the opponent's sleeve, upper arm and forearm keep image 1's outline exactly: same width, same rolled cuff.
Do not move, rotate, resize or recrop anything. Do not add a background, shadow, text or checkerboard. Genuine transparent alpha.
```

### arm_free.png

```
Flat vector cartoon illustration in the style of a bold American comic poster.
Thick dark brown outline (#3b1d14) of even weight around every shape.
Flat color fills with exactly two shading tones (one mid shadow, one deep shadow) as hard-edged shapes,
a few small light highlight shapes, light hatching texture on skin and hair only.
Saturated warm palette: tan skin, maroon, orange, cream.
No gradients, no glow, no photo texture, no painterly blur, no text, no logos, no cast shadow, no background.
Light comes from above-front. Match the attached style reference exactly.

STYLE LOCK — the canon is image 1 (Uncle Borya). Match image 1, not the concept art, wherever they disagree:
- The outer silhouette of the sleeve stump, upper arm, forearm and free arm is EXACTLY image 1's silhouette:
  same width, same bulges, same rolled sleeve cuff above the biceps. Change colors and textures INSIDE it only.
- The character wears a short or rolled sleeve that covers the shoulder exactly like image 1.
  No tank top, no bare shoulder, no flared, puffy or wider sleeve.
- Muscles are flat inner shadow wedges only; never widen the arm. No veins, no balloon biceps or delts.
- Same rendering as image 1: even dark-brown outline (#3b1d14) of the same thickness, flat fill + exactly two
  hard-edged shadow tones + a few small highlights. No gradients, no airbrush, no glossy 3D shading.
  Arm hair: a few short hatch strokes only. Black cloth is dark grey #2a2a2a with visible fold wedges.

Image 1 is the EDIT TARGET and the ONLY source of geometry: Uncle Borya's arm_free.png, canvas 560×620.
Keep the canvas, the arm pose and outline, the fist gripping the dark peg at (501, 493) and the sleeve top at (60, 45). The peg stays unchanged.
Image 2 is LEVA's approved head: skin tone only. Image 3 is LEVA's new torso_motion.png: sleeve color and fabric only.
Redraw ONLY the sleeve and the skin: sleeve = bright yellow t-shirt sleeve (#f0d000) with two short black diagonal stripes; skin = tan skin (#e09050) with a few short dark hatch strokes of forearm hair.
Same outline as image 1: same rolled sleeve cuff, same arm width, same fist.
Do not move, rotate, resize or recrop anything. Do not add a background, shadow, text or checkerboard. Genuine transparent alpha.
```

### cuff.png

```
Flat vector cartoon illustration in the style of a bold American comic poster.
Thick dark brown outline (#3b1d14) of even weight around every shape.
Flat color fills with exactly two shading tones (one mid shadow, one deep shadow) as hard-edged shapes,
a few small light highlight shapes, light hatching texture on skin and hair only.
Saturated warm palette: tan skin, maroon, orange, cream.
No gradients, no glow, no photo texture, no painterly blur, no text, no logos, no cast shadow, no background.
Light comes from above-front. Match the attached style reference exactly.

STYLE LOCK — the canon is image 1 (Uncle Borya). Match image 1, not the concept art, wherever they disagree:
- The outer silhouette of the sleeve stump, upper arm, forearm and free arm is EXACTLY image 1's silhouette:
  same width, same bulges, same rolled sleeve cuff above the biceps. Change colors and textures INSIDE it only.
- The character wears a short or rolled sleeve that covers the shoulder exactly like image 1.
  No tank top, no bare shoulder, no flared, puffy or wider sleeve.
- Muscles are flat inner shadow wedges only; never widen the arm. No veins, no balloon biceps or delts.
- Same rendering as image 1: even dark-brown outline (#3b1d14) of the same thickness, flat fill + exactly two
  hard-edged shadow tones + a few small highlights. No gradients, no airbrush, no glossy 3D shading.
  Arm hair: a few short hatch strokes only. Black cloth is dark grey #2a2a2a with visible fold wedges.

Image 1 is the EDIT TARGET and the ONLY source of geometry: Uncle Borya's cuff.png, canvas 151×151.
Image 2 is LEVA's new torso_motion.png: sleeve color and fabric only.
Recolor ONLY: the cuff becomes bright yellow t-shirt sleeve (#f0d000) with two short black diagonal stripes. Keep image 1's outline, size and position exactly.
Do not move, rotate, resize or recrop anything. Do not add a background, shadow, text or checkerboard. Genuine transparent alpha.
```

## Дэнч (`dench`)

Вместо майки — чёрная футболка. Крупное телосложение показываем грудью и трапецией под футболкой. Культя и руки остаются в Борином контуре.

### torso_motion.png

```
Flat vector cartoon illustration in the style of a bold American comic poster.
Thick dark brown outline (#3b1d14) of even weight around every shape.
Flat color fills with exactly two shading tones (one mid shadow, one deep shadow) as hard-edged shapes,
a few small light highlight shapes, light hatching texture on skin and hair only.
Saturated warm palette: tan skin, maroon, orange, cream.
No gradients, no glow, no photo texture, no painterly blur, no text, no logos, no cast shadow, no background.
Light comes from above-front. Match the attached style reference exactly.

STYLE LOCK — the canon is image 1 (Uncle Borya). Match image 1, not the concept art, wherever they disagree:
- The outer silhouette of the sleeve stump, upper arm, forearm and free arm is EXACTLY image 1's silhouette:
  same width, same bulges, same rolled sleeve cuff above the biceps. Change colors and textures INSIDE it only.
- The character wears a short or rolled sleeve that covers the shoulder exactly like image 1.
  No tank top, no bare shoulder, no flared, puffy or wider sleeve.
- Muscles are flat inner shadow wedges only; never widen the arm. No veins, no balloon biceps or delts.
- Same rendering as image 1: even dark-brown outline (#3b1d14) of the same thickness, flat fill + exactly two
  hard-edged shadow tones + a few small highlights. No gradients, no airbrush, no glossy 3D shading.
  Arm hair: a few short hatch strokes only. Black cloth is dark grey #2a2a2a with visible fold wedges.

Image 1 is the EDIT TARGET and the ONLY source of geometry: Uncle Borya's torso_motion.png, canvas 1572×1001.
Keep its canvas size and ratio, the pose, scale and transparent background, and the anchor points:
neck stump top at (752, 215), working-arm sleeve opening toward (233, 683), free shoulder at (1070, 310), flat cut at the bottom.
Image 2 is DENCH's approved head: take ONLY the skin tone of the neck from it.
Redraw image 1 as DENCH: TORSO ONLY, no head, no working arm, no free arm.
Replace the green hoodie with a plain black crew-neck t-shirt (base #2a2a2a, fold shadows #1c1c1c and #121212) with short sleeves; no logos, no lettering. Heavyweight broad chest and trapezius under the shirt. Remove the hood and the drawstrings; crew neckline around the same neck stump.
Neck skin: warm ochre skin (#f0a050), no visible hair.
The rolled sleeve on the working-arm shoulder (left side of the image) keeps image 1's hooked outline exactly; only its color and fabric change.
Do not move, rotate, resize or recrop anything. Do not add a background, shadow, text or checkerboard. Genuine transparent alpha.
```

### arms_motion.png

```
Flat vector cartoon illustration in the style of a bold American comic poster.
Thick dark brown outline (#3b1d14) of even weight around every shape.
Flat color fills with exactly two shading tones (one mid shadow, one deep shadow) as hard-edged shapes,
a few small light highlight shapes, light hatching texture on skin and hair only.
Saturated warm palette: tan skin, maroon, orange, cream.
No gradients, no glow, no photo texture, no painterly blur, no text, no logos, no cast shadow, no background.
Light comes from above-front. Match the attached style reference exactly.

STYLE LOCK — the canon is image 1 (Uncle Borya). Match image 1, not the concept art, wherever they disagree:
- The outer silhouette of the sleeve stump, upper arm, forearm and free arm is EXACTLY image 1's silhouette:
  same width, same bulges, same rolled sleeve cuff above the biceps. Change colors and textures INSIDE it only.
- The character wears a short or rolled sleeve that covers the shoulder exactly like image 1.
  No tank top, no bare shoulder, no flared, puffy or wider sleeve.
- Muscles are flat inner shadow wedges only; never widen the arm. No veins, no balloon biceps or delts.
- Same rendering as image 1: even dark-brown outline (#3b1d14) of the same thickness, flat fill + exactly two
  hard-edged shadow tones + a few small highlights. No gradients, no airbrush, no glossy 3D shading.
  Arm hair: a few short hatch strokes only. Black cloth is dark grey #2a2a2a with visible fold wedges.

Image 1 is the EDIT TARGET and the ONLY source of geometry: Uncle Borya's arms_motion.png, a 3×3 sheet of 9 poses, exactly 1670×941.
Keep the canvas, the grid, every pose, the clasped grip and the sleeve cuffs pixel-aligned with image 1.
OUR arm (with the red-and-white wristband, coming from the bottom right of each cell) stays completely unchanged in all 9 cells.
Image 2 is DENCH's approved head: skin tone only. Image 3 is DENCH's new torso_motion.png: sleeve color and fabric only.
Redraw ONLY the opponent's sleeve and skin in all 9 cells:
sleeve = plain black t-shirt sleeve (#2a2a2a) with visible fold wedges; skin = warm ochre skin (#f0a050), no visible hair.
In every cell the opponent's sleeve, upper arm and forearm keep image 1's outline exactly: same width, same rolled cuff.
Do not move, rotate, resize or recrop anything. Do not add a background, shadow, text or checkerboard. Genuine transparent alpha.
```

### arm_free.png

```
Flat vector cartoon illustration in the style of a bold American comic poster.
Thick dark brown outline (#3b1d14) of even weight around every shape.
Flat color fills with exactly two shading tones (one mid shadow, one deep shadow) as hard-edged shapes,
a few small light highlight shapes, light hatching texture on skin and hair only.
Saturated warm palette: tan skin, maroon, orange, cream.
No gradients, no glow, no photo texture, no painterly blur, no text, no logos, no cast shadow, no background.
Light comes from above-front. Match the attached style reference exactly.

STYLE LOCK — the canon is image 1 (Uncle Borya). Match image 1, not the concept art, wherever they disagree:
- The outer silhouette of the sleeve stump, upper arm, forearm and free arm is EXACTLY image 1's silhouette:
  same width, same bulges, same rolled sleeve cuff above the biceps. Change colors and textures INSIDE it only.
- The character wears a short or rolled sleeve that covers the shoulder exactly like image 1.
  No tank top, no bare shoulder, no flared, puffy or wider sleeve.
- Muscles are flat inner shadow wedges only; never widen the arm. No veins, no balloon biceps or delts.
- Same rendering as image 1: even dark-brown outline (#3b1d14) of the same thickness, flat fill + exactly two
  hard-edged shadow tones + a few small highlights. No gradients, no airbrush, no glossy 3D shading.
  Arm hair: a few short hatch strokes only. Black cloth is dark grey #2a2a2a with visible fold wedges.

Image 1 is the EDIT TARGET and the ONLY source of geometry: Uncle Borya's arm_free.png, canvas 560×620.
Keep the canvas, the arm pose and outline, the fist gripping the dark peg at (501, 493) and the sleeve top at (60, 45). The peg stays unchanged.
Image 2 is DENCH's approved head: skin tone only. Image 3 is DENCH's new torso_motion.png: sleeve color and fabric only.
Redraw ONLY the sleeve and the skin: sleeve = plain black t-shirt sleeve (#2a2a2a) with visible fold wedges; skin = warm ochre skin (#f0a050), no visible hair.
Same outline as image 1: same rolled sleeve cuff, same arm width, same fist.
Do not move, rotate, resize or recrop anything. Do not add a background, shadow, text or checkerboard. Genuine transparent alpha.
```

### cuff.png

```
Flat vector cartoon illustration in the style of a bold American comic poster.
Thick dark brown outline (#3b1d14) of even weight around every shape.
Flat color fills with exactly two shading tones (one mid shadow, one deep shadow) as hard-edged shapes,
a few small light highlight shapes, light hatching texture on skin and hair only.
Saturated warm palette: tan skin, maroon, orange, cream.
No gradients, no glow, no photo texture, no painterly blur, no text, no logos, no cast shadow, no background.
Light comes from above-front. Match the attached style reference exactly.

STYLE LOCK — the canon is image 1 (Uncle Borya). Match image 1, not the concept art, wherever they disagree:
- The outer silhouette of the sleeve stump, upper arm, forearm and free arm is EXACTLY image 1's silhouette:
  same width, same bulges, same rolled sleeve cuff above the biceps. Change colors and textures INSIDE it only.
- The character wears a short or rolled sleeve that covers the shoulder exactly like image 1.
  No tank top, no bare shoulder, no flared, puffy or wider sleeve.
- Muscles are flat inner shadow wedges only; never widen the arm. No veins, no balloon biceps or delts.
- Same rendering as image 1: even dark-brown outline (#3b1d14) of the same thickness, flat fill + exactly two
  hard-edged shadow tones + a few small highlights. No gradients, no airbrush, no glossy 3D shading.
  Arm hair: a few short hatch strokes only. Black cloth is dark grey #2a2a2a with visible fold wedges.

Image 1 is the EDIT TARGET and the ONLY source of geometry: Uncle Borya's cuff.png, canvas 151×151.
Image 2 is DENCH's new torso_motion.png: sleeve color and fabric only.
Recolor ONLY: the cuff becomes plain black t-shirt sleeve (#2a2a2a) with visible fold wedges. Keep image 1's outline, size and position exactly.
Do not move, rotate, resize or recrop anything. Do not add a background, shadow, text or checkerboard. Genuine transparent alpha.
```

## Илья (`ilya`)

Майку меняем на футболку того же цвета, геометрический камуфляж сохраняем.

### torso_motion.png

```
Flat vector cartoon illustration in the style of a bold American comic poster.
Thick dark brown outline (#3b1d14) of even weight around every shape.
Flat color fills with exactly two shading tones (one mid shadow, one deep shadow) as hard-edged shapes,
a few small light highlight shapes, light hatching texture on skin and hair only.
Saturated warm palette: tan skin, maroon, orange, cream.
No gradients, no glow, no photo texture, no painterly blur, no text, no logos, no cast shadow, no background.
Light comes from above-front. Match the attached style reference exactly.

STYLE LOCK — the canon is image 1 (Uncle Borya). Match image 1, not the concept art, wherever they disagree:
- The outer silhouette of the sleeve stump, upper arm, forearm and free arm is EXACTLY image 1's silhouette:
  same width, same bulges, same rolled sleeve cuff above the biceps. Change colors and textures INSIDE it only.
- The character wears a short or rolled sleeve that covers the shoulder exactly like image 1.
  No tank top, no bare shoulder, no flared, puffy or wider sleeve.
- Muscles are flat inner shadow wedges only; never widen the arm. No veins, no balloon biceps or delts.
- Same rendering as image 1: even dark-brown outline (#3b1d14) of the same thickness, flat fill + exactly two
  hard-edged shadow tones + a few small highlights. No gradients, no airbrush, no glossy 3D shading.
  Arm hair: a few short hatch strokes only. Black cloth is dark grey #2a2a2a with visible fold wedges.

Image 1 is the EDIT TARGET and the ONLY source of geometry: Uncle Borya's torso_motion.png, canvas 1572×1001.
Keep its canvas size and ratio, the pose, scale and transparent background, and the anchor points:
neck stump top at (752, 215), working-arm sleeve opening toward (233, 683), free shoulder at (1070, 310), flat cut at the bottom.
Image 2 is ILYA's approved head: take ONLY the skin tone of the neck from it.
Redraw image 1 as ILYA: TORSO ONLY, no head, no working arm, no free arm.
Replace the green hoodie with a dark charcoal crew-neck t-shirt (base #2e2f33, shadows #24252a and #18191c) with short sleeves and a subtle darker geometric camo pattern; no logos, no lettering. Remove the hood and the drawstrings; crew neckline around the same neck stump.
Neck skin: light peach skin (#f0b060), no visible hair.
The rolled sleeve on the working-arm shoulder (left side of the image) keeps image 1's hooked outline exactly; only its color and fabric change.
Do not move, rotate, resize or recrop anything. Do not add a background, shadow, text or checkerboard. Genuine transparent alpha.
```

### arms_motion.png

```
Flat vector cartoon illustration in the style of a bold American comic poster.
Thick dark brown outline (#3b1d14) of even weight around every shape.
Flat color fills with exactly two shading tones (one mid shadow, one deep shadow) as hard-edged shapes,
a few small light highlight shapes, light hatching texture on skin and hair only.
Saturated warm palette: tan skin, maroon, orange, cream.
No gradients, no glow, no photo texture, no painterly blur, no text, no logos, no cast shadow, no background.
Light comes from above-front. Match the attached style reference exactly.

STYLE LOCK — the canon is image 1 (Uncle Borya). Match image 1, not the concept art, wherever they disagree:
- The outer silhouette of the sleeve stump, upper arm, forearm and free arm is EXACTLY image 1's silhouette:
  same width, same bulges, same rolled sleeve cuff above the biceps. Change colors and textures INSIDE it only.
- The character wears a short or rolled sleeve that covers the shoulder exactly like image 1.
  No tank top, no bare shoulder, no flared, puffy or wider sleeve.
- Muscles are flat inner shadow wedges only; never widen the arm. No veins, no balloon biceps or delts.
- Same rendering as image 1: even dark-brown outline (#3b1d14) of the same thickness, flat fill + exactly two
  hard-edged shadow tones + a few small highlights. No gradients, no airbrush, no glossy 3D shading.
  Arm hair: a few short hatch strokes only. Black cloth is dark grey #2a2a2a with visible fold wedges.

Image 1 is the EDIT TARGET and the ONLY source of geometry: Uncle Borya's arms_motion.png, a 3×3 sheet of 9 poses, exactly 1670×941.
Keep the canvas, the grid, every pose, the clasped grip and the sleeve cuffs pixel-aligned with image 1.
OUR arm (with the red-and-white wristband, coming from the bottom right of each cell) stays completely unchanged in all 9 cells.
Image 2 is ILYA's approved head: skin tone only. Image 3 is ILYA's new torso_motion.png: sleeve color and fabric only.
Redraw ONLY the opponent's sleeve and skin in all 9 cells:
sleeve = dark charcoal t-shirt sleeve (#2e2f33) with the same subtle geometric camo; skin = light peach skin (#f0b060), no visible hair.
In every cell the opponent's sleeve, upper arm and forearm keep image 1's outline exactly: same width, same rolled cuff.
Do not move, rotate, resize or recrop anything. Do not add a background, shadow, text or checkerboard. Genuine transparent alpha.
```

### arm_free.png

```
Flat vector cartoon illustration in the style of a bold American comic poster.
Thick dark brown outline (#3b1d14) of even weight around every shape.
Flat color fills with exactly two shading tones (one mid shadow, one deep shadow) as hard-edged shapes,
a few small light highlight shapes, light hatching texture on skin and hair only.
Saturated warm palette: tan skin, maroon, orange, cream.
No gradients, no glow, no photo texture, no painterly blur, no text, no logos, no cast shadow, no background.
Light comes from above-front. Match the attached style reference exactly.

STYLE LOCK — the canon is image 1 (Uncle Borya). Match image 1, not the concept art, wherever they disagree:
- The outer silhouette of the sleeve stump, upper arm, forearm and free arm is EXACTLY image 1's silhouette:
  same width, same bulges, same rolled sleeve cuff above the biceps. Change colors and textures INSIDE it only.
- The character wears a short or rolled sleeve that covers the shoulder exactly like image 1.
  No tank top, no bare shoulder, no flared, puffy or wider sleeve.
- Muscles are flat inner shadow wedges only; never widen the arm. No veins, no balloon biceps or delts.
- Same rendering as image 1: even dark-brown outline (#3b1d14) of the same thickness, flat fill + exactly two
  hard-edged shadow tones + a few small highlights. No gradients, no airbrush, no glossy 3D shading.
  Arm hair: a few short hatch strokes only. Black cloth is dark grey #2a2a2a with visible fold wedges.

Image 1 is the EDIT TARGET and the ONLY source of geometry: Uncle Borya's arm_free.png, canvas 560×620.
Keep the canvas, the arm pose and outline, the fist gripping the dark peg at (501, 493) and the sleeve top at (60, 45). The peg stays unchanged.
Image 2 is ILYA's approved head: skin tone only. Image 3 is ILYA's new torso_motion.png: sleeve color and fabric only.
Redraw ONLY the sleeve and the skin: sleeve = dark charcoal t-shirt sleeve (#2e2f33) with the same subtle geometric camo; skin = light peach skin (#f0b060), no visible hair.
Same outline as image 1: same rolled sleeve cuff, same arm width, same fist.
Do not move, rotate, resize or recrop anything. Do not add a background, shadow, text or checkerboard. Genuine transparent alpha.
```

### cuff.png

```
Flat vector cartoon illustration in the style of a bold American comic poster.
Thick dark brown outline (#3b1d14) of even weight around every shape.
Flat color fills with exactly two shading tones (one mid shadow, one deep shadow) as hard-edged shapes,
a few small light highlight shapes, light hatching texture on skin and hair only.
Saturated warm palette: tan skin, maroon, orange, cream.
No gradients, no glow, no photo texture, no painterly blur, no text, no logos, no cast shadow, no background.
Light comes from above-front. Match the attached style reference exactly.

STYLE LOCK — the canon is image 1 (Uncle Borya). Match image 1, not the concept art, wherever they disagree:
- The outer silhouette of the sleeve stump, upper arm, forearm and free arm is EXACTLY image 1's silhouette:
  same width, same bulges, same rolled sleeve cuff above the biceps. Change colors and textures INSIDE it only.
- The character wears a short or rolled sleeve that covers the shoulder exactly like image 1.
  No tank top, no bare shoulder, no flared, puffy or wider sleeve.
- Muscles are flat inner shadow wedges only; never widen the arm. No veins, no balloon biceps or delts.
- Same rendering as image 1: even dark-brown outline (#3b1d14) of the same thickness, flat fill + exactly two
  hard-edged shadow tones + a few small highlights. No gradients, no airbrush, no glossy 3D shading.
  Arm hair: a few short hatch strokes only. Black cloth is dark grey #2a2a2a with visible fold wedges.

Image 1 is the EDIT TARGET and the ONLY source of geometry: Uncle Borya's cuff.png, canvas 151×151.
Image 2 is ILYA's new torso_motion.png: sleeve color and fabric only.
Recolor ONLY: the cuff becomes dark charcoal t-shirt sleeve (#2e2f33) with the same subtle geometric camo. Keep image 1's outline, size and position exactly.
Do not move, rotate, resize or recrop anything. Do not add a background, shadow, text or checkerboard. Genuine transparent alpha.
```

## Эрмес (`ermes`)

Футболка уже правильная, но рука толще Бориной, а плечо на торсе шире эталона. Перерисовываем всё по контуру Бори.

### torso_motion.png

```
Flat vector cartoon illustration in the style of a bold American comic poster.
Thick dark brown outline (#3b1d14) of even weight around every shape.
Flat color fills with exactly two shading tones (one mid shadow, one deep shadow) as hard-edged shapes,
a few small light highlight shapes, light hatching texture on skin and hair only.
Saturated warm palette: tan skin, maroon, orange, cream.
No gradients, no glow, no photo texture, no painterly blur, no text, no logos, no cast shadow, no background.
Light comes from above-front. Match the attached style reference exactly.

STYLE LOCK — the canon is image 1 (Uncle Borya). Match image 1, not the concept art, wherever they disagree:
- The outer silhouette of the sleeve stump, upper arm, forearm and free arm is EXACTLY image 1's silhouette:
  same width, same bulges, same rolled sleeve cuff above the biceps. Change colors and textures INSIDE it only.
- The character wears a short or rolled sleeve that covers the shoulder exactly like image 1.
  No tank top, no bare shoulder, no flared, puffy or wider sleeve.
- Muscles are flat inner shadow wedges only; never widen the arm. No veins, no balloon biceps or delts.
- Same rendering as image 1: even dark-brown outline (#3b1d14) of the same thickness, flat fill + exactly two
  hard-edged shadow tones + a few small highlights. No gradients, no airbrush, no glossy 3D shading.
  Arm hair: a few short hatch strokes only. Black cloth is dark grey #2a2a2a with visible fold wedges.

Image 1 is the EDIT TARGET and the ONLY source of geometry: Uncle Borya's torso_motion.png, canvas 1572×1001.
Keep its canvas size and ratio, the pose, scale and transparent background, and the anchor points:
neck stump top at (752, 215), working-arm sleeve opening toward (233, 683), free shoulder at (1070, 310), flat cut at the bottom.
Image 2 is ERMES's approved head: take ONLY the skin tone of the neck from it.
Redraw image 1 as ERMES: TORSO ONLY, no head, no working arm, no free arm.
Replace the green hoodie with a plain black crew-neck t-shirt (base #2a2a2a, fold shadows #1c1c1c and #121212) with short sleeves; no logos, no lettering. Remove the hood and the drawstrings; crew neckline around the same neck stump.
Neck skin: warm tan skin (#e09050) with a few short hatch strokes of forearm hair.
The rolled sleeve on the working-arm shoulder (left side of the image) keeps image 1's hooked outline exactly; only its color and fabric change.
Do not move, rotate, resize or recrop anything. Do not add a background, shadow, text or checkerboard. Genuine transparent alpha.
```

### arms_motion.png

```
Flat vector cartoon illustration in the style of a bold American comic poster.
Thick dark brown outline (#3b1d14) of even weight around every shape.
Flat color fills with exactly two shading tones (one mid shadow, one deep shadow) as hard-edged shapes,
a few small light highlight shapes, light hatching texture on skin and hair only.
Saturated warm palette: tan skin, maroon, orange, cream.
No gradients, no glow, no photo texture, no painterly blur, no text, no logos, no cast shadow, no background.
Light comes from above-front. Match the attached style reference exactly.

STYLE LOCK — the canon is image 1 (Uncle Borya). Match image 1, not the concept art, wherever they disagree:
- The outer silhouette of the sleeve stump, upper arm, forearm and free arm is EXACTLY image 1's silhouette:
  same width, same bulges, same rolled sleeve cuff above the biceps. Change colors and textures INSIDE it only.
- The character wears a short or rolled sleeve that covers the shoulder exactly like image 1.
  No tank top, no bare shoulder, no flared, puffy or wider sleeve.
- Muscles are flat inner shadow wedges only; never widen the arm. No veins, no balloon biceps or delts.
- Same rendering as image 1: even dark-brown outline (#3b1d14) of the same thickness, flat fill + exactly two
  hard-edged shadow tones + a few small highlights. No gradients, no airbrush, no glossy 3D shading.
  Arm hair: a few short hatch strokes only. Black cloth is dark grey #2a2a2a with visible fold wedges.

Image 1 is the EDIT TARGET and the ONLY source of geometry: Uncle Borya's arms_motion.png, a 3×3 sheet of 9 poses, exactly 1670×941.
Keep the canvas, the grid, every pose, the clasped grip and the sleeve cuffs pixel-aligned with image 1.
OUR arm (with the red-and-white wristband, coming from the bottom right of each cell) stays completely unchanged in all 9 cells.
Image 2 is ERMES's approved head: skin tone only. Image 3 is ERMES's new torso_motion.png: sleeve color and fabric only.
Redraw ONLY the opponent's sleeve and skin in all 9 cells:
sleeve = plain black t-shirt sleeve (#2a2a2a) with visible fold wedges; skin = warm tan skin (#e09050) with a few short hatch strokes of forearm hair.
In every cell the opponent's sleeve, upper arm and forearm keep image 1's outline exactly: same width, same rolled cuff.
Do not move, rotate, resize or recrop anything. Do not add a background, shadow, text or checkerboard. Genuine transparent alpha.
```

### arm_free.png

```
Flat vector cartoon illustration in the style of a bold American comic poster.
Thick dark brown outline (#3b1d14) of even weight around every shape.
Flat color fills with exactly two shading tones (one mid shadow, one deep shadow) as hard-edged shapes,
a few small light highlight shapes, light hatching texture on skin and hair only.
Saturated warm palette: tan skin, maroon, orange, cream.
No gradients, no glow, no photo texture, no painterly blur, no text, no logos, no cast shadow, no background.
Light comes from above-front. Match the attached style reference exactly.

STYLE LOCK — the canon is image 1 (Uncle Borya). Match image 1, not the concept art, wherever they disagree:
- The outer silhouette of the sleeve stump, upper arm, forearm and free arm is EXACTLY image 1's silhouette:
  same width, same bulges, same rolled sleeve cuff above the biceps. Change colors and textures INSIDE it only.
- The character wears a short or rolled sleeve that covers the shoulder exactly like image 1.
  No tank top, no bare shoulder, no flared, puffy or wider sleeve.
- Muscles are flat inner shadow wedges only; never widen the arm. No veins, no balloon biceps or delts.
- Same rendering as image 1: even dark-brown outline (#3b1d14) of the same thickness, flat fill + exactly two
  hard-edged shadow tones + a few small highlights. No gradients, no airbrush, no glossy 3D shading.
  Arm hair: a few short hatch strokes only. Black cloth is dark grey #2a2a2a with visible fold wedges.

Image 1 is the EDIT TARGET and the ONLY source of geometry: Uncle Borya's arm_free.png, canvas 560×620.
Keep the canvas, the arm pose and outline, the fist gripping the dark peg at (501, 493) and the sleeve top at (60, 45). The peg stays unchanged.
Image 2 is ERMES's approved head: skin tone only. Image 3 is ERMES's new torso_motion.png: sleeve color and fabric only.
Redraw ONLY the sleeve and the skin: sleeve = plain black t-shirt sleeve (#2a2a2a) with visible fold wedges; skin = warm tan skin (#e09050) with a few short hatch strokes of forearm hair.
Same outline as image 1: same rolled sleeve cuff, same arm width, same fist.
Do not move, rotate, resize or recrop anything. Do not add a background, shadow, text or checkerboard. Genuine transparent alpha.
```

### cuff.png

```
Flat vector cartoon illustration in the style of a bold American comic poster.
Thick dark brown outline (#3b1d14) of even weight around every shape.
Flat color fills with exactly two shading tones (one mid shadow, one deep shadow) as hard-edged shapes,
a few small light highlight shapes, light hatching texture on skin and hair only.
Saturated warm palette: tan skin, maroon, orange, cream.
No gradients, no glow, no photo texture, no painterly blur, no text, no logos, no cast shadow, no background.
Light comes from above-front. Match the attached style reference exactly.

STYLE LOCK — the canon is image 1 (Uncle Borya). Match image 1, not the concept art, wherever they disagree:
- The outer silhouette of the sleeve stump, upper arm, forearm and free arm is EXACTLY image 1's silhouette:
  same width, same bulges, same rolled sleeve cuff above the biceps. Change colors and textures INSIDE it only.
- The character wears a short or rolled sleeve that covers the shoulder exactly like image 1.
  No tank top, no bare shoulder, no flared, puffy or wider sleeve.
- Muscles are flat inner shadow wedges only; never widen the arm. No veins, no balloon biceps or delts.
- Same rendering as image 1: even dark-brown outline (#3b1d14) of the same thickness, flat fill + exactly two
  hard-edged shadow tones + a few small highlights. No gradients, no airbrush, no glossy 3D shading.
  Arm hair: a few short hatch strokes only. Black cloth is dark grey #2a2a2a with visible fold wedges.

Image 1 is the EDIT TARGET and the ONLY source of geometry: Uncle Borya's cuff.png, canvas 151×151.
Image 2 is ERMES's new torso_motion.png: sleeve color and fabric only.
Recolor ONLY: the cuff becomes plain black t-shirt sleeve (#2a2a2a) with visible fold wedges. Keep image 1's outline, size and position exactly.
Do not move, rotate, resize or recrop anything. Do not add a background, shadow, text or checkerboard. Genuine transparent alpha.
```
