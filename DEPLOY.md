# פרסום לאוויר — שהעולם ייכנס לאפליקציה 🌍

האפליקציה היא אתר סטטי (HTML/CSS/JS טהור), אז הפרסום קל וחינמי.
ה-backend (Supabase) כבר בענן — לא צריך לגעת בו.

---

## הכנה (פעם אחת)
ב-PowerShell בתיקיית הפרויקט:
```
cd C:\dev\pagia-baair
.\make-web.ps1
```
נוצרת תיקיית `web\` שמכילה רק את מה שהדפדפן צריך (בלי Electron, בלי מסמכים, בלי node_modules).

> **לפני כל פרסום — העלה את מספר הגרסה בכתובות הנכסים.** ב-`index.html` כל
> `<script>`/`<link>` מקומי נגמר ב-`?v=r29`. בלי העלאה, דפדפן של משתמש חוזר
> עלול לטעון JS ישן מול CSS חדש. `node sync-agent.cjs` נכשל אם הגרסאות לא אחידות.

---

## מסלול A — הכי פשוט (2 דקות, בלי חשבון, בלי git)

1. גש אל **https://app.netlify.com/drop**
2. גרור את תיקיית **`web`** אל תוך העמוד.
3. תוך כ-20 שניות תקבל כתובת חיה, למשל `https://random-name-123.netlify.app`.
4. זהו — שלח את הקישור לכל אחד, מכל מכשיר בעולם. הם רואים את אותם פוסטים ואת אותו צ'אט.

> לשם יפה: ב-Netlify → Site settings → Change site name (למשל `pagia-baair`) → הכתובת תהיה `https://pagia-baair.netlify.app`.
> לדומיין משלך (pagia.co.il): Netlify → Domain settings → Add custom domain.

**לעדכן אחרי שינויים:** הרץ שוב `.\make-web.ps1` וגרור שוב את `web` לאותו אתר (Deploys → drag to redeploy).

---

## מסלול B — מקצועי, עדכון אוטומטי (GitHub + Netlify)

חד-פעמי:
```
cd C:\dev\pagia-baair
git init
git add -A
git commit -m "pagia-baair"
```
1. פתח repo ב-GitHub והעלה אליו (`git remote add origin ...` → `git push`).
2. ב-Netlify → **Add new site → Import from Git** → בחר את ה-repo.
3. אין מה למלא — `netlify.toml` שבשורש כבר מגדיר `publish = "web"` (רק הבאנדל של הדפדפן,
   בלי המסמכים, הסקריפטים ו-`supabase-schema.sql`).
4. מכאן: כל `git push` מפרסם אוטומטית את הגרסה החדשה — **בתנאי שהרצת `.\make-web.ps1`
   וקומיטת גם את `web/`.** `node sync-agent.cjs` נכשל אם שכחת.

`.gitignore` כבר מגדיר ש-node_modules והגיבויים לא יעלו.

---

## Supabase — צריך משהו?

**לא.** ה-publishable key בטוח לחשיפה וההגנה היא ב-RLS, וזה עובד מכל כתובת.
ההתחברות האמיתית כבר קיימת (R26), וה-Site URL כבר מוגדר תחת
Supabase → Authentication → URL Configuration. אם תעבור לכתובת/דומיין חדש — עדכן אותו שם,
אחרת ההתחברות תחזיר את המשתמש לכתובת הישנה. פרטים ב-AUTH_SETUP.md.

---

## אחרי הפרסום — לבדוק
- פותחים את הכתובת בטלפון וגם במחשב.
- ⚙️ הגדרות → שם + זיהוי מיקום (עכשיו ה-GPS יעבוד טוב כי זה HTTPS).
- מפרסמים מוצר בטלפון → קופץ מיד במחשב. זו רשת חיה. ✅

## אבטחה לפני קהל גדול
כבר קיים: התחברות אמיתית + RLS בעלות (R26) · בריחת HTML לכל תוכן משתמש (R28).
עוד חסר: דיווח/חסימה · rate-limiting · מודרציה של תמונות.
מפורט ב-README (מה עוד לא קיים) וב-CHANGELOG.
