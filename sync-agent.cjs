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
const REQUIRED = ['index.html','app.js','i18n.js','settings.js','feed-extras.js','backend.js','config.js','style.css','main.js','package.json','supabase-schema.sql','README.md','CHANGELOG.md','VISION.md','CHECKPOINT.md','checkpoint.ps1','images/logo.svg'];
for (const f of REQUIRED) exists(f) ? oks.push(`קיים: ${f}`) : errors.push(`חסר קובץ חובה: ${f}`);

/* 2 — JS syntax */
const JS_FILES = ['app.js','i18n.js','settings.js','feed-extras.js','backend.js','config.js','main.js'];
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
const SCAN = ['index.html','app.js','i18n.js','settings.js','feed-extras.js','backend.js','style.css','main.js'];
for (const f of SCAN) {
  if (!exists(f)) continue;
  const txt = read(f);
  for (const rx of FORBIDDEN) {
    if (rx.test(txt)) errors.push(`שריד אסור ${rx} בקובץ ${f}`);
  }
}
if (exists('portable')) errors.push('תיקיית portable/ חזרה — מחק אותה (שריד MedAImind)');
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
  const srcs = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]).filter(s => !s.startsWith('http'));
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
