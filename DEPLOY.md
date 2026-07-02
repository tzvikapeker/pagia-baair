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
3. Build command: השאר ריק. Publish directory: `.`
4. מכאן: כל `git push` מפרסם אוטומטית את הגרסה החדשה.

`.gitignore` כבר מגדיר ש-node_modules והגיבויים לא יעלו.

---

## Supabase — צריך משהו?

**כרגע לא.** ה-publishable key בטוח לחשיפה וההגנה היא ב-RLS, וזה עובד מכל כתובת.
כשנוסיף התחברות אמיתית (Auth) בעתיד — אז נצטרך להוסיף את כתובת האתר תחת
Supabase → Authentication → URL Configuration. לא לפני.

---

## אחרי הפרסום — לבדוק
- פותחים את הכתובת בטלפון וגם במחשב.
- ⚙️ הגדרות → שם + זיהוי מיקום (עכשיו ה-GPS יעבוד טוב כי זה HTTPS).
- מפרסמים מוצר בטלפון → קופץ מיד במחשב. זו רשת חיה. ✅

## אבטחה לפני קהל גדול (השלב הבא, לא חוסם פרסום ראשוני)
מחיקת/עריכת פוסט · דיווח/חסימה · rate-limiting · התחברות אמיתית.
מפורט ב-README (מה עוד לא קיים) וב-CHANGELOG.
