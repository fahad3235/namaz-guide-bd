# Namaz Guide BD

Offline bilingual (English / বাংলা) step-by-step Salah guide for Bangladesh — wudu, rakats of the five daily prayers, the prayer itself with recitations, common mistakes, and a self-check quiz. Hanafi school.

## Problem

Many new learners and re-learners in Bangladesh know prayer times but not the *steps*: the order of wudu, how many rakats each prayer has, what is recited at each point of the prayer, and which small mistakes invalidate or weaken it. Existing factory apps cover *when* to pray (prayer-times-bd) and *logging* prayers (namaz-tracker-bd) — none teaches *how*.

## Features

- **Wudu guide** — 9 ordered steps with Fard/Sunnah tags and repetition counts (×3 is sunnah), plus 5 things that break wudu.
- **Rakats table** — all 5 daily prayers broken down by kind (Fard / Sunnah Muakkadah / Sunnah Ghair Muakkadah / Nafl / Witr), totals 4 / 12 / 8 / 7 / 17, and the 17 fard rakats per day.
- **Salah, step by step** — 13 steps from Niyyah to Salam, each with Arabic (shown without diacritics), transliteration, and English + Bengali meaning. Includes Surah Al-Fatiha in full and Surah Al-Ikhlas as the example second surah.
- **Common mistakes** — 8 frequent errors with plain fixes (rushing without stillness, wrong Qibla, forbidden times, uncovered awrah, skipping Al-Fatiha, …).
- **Self-check quiz** — 10 questions drawn from the guide, instant feedback with explanations, best score saved.
- **Progress tracking** — mark any step as learned; progress bar + best score persist in localStorage.
- **Bilingual** — full EN / বাংলা toggle, persisted, with Bengali digits. 100% offline, no account, no network requests. Mobile-first, verified at 390px.

## Stack

Vanilla HTML / CSS / JavaScript. No dependencies, no build step, no backend.

## Prerequisites

Any modern browser. For tests: Node.js 18+ and the headless Chromium shell used by the smoke test (Playwright `chromium_headless_shell-1187` cache path, overridable with `HEADLESS_SHELL`).

## Install & run

```bash
# just open it — no build step
open index.html        # or serve: python3 -m http.server
```

## Testing

```bash
node tests/logic.test.js   # 21 unit tests (data integrity: rakats sums, fard counts, quiz answers, i18n key parity)
node smoke/smoke.mjs       # 34 headless-Chrome checks (render, tabs, learned persistence, quiz flow, BN toggle, 390px, zero console errors)
```

## Deployment

Static site — any static host or GitHub Pages (repo root, `main` branch).

## Limitations

- Educational guide, **not a fatwa**. For rulings on your own situation, ask a qualified scholar.
- Arabic is shown **without diacritics**; learn exact pronunciation from a teacher or a printed mushaf.
- Rakats follow the **Hanafi** school as commonly taught in Bangladesh (Isha 17 includes 2 Nafl after Witr). Other schools differ on some sunnah counts.
- No prayer times or Qibla compass — use [prayer-times-bd](https://github.com/fahad3235/prayer-times-bd) for those.
- Progress and scores live only in the browser's localStorage on one device.

## Status

Complete MVP. 21/21 unit tests and 34/34 headless-Chrome smoke checks pass, zero console errors.
