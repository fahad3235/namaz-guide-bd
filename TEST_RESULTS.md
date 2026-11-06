# Namaz Guide BD — test results (run #253, 2026-11-06 14:00 slot)

## Unit tests — 21/21 PASS
`node tests/logic.test.js`
- Wudu: 9 steps; exactly 4 fard (face, arms, head, feet); wash steps ×3; all steps bilingual.
- Wudu breakers: 5, all bilingual.
- Rakats: 5 prayers, parts sum to totals (Fajr 4, Dhuhr 12, Asr 8, Maghrib 7, Isha 17); fard total 17/day; Isha has 3 Witr.
- Salah: 13 steps, Niyyah first, Salam last; every step bilingual with meaning; 12 recitation steps carry Arabic + transliteration; Fatiha spot-checked (Alhamdu / Maliki yawmid din / Ihdinas siratal mustaqim); Al-Ikhlas complete.
- Mistakes: 8, all bilingual.
- Quiz: 10 questions, 4 options each, valid answer indexes, expected answer key [1,1,0,2,1,3,0,2,3,1], correct-option strings verified.
- i18n: EN/BN key sets identical, all strings non-empty; bnDigits("17") = "১৭".

One real data bug found and fixed by the tests: Isha parts first summed to 15 against the stated total 17 — the standard Bangladeshi chart adds 2 Nafl after Witr (4+4+2+2+3+2 = 17). Fixed in data.js; tests green after.

## Headless-Chrome smoke — 34/34 PASS
`node smoke/smoke.mjs` (raw CDP, headless_shell-1187, file://)
- Renders: title, 5 tabs, 9 wudu steps, 4 fard tags, 5 breakers, footer disclaimer.
- Learned mark toggles, saves to localStorage, persists across reload.
- Rakats tab: 5 cards, totals 4/12/8/7/17, fard total 17, Isha shows Witr.
- Salah tab: 13 steps, 12 Arabic blocks, Fatiha Arabic verified in-page, Tashahhud present, Salam last.
- Mistakes tab: 8 items.
- Quiz flow: Q1 correct ("5") → feedback; Q2 wrong → feedback names "2"; remaining 8 answered correctly → result 9/10, best score 9 saved, 10-item review list.
- Language: toggle to Bengali (title "নামাজ গাইড বিডি"), Bengali digit ১, persists across reload, toggles back.
- Mobile: no horizontal overflow at 390px.
- Zero console errors, zero page exceptions.

## Sources
All files pure ASCII (Bengali/Arabic as \uXXXX escapes in JS, numeric entities in HTML) — verified with `grep -rP '[^\x00-\x7F]'` = 0 matches.
