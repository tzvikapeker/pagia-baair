# פגיה בעיר - Project Vision

## What it is
A social marketplace for two types of listings:
1. **פגיה (Expiring Products)** - people share food/products about to expire so others can take them
2. **סטוק בזול (Stock Clearance)** - individuals and businesses sell excess stock cheaply

## Core rules (Iron Rules)
- Rule #1 - Two separate feeds: `pagia` and `stock`. Never merged.
- Rule #2 - RTL-first layout (Hebrew UI). All text is Hebrew by default.
- Rule #3 - Dark/glassmorphism aesthetic. No plain white backgrounds.
- Rule #4 - Every UI element must be reachable via click. No dead buttons.
- Rule #5 - Files stay under 500 lines (Vanilla JS/CSS/HTML).
- Rule #6 - No npm dependencies. Pure browser JS + CSS + HTML.
- Rule #7 - Business sellers must be visually distinct from private sellers.
- Rule #8 - Discount % must be shown on stock cards when originalPrice > 0.
- Rule #9 - Chat is always accessible from any product card.
- Rule #10 - Hover states must be visually distinct (no same-color hover).

## Tech Stack
- HTML - index.html (single page)
- CSS - style.css (vanilla, dark theme)
- JS - app.js + i18n.js + settings.js + feed-extras.js + backend.js (vanilla, no framework)
- Backend - Supabase (Postgres + Realtime + Storage), loaded from CDN

## Roadmap
- R1-R10  ✅ SPA, dual feed, sellers, discounts, post modal, mobile, filters, chat UI, upload, notifications
- R11-R12 ✅ Maintenance fixes + 4 languages (he/en/ru/ar, auto RTL/LTR)
- R13-R14 ✅ Facebook-style composer, infinite feed, video, realistic flat look, multiline chat
- R15-R17 ✅ Supabase backend: real multi-user posts, real chat (per-post rooms), presence
- R18-R20 ✅ Identity settings, GPS location, location-based notifications, typing indicator, read receipts, mobile chat
- R21-R23 ✅ MedAImind fully separated, docs (README/CHECKPOINT), checkpoint script, sync agent
- Next    ⬜ Post delete/edit, anti-spam (report/block, rate-limit), synced likes/comments, date separators in chat

## File structure
pagia-baair/
  index.html          (main SPA shell)
  app.js              (core logic - state, render, events)
  i18n.js             (4-language dictionary + RTL/LTR engine)
  settings.js         (identity, city/areas, GPS detect, notification prefs)
  feed-extras.js      (infinite feed + mock generator)
  backend.js          (Supabase: posts, chat, presence, realtime)
  config.js           (Supabase keys)
  supabase-schema.sql (DB schema)
  style.css           (all styles)
  images/             (logo + product placeholders)
  VISION.md           (this file)
  CHANGELOG.md        (release log)

Note: this project is fully standalone. No relation to any other project.