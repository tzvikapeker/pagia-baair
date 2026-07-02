# התחברות (Auth) — מצב והפעלה

## מה עובד עכשיו, מיד
- **הרשמה + התחברות עם אימייל וסיסמה** (כולל בחירת שם משתמש) — עובד ברגע שהקוד מפורסם.
- Site URL כבר הוגדר לכתובת החיה, אז קישורי האישור והחזרה מ-OAuth מגיעים לאתר הנכון.
- ברירת המחדל: Supabase שולח מייל אישור בהרשמה (בטוח יותר). המשתמש לוחץ על הקישור וזהו.
  - רוצה הרשמה מיידית בלי מייל אישור? Supabase → Authentication → Sign In / Providers → Email → כבה "Confirm email".

## התחברות עם Google — צריך הפעלה חד-פעמית (~10 דק')
כפתור ה-Google כבר בקוד. כדי שיעבוד צריך לחבר חשבון Google Cloud:

1. **Google Cloud Console** → צור פרויקט → APIs & Services → **OAuth consent screen** (External, מלא שם + אימייל).
2. **Credentials → Create credentials → OAuth client ID → Web application**.
3. תחת **Authorized redirect URIs** הדבק את כתובת ה-callback של Supabase:
   `https://gdenjwpcsvtheejjpxir.supabase.co/auth/v1/callback`
4. העתק את **Client ID** ו-**Client Secret**.
5. **Supabase → Authentication → Sign In / Providers → Google** → הפעל → הדבק את השניים → Save.

זהו — כפתור "המשך עם Google" יעבוד. (עד אז, השתמשו בהרשמה עם אימייל.)

אם תרצה, בשיחה הבאה אני יכול ללוות אותך בדפדפן דרך שלבי Google Cloud.

## מה קורה ברגע שמתחברים
- הזהות אמיתית: השם מגיע מהחשבון (Google) או משם המשתמש שבחרת בהרשמה.
- רק משתמשים מחוברים יכולים לפרסם ולשלוח הודעות (RLS בשרת אוכף זאת).
- כל אחד יכול למחוק/לערוך **רק את הפוסטים של עצמו** (owner-only, נאכף בשרת).
