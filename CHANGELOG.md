# CHANGELOG - פגיה בעיר

## R27 - 2026-07-02 — Multi-city, accurate GPS, full profile editor
- Multiple cities: pick as many cities as you want (comma-separated). Notifications fire for a post in ANY of them.
- Accurate GPS: coordinates now snap to the nearest real Israeli city from a built-in list (~50 cities incl. Karmiel) — fixes wrong regional-council names like "מועצה אזורית גזר". GPS ADDS the city to your list (doesn't overwrite). IP fallback also snaps to nearest city.
- Full editable profile: the settings/edit-profile screen now edits name, bio, avatar (🎲 shuffle), and cities — all in one place. "Edit profile" and ⚙️ open the same editor. Your edits persist and win over the auto account name.
- Note: requires re-deploy (rebuild web/, re-drag to Netlify) to go live.
## R26 - 2026-07-02 — Real accounts + delete/edit
- Real login (auth.js): email+password signup with a chosen username, and a "Continue with Google" button. Session persists; identity (name/avatar) comes from the account.
- Posting and chatting now require login (gated in the UI + enforced server-side). Anyone can browse; only logged-in users post.
- Delete & edit your own posts: owner-only 🗑️/✏️ in the post detail, wired to the DB. RLS enforces ownership server-side (owner-only update/delete policies).
- DB: user_id added to posts + chat_messages; owner-only RLS executed on the live project. Supabase Site URL set to the live Netlify address.
- New: AUTH_SETUP.md (email works now; Google needs a one-time Google Cloud credential — guide included).
- Auth-button in the top nav; sign-out in Settings.
- Note: requires re-deploy (run PUBLISH.bat, re-drag web/ to Netlify) to go live.
## R25 - 2026-07-02 — Deploy-ready (go live on the web)
- The app is now publishable as a static site — anyone in the world can open it via a URL (no Electron needed; scripts already relative, all external calls over HTTPS).
- Added: manifest.json (installable, RTL, standalone), favicon/theme-color in <head>, robots.txt, netlify.toml, .gitignore.
- make-web.ps1: assembles a clean web/ folder (only browser files, no Electron/docs/node_modules) for drag-and-drop deploy.
- DEPLOY.md: click-by-click guide — Netlify drag-drop (2 min) or GitHub auto-deploy; notes that Supabase needs no change until auth is added.

## R24 - 2026-07-02 — Media in chat
- 📎 attach button in the chat input: send photos & videos like any social network. Media uploads to Supabase Storage (small files inline-fallback), renders as image/video bubbles, previews as 📷/🎥 in the conversation list, syncs live to the other side, and loads with history.
- DB: media_url + media_type columns added to chat_messages (executed on live project).

## R23 - 2026-07-02 — Total sync & tidy + sync agent
- Deleted images/copy-images.ps1 (last MedAImind-era leftover — referenced the old brain path).
- Rewrote images/README.md to reflect the actual SVG assets.
- VISION.md roadmap updated to real status (R1-R23 done, next steps listed).
- SETUP_SUPABASE.md and BACKEND_PLAN.md marked "already executed / decided" as historical docs.
- New sync-agent.cjs (run: `npm run sync`) — the project's standing order-keeper: verifies required files, JS syntax, zero MedAImind/absolute-path leftovers in code, i18n key coverage, image paths, script-tag existence+order, duplicate functions, and size budget. Writes SYNC_REPORT.md, exit code 1 on errors.

## R22 - 2026-07-02 — Documentation & checkpoint
- README.md: full project documentation — what it is, architecture, file map, feature status, Supabase account, production gaps.
- CHECKPOINT.md: current-state snapshot (R21), restore instructions, git recommendation.
- checkpoint.ps1: one-click timestamped ZIP backup (excludes node_modules/backups) into backups\.

## R21 - 2026-07-02 — Full separation from MedAImind
- Deleted portable/ (105 files of analysis agents imported from another project). This project is now fully standalone.
- Cleaned VISION.md: tech stack + file structure reflect the real current project (i18n, settings, backend, Supabase).

## R20 - 2026-07-02 — Chat wave 2 (live signals + mobile)
- Typing indicator: animated "…" dots when the other person is typing (Supabase broadcast, throttled).
- Read receipts: ✓ sent → ✓✓ (blue) when the other side reads. Read is broadcast when the recipient opens/has the conversation.
- Mobile chat fixed: on ≤768px it's now one pane at a time (list ↔ conversation) with a back button — previously the conversation list was hidden and chat was unusable on phones.

## R19 - 2026-07-02 — GPS location + chat clarity (agent-researched)
- Auto-detect location: "📍 detect my location" button in Settings. Tries GPS (reverse-geocoded to a city), falls back to IP-based lookup — no typing needed.
- Dispatched a research subagent to study Messenger/WhatsApp/Telegram/marketplace chat UX; applied its highest-impact fixes:
  - Removed the avatar on my own messages + grouped consecutive messages from the same sender (tight 2px gap) — the column now reads like a real messenger.
  - Asymmetric bubbles: my messages hug one edge, theirs the other, with direction-correct ("logical") RTL tails.
  - Product context card pinned under the chat header (thumbnail + name + price + "view listing") so you always know which item the conversation is about.
  - Unread conversations are now bold + tinted; friendly empty state when you have no chats yet.
- Remaining from the research (next wave): typing indicator, sent/delivered/read ticks, mobile one-pane chat + back button, day separators, skeleton loaders, "new posts ↑" live pill.
## R18 - 2026-07-02 — Identity, background & life
- Root cause of the chat confusion: every device used the same default name ("דנא אברהם"), so messages looked like you were talking to yourself. Added a "My name" field in Settings (⚙️) that sets your identity across posts, chat and presence. Give each device a different name → real distinct users.
- Real background: replaced the flat black with a layered dark gradient + soft, low-opacity color pools (fixed attachment) — depth without neon.
- Life & UX: gentle card hover-lift, press feedback, soft fade-in for feed cards and chat bubbles, sticky chat header.
- Chat polish: bubbles now size to content (short messages no longer wrap awkwardly), subtle chat backdrop, focus ring on the input.
## R17 - 2026-07-02 — Chat polish + real presence
- Removed the fake generic auto-reply — no more bot answers. Replies now come only from real users via the backend.
- Real online / last-seen status via Supabase Presence: green dot + "מחובר עכשיו" when the other user is online, "נראה לאחרונה HH:MM" otherwise. Updates live as people join/leave.
- Flattened chat look: outgoing bubble is now a solid blue (no neon gradient), incoming a flat dark bubble — cleaner, less gaudy.

## R16 - 2026-07-02 — Real chat + location-based notifications
- Real multi-user chat: chat_messages table (per-post rooms) + realtime. Chatting on a real (DB) post syncs messages between users live; history loads when opening the conversation; incoming messages show a toast + notification + unread badge. Demo posts keep the simulated chat.
- Location-based notifications: new settings.js + ⚙️ settings modal (my city, my neighborhoods/areas comma-separated, "notify only from my area" toggle, persisted in localStorage). Realtime post notifications fire only when the post location contains the user's city or one of their areas. Feed still shows everything — only notifications are filtered.
- New-post notifications now also land in the notifications panel (with location), not just a toast.
- Schema executed on the live Supabase project via browser automation.

## R15 - 2026-07-02 — Real multi-user backend (Supabase)
- New backend.js: Supabase client layer — loads posts from DB on startup, syncs every published post (incl. media upload to Storage), and subscribes to Realtime so posts from other users appear instantly with a toast.
- supabase-schema.sql: posts table, open RLS (read+insert only, no update/delete), public media bucket, realtime publication.
- config.js: paste Project URL + anon key; until filled, the app silently runs in local demo mode.
- SETUP_SUPABASE.md: 10-minute Hebrew setup guide (create project → run SQL → paste keys → restart).
- supabase-js loaded from CDN; no build step, client stays vanilla (Rule #6 preserved as much as possible).

## R14 - 2026-07-02 — Realistic look + multiline chat
- Chat input is now a multi-line auto-growing textarea (Enter sends, Shift+Enter = new line); bubbles wrap and preserve line breaks.
- Toned-down "realistic" restyle (last CSS block): removed neon glows, heavy backdrop-blur, shimmer, pulsing/animated gradients, ambient corner glows, gradient brand text, and teal scrollbar. Flat solid surfaces, subtle borders, neutral shadows — closer to a real social network.

## R13 - 2026-07-02 — Facebook-style feed
- New SVG logo (bag + leaf) replacing the avocado emoji, in splash + top nav.
- Fixed the "missing" publish button: a duplicate `.fab` CSS rule set `position: relative`, overriding `fixed` and dropping the button out of view. Removed.
- Facebook-style composer at the top of the feed (avatar + "what to share?" + photo/video / stock / expiring buttons) — opens the post modal. The floating FABs are retired.
- Infinite feed: new feed-extras.js with a pool-based mock-post generator + infinite scroll (appends batches on scroll). The feed no longer stops after the seed posts.
- Video upload: the composer/modal now accepts image OR video, previews both, and cards + detail render a <video> player for video posts (new mediaTag helper).
- Chat page: hides the right-side widgets and widens the conversation (:has selector) for a Messenger-like, less-crowded layout.

## R12 - 2026-07-02 — Multi-language (4 languages)
- New i18n engine (i18n.js): Hebrew, English, Russian, Arabic. ~150 translation keys.
- Language switcher in the top nav; choice persists (localStorage).
- Automatic RTL/LTR direction switch (RTL for he/ar, LTR for en/ru).
- All static UI wired via data-i18n / data-i18n-ph (nav, feed tabs, filters, explore, saved, chat, profile, widgets, full post modal, bottom nav).
- Dynamic UI translated via t(): card badges/buttons, expiry & price labels, savings, units, comments, chat input, detail modal, edit-profile modal, toasts, empty states.
- 9 placeholder product images added as language-neutral SVGs in images/.
- Note: user-generated/demo content (product names, city data values) intentionally stays as entered — only UI chrome is translated.

## R11 - 2026-07-02 (Current) — Maintenance & portability
- Images made portable: IMG now uses relative `images/*.png` paths (Rule #6). Absolute `C:/Users/...brain/...` paths removed.
- Added `imgFallback()` — broken/missing images degrade gracefully to the emoji placeholder instead of a broken-image icon.
- Fixed duplicate `toggleSave()` (two conflicting definitions). Now a single function using `savedIds` as source of truth; card + detail save buttons update visually on click.
- Removed duplicate `toggleNotifications()`.
- Implemented `openEditProfile()` — real edit modal (name / city / bio) replacing the "coming soon" stub (Rule #4: no dead buttons).
- Bug fix: profile "posts" stat was always 0 (compared against an HTML-entity string); now compares by user id.
- Bug fix: "mark as taken/sold" toast showed raw HTML entities; now correct Hebrew text.

## R6-R10 - 2026-06-30 (were implemented in code but undocumented)
- R6 — Responsive mobile layout (media queries + bottom nav)
- R7 — Filter by city / category (`filterByCity`, `filterByTag`, live category counts)
- R8 — Real-time-like activity simulation (`startLiveActivity`)
- R9 — Image upload preview in the post modal (`previewImage`)
- R10 — Notifications system (panel, badge, click handling)

## R5 - 2026-06-29
- Dual feed system: pagia + stock with separate tab UI
- Business vs private seller distinction
- Stock cards with discount banners (-XX%)
- Post creation modal supports both feed types
- Deals widget in sidebar for hot stock deals
- 9 product images generated (hummus, bread, vegetables, yogurt, cheese, cleaning, pasta, cosmetics, drinks)

## R1-R4 - 2026-06-29
- Initial SPA with single feed
- Feed + chat + profile pages
- Dark glassmorphism UI
- Real-time-like chat simulation
- Like / save / comment actions
- Notification panel