# images/ — נכסים גרפיים

| קובץ | שימוש |
|---|---|
| logo.svg | הלוגו (שקית + עלה) — splash + סרגל עליון |
| hummus / bread / vegetables / yogurt / cheese .svg | תמונות placeholder לפוסטי פגיה (דמו) |
| cleaning / pasta / cosmetics / drinks .svg | תמונות placeholder לפוסטי סטוק (דמו) |

הנתיבים מוגדרים ב-`app.js` → `const IMG` (יחסיים, ניידים).
אם קובץ חסר — ה-UI נופל לאמוג'י (`imgFallback`), שום דבר לא נשבר.
תמונות של משתמשים אמיתיים לא נשמרות כאן — הן עולות ל-Supabase Storage.

להחלפה בתמונות אמיתיות: שמור קובץ באותו שם (או עדכן את IMG ב-app.js).
