# CHANGELOG - פגיה בעיר

## R31 - 2026-08-08 — No invented content on a live app
- **The activity simulator was fabricating engagement on real listings.** Every 12 seconds it could announce a post by a person who doesn't exist ("שירה בן פרסם: עוגות שוקולד"), and it incremented `likes` on a *random* post — including posts loaded from the DB. Now that likes are real rows, that made the number on screen contradict the database and reset on reload. The simulator is now inert whenever a backend is connected, and even offline it only ever touches demo posts.
- **Bundled demo listings are hidden once a real backend is connected.** With the DB empty, the feed showed 5 invented products that a visitor had no way to distinguish from genuine ones. They still appear in offline/demo mode, where they're the only content there is. One flag at the top of app.js (`SHOW_DEMO_WHEN_LIVE`) puts them back for a presentation.
- Applied consistently: feed, search, category counts, profile grid, and the "expiring soon" / "deals" sidebar widgets all use the same filter, so nothing invented leaks through a side door.
- **A real empty state.** An empty feed used to say "😅 אין מוצרים" and stop there. It now distinguishes "nothing matched your search" (with a "show all" button) from "nobody has posted yet" (an invitation to post the first listing). New keys in all 4 languages.

## R30 - 2026-08-08 — Likes, comments and a genuinely private chat
- **Likes are real now.** They were a number in memory: a refresh reset it and nobody else ever saw your like. Each like is a row in `post_likes` keyed (post, user) — the composite primary key makes double-liking impossible even across devices. Counts load with the feed, update live when someone else likes, and the UI rolls back if the write is rejected.
- **Comments are real now.** They lived in an in-memory array — gone on refresh, invisible to everyone else. They're stored in `post_comments`, load with the feed, arrive live, and are posted optimistically (shown immediately, reconciled with the server row, removed with a notice if the write fails).
- Both require an account on a real post — demo posts still work offline with no login, so the app is fully usable before signing in.
- **The chat is private on the server too, not just in the UI.** R29 split conversations per buyer client-side, but the read policy was still `using (true)`: anyone could query the table and read every message in the app. Messages now carry `buyer_key` and `seller_uid`, and both the read and insert policies require you to be one of the two participants. This also means realtime only delivers messages to the people in the conversation, instead of broadcasting every message to every connected client.
- Realtime channel for likes/comments; the seller's conversation now resolves the product from the room id, so their side shows which item is being discussed.
- New i18n keys in all 4 languages (`login_to_like`, `login_to_comment`, `comment_failed`, plus R29's `status_taken`/`status_sold`).
- **Demo mode is now visible.** When there's no live backend the app fell back silently — it looked completely normal, full of bundled demo listings a visitor would take for real ones. A dismissible banner now says so (with the underlying reason), in all 4 languages. This surfaced while diagnosing that the Supabase project itself is currently unreachable.
- **One Supabase client instead of two.** auth.js and backend.js each created their own client against the same auth storage key; supabase-js warned about "Multiple GoTrueClient instances", and the two could disagree about the current session — which would make inserts fail the owner-only RLS checks for no visible reason. backend.js now reuses auth.js's client.
- Assets bumped to `?v=r30c`.
- **Ran against the live project.** The Supabase project turned out to be paused (free plan, ~5 weeks idle), which is why nothing worked in production. Resumed it, applied the R29+R30 migration, and verified against the live database: `post_likes`, `post_comments`, `posts.taken`, `chat_messages.buyer_key/seller_uid` all present, and `pg_policies` shows the 9 expected policies with `public chat read` gone.
- **Requires the R30 block in supabase-schema.sql.** Until it runs, likes/comments log a warning and stay local, and the chat keeps the old open read policy. Messages sent before R30 have no participant fields and stop being visible once the policy is in place — they are not deleted, and the rollback statement is in the file.

## R29 - 2026-08-08 — Making the app actually behave
- **"סמן כנלקח/נמכר" did nothing.** It set `post.taken` and showed a toast; no render path ever read the flag, so the card stayed exactly as it was. The card is now visibly marked (ribbon + dimmed + greyscale), drops out of the "נגמר בקרוב" and "דילים" widgets, and its chat button is disabled. The state is written to the DB (`taken` column — run the R29 block in supabase-schema.sql once) so it survives a reload and is visible to everyone.
- The button was also offered to people who *don't* own the post, where RLS would have rejected the write anyway. It's now owner-only, and non-owners see a "נלקח/נמכר" note instead.
- **Your own posts vanished from your profile after every reload.** The profile grid and stats matched `post.user.id === ME.id`, but posts reloaded from the DB come back as user `db-<client_id>`, never `ME.id`. Added `isMine()`, which matches on the account id (`ownerUid`) and falls back to the local user — so your posts stay yours across devices and reloads.
- **Saved items were fake and disposable.** The list was seeded with hardcoded demo ids (1, 3, 101) and never persisted — a reload wiped whatever you saved. Saves are now stored in localStorage and keyed by the DB id (`postKey()`); the old numeric key was just a counter, so after a refresh your saved items pointed at whatever post happened to land on that index.
- **"קרוב אליי" ignored your settings.** It was hardcoded to Tel Aviv + Jerusalem, so the cities and neighbourhoods added in R27 only ever filtered notifications, never the feed. It now reads the same settings.
- **Search missed anything capitalised.** The query was lower-cased but only `desc` was compared in lower case, so a product, city or seller name with a capital letter was unsearchable. Both sides are normalised now, and category was added to the searched fields.
- **The infinite feed invented products.** Scrolling generated mock listings forever and spliced them among genuine ones — on a live feed that reads as an app full of fake items. When connected to the DB it now pages through *real* posts (30 at a time, appended after the real ones already loaded) and stops at the end; mock generation only happens in offline/demo mode.
- **Chat was not private.** The room was the post id alone, so every buyer interested in the same product shared one room and read each other's messages. The room is now post + buyer, making each thread a real 1:1 conversation; the seller gets one thread per buyer, and their side now shows which product it's about. Messaging the same seller about a second item also used to reuse the first conversation (wrong room, wrong product card) — conversations are matched on seller *and* product now.
- **Broken avatars everywhere when the avatar service is unreachable.** One capture-phase error listener swaps any failed avatar for an inline initial, without replacing the `<img>` element that `applyIdentity` relies on.
- **Returning users got a half-updated app.** No cache-busting on the local assets meant a browser could hold old JS against new CSS after a deploy. All local `<script>`/`<link>` tags now carry `?v=r29`, and sync-agent fails if they ever drift apart or lose the marker.
- sync-agent: two more guards (uniform `?v=`, and the script check now tolerates the query string).

## R28 - 2026-08-08 — Security & release hygiene
- **Stored XSS fixed (the big one).** Every render path built HTML strings and assigned them with `innerHTML` while interpolating raw user content — product names, descriptions, locations, display names, comments, chat messages, avatar/media URLs. A post titled `<img src=x onerror=...>` executed in every viewer's browser and could read the Supabase session out of localStorage. Added `esc()` (HTML entities) and `safeUrl()` (drops `javascript:`/`vbscript:`/`file:` and non-media `data:`) in app.js and applied them across cards, detail modal, comments, chat list, chat bubbles, chat context card, profile grid, sidebar widgets and the notifications panel. Verified in a browser: the payload now renders as literal text with zero element children and no event-handler attributes.
- `imgFallback` reads the emoji from `data-emoji` instead of having it inlined into an `onerror=""` JS string (that was an injection point of its own).
- auth.js: the nav button uses `textContent`, not `innerHTML`, for the account display name.
- **make-web.ps1 was broken since R25 — this is why the live site never got R26/R27.** The file was UTF-8 *without* BOM and contained an em-dash; Windows PowerShell 5.1 read it as ANSI, where byte 0x94 becomes a quote character, so the script died with "missing terminator" and `web/` was never rebuilt. Both .ps1 scripts are now UTF-8 with BOM and run.
- `web/` rebuilt — the deploy bundle finally matches the source (it was 4 files behind: app.js, auth.js, i18n.js, settings.js).
- netlify.toml: `publish` changed from `.` to `web`. The git-connected deploy was serving the entire repo — CHANGELOG, BACKEND_PLAN, PUBLISH.bat, sync-agent.cjs, supabase-schema.sql — all publicly fetchable. netlify.toml is no longer copied into `web/` so drag-and-drop still works.
- backend.js: media-only chat messages threw on `m.text.slice()` (silently swallowed, no notification) — now falls back to 📷/🎥. Same fix for the conversation preview. `quantity`/`discountPct` from the DB are coerced with `Number()`.
- sync-agent.cjs: auth.js added to the required/syntax/leftover checks (it was never checked at all), plus three new guards — .ps1 BOM encoding, `web/` freshness vs source, and a regression check that user content isn't interpolated into HTML without `esc()`. All three were verified to actually fail when broken.
- Repo hygiene: `pagia-baair.lnk` untracked (it embedded an absolute path and the machine hostname), `.tmp.driveupload/` and `*.lnk` gitignored.
- DEPLOY.md corrected: publish directory, the Auth section (Auth shipped in R26), and the security checklist.

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