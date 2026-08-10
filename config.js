'use strict';
// ============================================================
// config.js — חיבור ל-Supabase
// מלא את שני הערכים מתוך: Supabase Dashboard → Settings → API
// כל עוד הם ריקים/placeholder — האפליקציה רצה במצב דמו מקומי.
// ה-anon key מיועד לצד-לקוח והוא בטוח לחשיפה (מוגן ע"י RLS).
// ============================================================
// R38: הועבר מ-ap-northeast-1 (טוקיו) ל-EU. זמן הרשת ירד מ-304ms ל-92ms —
// כל פעולה באפליקציה מהירה פי שלושה למשתמש בישראל.
const SUPABASE_URL      = 'https://vwpxclztcdtceluhxlis.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_3uDDOsYxOCH12BOwZcZSpQ_NI8ppI55';
