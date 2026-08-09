#!/usr/bin/env node
'use strict';
/* =====================================================================
   sync-agent.cjs — סוכן הסדר והסנכרון של פגיה בעיר
   תפקיד: לוודא שהפרויקט מסונכרן, נקי ועקבי. מריצים:  node sync-agent.cjs
   בדיקות:
     1. קבצי חובה קיימים
     2. תחביר JS תקין (node --check) לכל קבצי המקור
     3. אפס שאריות: אין אזכורי MedAImind / portable / נתיבים אבסולוטיים
     4. כל מפתח data-i18n ב-HTML מוגדר במילון i18n.js
     5. כל תמונה שמוגדרת ב-IMG קיימת ב-images/
     6. כל <script src> ב-HTML קיים כקובץ + סדר טעינה נכון
     7. אין הגדרות function כפולות ב-app.js
     8. תקציב גודל קבצים (אזהרה מעל 120KB)
     9. קבצי .ps1 עם תווים לא-אנגליים חייבים BOM (אחרת PowerShell 5.1 נשבר)
    10. web/ מסונכרן עם המקור (אחרת האתר החי מריץ קוד ישן)
    11. אין אינטרפולציה של תוכן משתמש ל-HTML בלי esc() (הגנת XSS)
   פלט: קונסול + SYNC_REPORT.md · קוד יציאה 1 אם יש שגיאות
   ===================================================================== */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = __dirname;
const errors = [];
const warns = [];
const oks = [];

function read(f) { return fs.readFileSync(path.join(ROOT, f), 'utf8'); }
function exists(f) { return fs.existsSync(path.join(ROOT, f)); }

/* 1 — required files */
const REQUIRED = ['index.html','app.js','i18n.js','settings.js','feed-extras.js','backend.js','auth.js','config.js','style.css','main.js','package.json','supabase-schema.sql','README.md','CHANGELOG.md','VISION.md','CHECKPOINT.md','checkpoint.ps1','make-web.ps1','images/logo.svg'];
for (const f of REQUIRED) exists(f) ? oks.push(`קיים: ${f}`) : errors.push(`חסר קובץ חובה: ${f}`);

/* 2 — JS syntax */
const JS_FILES = ['app.js','i18n.js','settings.js','feed-extras.js','backend.js','auth.js','config.js','main.js'];
for (const f of JS_FILES) {
  if (!exists(f)) continue;
  try { execSync(`node --check "${path.join(ROOT, f)}"`, { stdio: 'pipe' }); oks.push(`תחביר תקין: ${f}`); }
  catch (e) {
    const err = String(e.stderr || e.message);
    const line = err.split('\n').find(l => l.includes('Error')) || err.split('\n')[0];
    errors.push(`שגיאת תחביר ב-${f}: ${line.trim()}`);
  }
}

/* 3 — forbidden leftovers (code files only; docs may mention history) */
const FORBIDDEN = [/MedAImind/i, /portable\//, /\.gemini/, /C:\\Users\\/i, /C:\/Users\//i, /file:\/\/\//];
const SCAN = ['index.html','app.js','i18n.js','settings.js','feed-extras.js','backend.js','auth.js','style.css','main.js'];
for (const f of SCAN) {
  if (!exists(f)) continue;
  const txt = read(f);
  for (const rx of FORBIDDEN) {
    if (rx.test(txt)) errors.push(`שריד אסור ${rx} בקובץ ${f}`);
  }
}
// portable/ is an agent toolkit belonging to another project. The rule exists
// so it never lands in this repo — if it's gitignored that risk is handled and
// having it on disk is the developer's business, so this drops to a warning.
if (exists('portable')) {
  const ignored = exists('.gitignore') && /^portable\/?\s*$/m.test(read('.gitignore'));
  if (ignored) warns.push('תיקיית portable/ קיימת בדיסק (ב-.gitignore, לא תיכנס לריפו)');
  else errors.push('תיקיית portable/ חזרה ואינה ב-.gitignore — היא תיכנס לריפו');
}
if (!errors.some(e => e.includes('שריד'))) oks.push('אפס שאריות MedAImind / נתיבים אבסולוטיים');

/* 4 — i18n coverage */
if (exists('index.html') && exists('i18n.js')) {
  const html = read('index.html');
  const dict = read('i18n.js');
  const used = new Set([...html.matchAll(/data-i18n(?:-ph)?="([a-z_0-9]+)"/g)].map(m => m[1]));
  const defined = new Set([...dict.matchAll(/^\s{2}([a-z_0-9]+):\s*\{/gm)].map(m => m[1]));
  const missing = [...used].filter(k => !defined.has(k));
  missing.length
    ? errors.push(`מפתחות i18n חסרים במילון: ${missing.join(', ')}`)
    : oks.push(`i18n: כל ${used.size} המפתחות ב-HTML מוגדרים`);
}

/* 5 — IMG paths exist */
if (exists('app.js')) {
  const app = read('app.js');
  const imgs = [...app.matchAll(/'(images\/[a-z0-9_.-]+)'/gi)].map(m => m[1]);
  const bad = imgs.filter(p => !exists(p));
  bad.length ? errors.push(`תמונות חסרות: ${bad.join(', ')}`) : oks.push(`תמונות: כל ${imgs.length} הנתיבים קיימים`);
}

/* 6 — script tags exist + order */
if (exists('index.html')) {
  const html = read('index.html');
  const raw = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]).filter(s => !s.startsWith('http'));
  const srcs = raw.map(s => s.split('?')[0]);   // R29: strip the ?v= cache-buster
  const badS = srcs.filter(s => !exists(s));
  badS.length ? errors.push(`script tags למקבצים שלא קיימים: ${badS.join(', ')}`) : oks.push(`סקריפטים: כל ${srcs.length} הקבצים קיימים`);
  const order = ['config.js','i18n.js','app.js','feed-extras.js','settings.js','backend.js'];
  const idx = order.map(f => srcs.indexOf(f));
  const sorted = idx.every((v, i) => i === 0 || v === -1 || idx.slice(0, i).every(p => p === -1 || p < v));
  sorted ? oks.push('סדר טעינת סקריפטים תקין') : warns.push(`סדר סקריפטים חשוד: ${srcs.join(' → ')}`);
}

/* 7 — duplicate function declarations in app.js */
if (exists('app.js')) {
  const names = [...read('app.js').matchAll(/^function\s+([A-Za-z0-9_]+)/gm)].map(m => m[1]);
  const dupes = names.filter((n, i) => names.indexOf(n) !== i);
  dupes.length ? errors.push(`פונקציות כפולות ב-app.js: ${[...new Set(dupes)].join(', ')}`) : oks.push('אין פונקציות כפולות ב-app.js');
}

/* 8 — size budget */
for (const f of ['app.js','style.css','i18n.js','index.html']) {
  if (!exists(f)) continue;
  const kb = Math.round(fs.statSync(path.join(ROOT, f)).size / 1024);
  kb > 120 ? warns.push(`${f} שוקל ${kb}KB — שקול פיצול`) : oks.push(`${f}: ${kb}KB`);
}

/* 8.5 — cache-busting: כל הנכסים המקומיים חייבים אותו ?v=.
   בלי זה משתמש חוזר מקבל JS ישן מול CSS חדש אחרי פריסה. */
if (exists('index.html')) {
  const html = read('index.html');
  const local = [...html.matchAll(/(?:src|href)="((?!https?:)[^"]+\.(?:js|css))(\?v=([a-z0-9.]+))?"/g)];
  const versions = new Set(local.map(m => m[3] || 'none'));
  if (!local.length) warns.push('לא נמצאו נכסים מקומיים ב-index.html');
  else if (versions.has('none')) errors.push(`נכסים בלי ?v= ב-index.html: ${local.filter(m => !m[3]).map(m => m[1]).join(', ')}`);
  else if (versions.size > 1) errors.push(`גרסאות ?v= לא אחידות: ${[...versions].join(', ')} — משתמש חוזר יקבל תערובת של ישן וחדש`);
  else oks.push(`cache-busting: כל ${local.length} הנכסים על ?v=${[...versions][0]}`);
}

/* 9 — PowerShell encoding: BOM-less UTF-8 + תו לא-אנגלי = שגיאת פרסור ב-PowerShell 5.1.
   כך make-web.ps1 נשבר בשקט מ-R25 והאתר החי נשאר על קוד ישן. */
for (const f of ['make-web.ps1','checkpoint.ps1']) {
  if (!exists(f)) continue;
  const buf = fs.readFileSync(path.join(ROOT, f));
  const hasBom = buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF;
  const nonAscii = [...buf.toString('utf8')].some(c => c.charCodeAt(0) > 126);
  if (nonAscii && !hasBom) errors.push(`${f}: תווים לא-אנגליים בלי BOM — PowerShell 5.1 יקרוס על "missing terminator". שמור כ-UTF-8 with BOM`);
  else oks.push(`קידוד תקין: ${f}`);
}

/* 10 — web/ freshness: הקבצים שנפרסים חייבים להיות זהים למקור */
const WEB_FILES = ['index.html','style.css','config.js','i18n.js','app.js','feed-extras.js','settings.js','auth.js','backend.js','manifest.json','robots.txt'];
if (exists('web')) {
  const stale = WEB_FILES.filter(f => {
    if (!exists(f)) return false;
    if (!exists(path.join('web', f))) return true;
    return read(f) !== read(path.join('web', f));
  });
  stale.length
    ? errors.push(`web/ לא מסונכרן (${stale.join(', ')}) — הרץ .\\make-web.ps1 ופרוס מחדש`)
    : oks.push(`web/: כל ${WEB_FILES.length} קבצי הפריסה תואמים למקור`);
}

/* 11 — XSS guard: תוכן שמגיע ממשתמשים אחרים חייב לעבור esc() לפני HTML */
if (exists('app.js')) {
  const app = read('app.js');
  if (!/function esc\(/.test(app)) errors.push('app.js: חסרה פונקציית esc() — הגנת ה-XSS הוסרה');
  const RAW = [
    '${post.product}', '${post.desc}', '${post.location}', '${post.category}',
    '${post.user.name}', '${post.user.bizName}', '${post.user.avatar}',
    '${m.text}', '${c.text}', '${c.user.name}', '${cv.preview}', '${n.text}',
  ];
  // רק שורות שבונות HTML נחשבות — אותן מחרוזות בתוך data רגיל (preview, text)
  // עוברות esc() בזמן הרינדור וזה תקין.
  const htmlLine = l => /<(div|span|img|video|article|p|h2|button|input|strong)\b/.test(l) || /class="/.test(l);
  const hits = [];
  read('app.js').split(/\r?\n/).forEach((l, i) => {
    if (!htmlLine(l)) return;
    RAW.forEach(p => { if (l.includes(p)) hits.push(`${p} (שורה ${i + 1})`); });
  });
  hits.length
    ? errors.push(`app.js: תוכן משתמש מוזרק ל-HTML בלי esc(): ${hits.join(', ')}`)
    : oks.push('XSS: כל תוכן המשתמש עובר esc()/safeUrl()');
}

/* report */
const stamp = new Date().toLocaleString('he-IL');
const lines = [];
lines.push(`# SYNC REPORT — ${stamp}`);
lines.push('');
lines.push(`## תוצאה: ${errors.length ? '❌ ' + errors.length + ' שגיאות' : '✅ הפרויקט מסונכרן ונקי'}${warns.length ? ` · ⚠️ ${warns.length} אזהרות` : ''}`);
lines.push('');
if (errors.length) { lines.push('## שגיאות'); errors.forEach(e => lines.push(`- ❌ ${e}`)); lines.push(''); }
if (warns.length)  { lines.push('## אזהרות'); warns.forEach(w => lines.push(`- ⚠️ ${w}`)); lines.push(''); }
lines.push('## עבר בהצלחה');
oks.forEach(o => lines.push(`- ✅ ${o}`));
lines.push('');

fs.writeFileSync(path.join(ROOT, 'SYNC_REPORT.md'), lines.join('\n'), 'utf8');
console.log(lines.join('\n'));
console.log(`\nהדוח נשמר: SYNC_REPORT.md`);
process.exit(errors.length ? 1 : 0);
