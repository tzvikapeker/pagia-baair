# CHECKPOINT — מצב הפרויקט

## נקודת שמירה: R21 · 2026-07-02

### מה כלול בנקודה הזו
- אפליקציה מלאה: פיד כפול + composer + פיד אינסופי + תמונות/וידאו
- רב-משתמשים חי על Supabase (posts + chat_messages + storage + realtime)
- צ'אט אמיתי: היסטוריה, מקליד עכשיו, אישורי קריאה, נוכחות, מובייל
- התראות לפי מיקום (עיר + שכונות + GPS) דרך מסך הגדרות
- 4 שפות (he/en/ru/ar) עם RTL/LTR אוטומטי
- הופרד לגמרי מ-MedAImind (portable/ נמחקה)

### קבצים קריטיים (אל תאבד אותם)
`config.js` — המפתחות לפרויקט Supabase החי. בלעדיו האפליקציה חוזרת למצב דמו.
`supabase-schema.sql` — משחזר את ה-DB מאפס במקרה אסון.

---

## איך יוצרים צ'קפוינט (גיבוי)

PowerShell בתיקיית הפרויקט:
```
.\checkpoint.ps1
```
יוצר קובץ `backups\pagia-baair_YYYY-MM-DD_HHmm.zip` עם כל הפרויקט (בלי node_modules).

### מומלץ חד-פעמית: מעבר ל-git (צ'קפוינטים מקצועיים)
```
cd C:\dev\pagia-baair
git init
git add -A
git commit -m "checkpoint R21 - multi-user, chat, i18n, location alerts"
```
ומכאן והלאה אחרי כל שינוי גדול: `git add -A ; git commit -m "תיאור"`.
שחזור לנקודה קודמת: `git log --oneline` ואז `git checkout <hash> -- .`

---

## איך משחזרים מגיבוי ZIP
1. חלץ את ה-zip לתיקייה חדשה (או על הקיימת).
2. `npm install` (משחזר את Electron).
3. `npm start`.
4. אם ה-DB נמחק אי-פעם: הרץ את `supabase-schema.sql` ב-SQL Editor של Supabase.

## מה לא נשמר בגיבוי (בכוונה)
- `node_modules/` — משוחזר עם `npm install`.
- הנתונים החיים ב-Supabase (פוסטים/הודעות) — הם בענן; Supabase שומר עליהם.
  לגיבוי נתונים: Supabase Dashboard → Database → Backups.
