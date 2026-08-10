'use strict';
// =====================================================================
// i18n.js — 4-language support: Hebrew, English, Russian, Arabic
// RTL: he, ar   |   LTR: en, ru
// Loaded BEFORE app.js. Exposes: t(), setLanguage(), applyI18n(), getLang()
// app.js may set window.__rerenderDynamic to re-render dynamic content on switch.
// =====================================================================

const I18N_LANGS = {
  he: { name: 'עברית', flag: '🇮🇱', dir: 'rtl' },
  en: { name: 'English', flag: '🇬🇧', dir: 'ltr' },
  ru: { name: 'Русский', flag: '🇷🇺', dir: 'ltr' },
  ar: { name: 'العربية', flag: '🇸🇦', dir: 'rtl' },
};

const I18N = {
  // brand / chrome
  brand:            { he:'פגיה בעיר', en:'Pagia BaIr', ru:'Пагия ба-Ир', ar:'بَجاعة في المدينة' },
  tagline:          { he:'שתף לפני שנגמר', en:'Share before it’s gone', ru:'Поделись, пока не кончилось', ar:'شارك قبل أن ينتهي' },
  search_ph:        { he:'חפש מוצרים, ערים, עסקים...', en:'Search products, cities, businesses...', ru:'Поиск товаров, городов, бизнесов...', ar:'ابحث عن منتجات، مدن، أعمال...' },
  notifications:    { he:'התראות', en:'Notifications', ru:'Уведомления', ar:'الإشعارات' },
  composer_ph:      { he:'מה תרצה לשתף?', en:'What do you want to share?', ru:'Чем хотите поделиться?', ar:'بماذا تريد أن تشارك؟' },
  composer_photo:   { he:'תמונה / וידאו', en:'Photo / Video', ru:'Фото / Видео', ar:'صورة / فيديو' },
  composer_stock:   { he:'סטוק / מכירה', en:'Stock / Sale', ru:'Сток / Продажа', ar:'مخزون / بيع' },
  composer_pagia:   { he:'פגיה', en:'Expiring', ru:'Истекающее', ar:'منتهي' },
  // side nav
  nav_feed:         { he:'פיד', en:'Feed', ru:'Лента', ar:'الرئيسية' },
  nav_explore:      { he:'גלה', en:'Explore', ru:'Обзор', ar:'استكشف' },
  nav_saved:        { he:'שמורים', en:'Saved', ru:'Сохранённые', ar:'المحفوظات' },
  nav_chat:         { he:'צ’אט', en:'Chat', ru:'Чат', ar:'الدردشة' },
  nav_profile:      { he:'פרופיל', en:'Profile', ru:'Профиль', ar:'الملف' },
  // sidebar stats
  stat_products_saved: { he:'מוצרים נשמרו', en:'products saved', ru:'товаров сохранено', ar:'منتجات محفوظة' },
  stat_users_nearby:   { he:'משתמשים קרובים', en:'users nearby', ru:'пользователей рядом', ar:'مستخدمون قريبون' },
  stat_active_biz:     { he:'עסקים פעילים', en:'active businesses', ru:'активных бизнесов', ar:'أعمال نشطة' },
  // feed switcher
  tab_pagia:        { he:'פגיה בעיר', en:'Expiring', ru:'Истекающее', ar:'المنتهية' },
  tab_pagia_desc:   { he:'מוצרים שעומדים לפוג', en:'Products about to expire', ru:'Товары на исходе срока', ar:'منتجات على وشك الانتهاء' },
  tab_stock:        { he:'סטוק בזול', en:'Cheap Stock', ru:'Дешёвый сток', ar:'مخزون رخيص' },
  tab_stock_desc:   { he:'עודפי סטוק במחיר', en:'Surplus stock, low price', ru:'Излишки по низкой цене', ar:'فائض مخزون بسعر منخفض' },
  // pagia/stock feed titles + filters
  pagia_feed_title: { he:'פיד הפגיות', en:'Expiring feed', ru:'Лента истекающих', ar:'خلاصة المنتهية' },
  stock_feed_title: { he:'סטוק בזול', en:'Cheap Stock', ru:'Дешёвый сток', ar:'مخزون رخيص' },
  filter_all:       { he:'הכל', en:'All', ru:'Все', ar:'الكل' },
  filter_today:     { he:'היום', en:'Today', ru:'Сегодня', ar:'اليوم' },
  filter_nearby:    { he:'קרוב אליי', en:'Nearby', ru:'Рядом', ar:'بالقرب مني' },
  filter_free:      { he:'חינם', en:'Free', ru:'Бесплатно', ar:'مجاني' },
  free:             { he:'חינם', en:'Free', ru:'Бесплатно', ar:'مجاني' },
  filter_business:  { he:'עסקים', en:'Businesses', ru:'Бизнесы', ar:'أعمال' },
  filter_private:   { he:'פרטיים', en:'Private', ru:'Частные', ar:'أفراد' },
  filter_deal:      { he:'מבצעים -50%+', en:'Deals -50%+', ru:'Скидки -50%+', ar:'عروض -50%+' },
  fab_post:         { he:'פרסם מוצר', en:'Post product', ru:'Разместить товар', ar:'انشر منتج' },
  // explore
  explore_title:    { he:'גלה בעיר שלך', en:'Explore your city', ru:'Открой свой город', ar:'استكشف مدينتك' },
  explore_sub:      { he:'פגיות, סטוקים ודילים קרוב אליך', en:'Expiring items, stock & deals near you', ru:'Истекающее, сток и скидки рядом', ar:'منتهية، مخزون وعروض بالقرب منك' },
  explore_categories: { he:'קטגוריות', en:'Categories', ru:'Категории', ar:'الفئات' },
  explore_by_city:  { he:'לפי עיר', en:'By city', ru:'По городу', ar:'حسب المدينة' },
  trending_tags:    { he:'תגיות פופולריות', en:'Trending tags', ru:'Популярные теги', ar:'وسوم رائجة' },
  // categories (display)
  cat_food:         { he:'מזון', en:'Food', ru:'Еда', ar:'طعام' },
  cat_dairy:        { he:'חלב', en:'Dairy', ru:'Молочное', ar:'ألبان' },
  cat_dairy_long:   { he:'מוצרי חלב', en:'Dairy products', ru:'Молочные продукты', ar:'منتجات ألبان' },
  cat_bread:        { he:'לחם ומאפים', en:'Bread & bakery', ru:'Хлеб и выпечка', ar:'خبز ومخبوزات' },
  cat_veg:          { he:'ירקות', en:'Vegetables', ru:'Овощи', ar:'خضروات' },
  cat_fruit:        { he:'פירות', en:'Fruit', ru:'Фрукты', ar:'فواكه' },
  cat_drinks:       { he:'שתייה', en:'Drinks', ru:'Напитки', ar:'مشروبات' },
  cat_clean:        { he:'ניקיון', en:'Cleaning', ru:'Уборка', ar:'تنظيف' },
  cat_cosm:         { he:'קוסמטיקה', en:'Cosmetics', ru:'Косметика', ar:'مستحضرات تجميل' },
  cat_other:        { he:'אחר', en:'Other', ru:'Другое', ar:'أخرى' },
  // cities (display)
  city_tlv:         { he:'תל אביב', en:'Tel Aviv', ru:'Тель-Авив', ar:'تل أبيب' },
  city_jlm:         { he:'ירושלים', en:'Jerusalem', ru:'Иерусалим', ar:'القدس' },
  city_hfa:         { he:'חיפה', en:'Haifa', ru:'Хайфа', ar:'حيفا' },
  city_ntn:         { he:'נתניה', en:'Netanya', ru:'Нетания', ar:'نتانيا' },
  city_bs:          { he:'באר שבע', en:'Beer Sheva', ru:'Беэр-Шева', ar:'بئر السبع' },
  city_rl:          { he:'ראשון לציון', en:'Rishon LeZion', ru:'Ришон-ле-Цион', ar:'ريشون لتسيون' },
  // trending tags (display)
  tag_free:         { he:'חינם', en:'Free', ru:'Бесплатно', ar:'مجاني' },
  tag_stock:        { he:'סטוק', en:'Stock', ru:'Сток', ar:'مخزون' },
  tag_vegan:        { he:'טבעוני', en:'Vegan', ru:'Веган', ar:'نباتي' },
  tag_home:         { he:'ביתי', en:'Homemade', ru:'Домашнее', ar:'منزلي' },
  tag_business:     { he:'עסק', en:'Business', ru:'Бизнес', ar:'عمل' },
  tag_kosher:       { he:'כשר', en:'Kosher', ru:'Кошер', ar:'كوشير' },
  // saved
  saved_title:      { he:'שמורים שלי', en:'My saved', ru:'Мои сохранённые', ar:'محفوظاتي' },
  saved_pagia:      { he:'פגיות', en:'Expiring', ru:'Истекающие', ar:'منتهية' },
  saved_stock:      { he:'סטוק', en:'Stock', ru:'Сток', ar:'مخزون' },
  empty_saved:      { he:'אין פרסומים שמורים עדיין', en:'No saved posts yet', ru:'Пока нет сохранённых', ar:'لا منشورات محفوظة بعد' },
  go_to_feed:       { he:'עבור לפיד', en:'Go to feed', ru:'Перейти к ленте', ar:'اذهب إلى الرئيسية' },
  // chat
  chat_empty:       { he:'בחר שיחה מהרשימה', en:'Select a conversation', ru:'Выберите чат', ar:'اختر محادثة' },
  chat_input_ph:    { he:'כתוב הודעה...', en:'Type a message...', ru:'Введите сообщение...', ar:'اكتب رسالة...' },
  send:             { he:'שלח', en:'Send', ru:'Отправить', ar:'إرسال' },
  // profile
  profile_private:  { he:'פרטי', en:'Private', ru:'Частный', ar:'خاص' },
  edit_profile:     { he:'ערוך פרופיל', en:'Edit profile', ru:'Редактировать профиль', ar:'تعديل الملف' },
  stat_posts:       { he:'פרסומים', en:'Posts', ru:'Публикации', ar:'منشورات' },
  stat_followers:   { he:'עוקבים', en:'Followers', ru:'Подписчики', ar:'متابعون' },
  stat_following:   { he:'עוקב אחרי', en:'Following', ru:'Подписки', ar:'يتابع' },
  stat_saved:       { he:'שמורתי', en:'Saved', ru:'Сохранённые', ar:'محفوظات' },
  my_pagia:         { he:'פגיות שלי', en:'My expiring', ru:'Мои истекающие', ar:'منتهياتي' },
  my_stock:         { he:'סטוק שלי', en:'My stock', ru:'Мой сток', ar:'مخزوني' },
  // widgets
  widget_expiry:    { he:'עומדים לפוג היום', en:'Expiring today', ru:'Истекают сегодня', ar:'تنتهي اليوم' },
  widget_deals:     { he:'דילי סטוק חמים', en:'Hot stock deals', ru:'Горячие скидки', ar:'عروض ساخنة' },
  widget_leaders:   { he:'שומרי הסביבה', en:'Eco leaders', ru:'Хранители района', ar:'حُماة البيئة' },
  no_urgent:        { he:'אין מוצרים דחופים', en:'No urgent items', ru:'Нет срочных', ar:'لا عناصر عاجلة' },
  no_deals:         { he:'אין דילים', en:'No deals', ru:'Нет скидок', ar:'لا عروض' },
  // post modal
  modal_post_title: { he:'פרסם מוצר', en:'Post a product', ru:'Разместить товар', ar:'نشر منتج' },
  label_post_type:  { he:'סוג פרסום', en:'Post type', ru:'Тип публикации', ar:'نوع النشر' },
  ptype_pagia:      { he:'פגיה', en:'Expiring', ru:'Истекающее', ar:'منتهي' },
  ptype_pagia_desc: { he:'עומד לפוג', en:'About to expire', ru:'Скоро истечёт', ar:'على وشك الانتهاء' },
  ptype_stock:      { he:'סטוק בזול', en:'Cheap stock', ru:'Дешёвый сток', ar:'مخزون رخيص' },
  ptype_stock_desc: { he:'עודף סטוק / מכירה', en:'Surplus / sale', ru:'Излишки / продажа', ar:'فائض / بيع' },
  label_seller_type:{ he:'סוג מוכר', en:'Seller type', ru:'Тип продавца', ar:'نوع البائع' },
  seller_private:   { he:'פרטי', en:'Private', ru:'Частный', ar:'فرد' },
  seller_business:  { he:'עסק', en:'Business', ru:'Бизнес', ar:'عمل' },
  label_biz_name:   { he:'שם העסק', en:'Business name', ru:'Название бизнеса', ar:'اسم العمل' },
  ph_biz_name:      { he:'לדוגמא: מאפייה לחמניה', en:'e.g. Corner Bakery', ru:'напр.: Пекарня', ar:'مثال: مخبز الزاوية' },
  upload_click:     { he:'לחץ להוספת תמונה', en:'Click to add image', ru:'Нажмите, чтобы добавить фото', ar:'اضغط لإضافة صورة' },
  upload_hint:      { he:'JPG, PNG עד 10MB', en:'JPG, PNG up to 10MB', ru:'JPG, PNG до 10 МБ', ar:'JPG، PNG حتى 10MB' },
  label_product_name:{ he:'שם המוצר', en:'Product name', ru:'Название товара', ar:'اسم المنتج' },
  ph_product_name:  { he:'לדוגמא: חומוס ביתי', en:'e.g. Homemade hummus', ru:'напр.: Домашний хумус', ar:'مثال: حمص منزلي' },
  label_category:   { he:'קטגוריה', en:'Category', ru:'Категория', ar:'الفئة' },
  label_expiry:     { he:'תאריך פקיעה', en:'Expiry date', ru:'Срок годности', ar:'تاريخ الانتهاء' },
  label_price:      { he:'מחיר (₪ / חינם)', en:'Price (₪ / free)', ru:'Цена (₪ / беспл.)', ar:'السعر (₪ / مجاني)' },
  label_orig_price: { he:'מחיר מקורי (₪)', en:'Original price (₪)', ru:'Первонач. цена (₪)', ar:'السعر الأصلي (₪)' },
  label_sale_price: { he:'מחיר מכירה (₪)', en:'Sale price (₪)', ru:'Цена продажи (₪)', ar:'سعر البيع (₪)' },
  label_quantity:   { he:'כמות זמינה', en:'Available quantity', ru:'Доступное количество', ar:'الكمية المتاحة' },
  ph_quantity:      { he:'לדוגמא: 50', en:'e.g. 50', ru:'напр.: 50', ar:'مثال: 50' },
  label_location:   { he:'מיקום', en:'Location', ru:'Местоположение', ar:'الموقع' },
  ph_location:      { he:'עיר, שכונה...', en:'City, neighborhood...', ru:'Город, район...', ar:'مدينة، حي...' },
  label_description:{ he:'תיאור', en:'Description', ru:'Описание', ar:'الوصف' },
  ph_description:   { he:'ספר על המוצר...', en:'Describe the product...', ru:'Опишите товар...', ar:'صف المنتج...' },
  label_tags:       { he:'תגיות', en:'Tags', ru:'Теги', ar:'الوسوم' },
  tag_longstore:    { he:'אחסנה ארוכה', en:'Long shelf life', ru:'Долгое хранение', ar:'تخزين طويل' },
  cancel:           { he:'ביטול', en:'Cancel', ru:'Отмена', ar:'إلغاء' },
  publish_now:      { he:'פרסם עכשיו', en:'Publish now', ru:'Опубликовать', ar:'انشر الآن' },
  // dynamic (app.js)
  expiry_today:     { he:'פג היום!', en:'Expires today!', ru:'Истекает сегодня!', ar:'ينتهي اليوم!' },
  expiry_tomorrow:  { he:'נשאר יום אחד', en:'1 day left', ru:'Остался 1 день', ar:'يوم واحد متبقٍ' },
  expiry_days:      { he:'נשאר {n} ימים', en:'{n} days left', ru:'Осталось {n} дн.', ar:'{n} أيام متبقية' },
  expiry_left_short:{ he:'נשאר יום!', en:'1 day left!', ru:'1 день!', ar:'يوم واحد!' },
  price_free:       { he:'חינם', en:'Free', ru:'Бесплатно', ar:'مجاني' },
  btn_save:         { he:'שמור', en:'Save', ru:'Сохранить', ar:'حفظ' },
  btn_chat:         { he:'צ’אט', en:'Chat', ru:'Чат', ar:'دردشة' },
  btn_chat_seller:  { he:'צ’אט עם המוכר', en:'Chat with seller', ru:'Чат с продавцом', ar:'دردشة مع البائع' },
  stock_label:      { he:'סטוק בזול', en:'Cheap stock', ru:'Дешёвый сток', ar:'مخزون رخيص' },
  savings:          { he:'חיסכון ₪{n}', en:'Save ₪{n}', ru:'Экономия ₪{n}', ar:'وفّر ₪{n}' },
  units:            { he:'{n} יחידות', en:'{n} units', ru:'{n} шт.', ar:'{n} وحدة' },
  badge_private:    { he:'פרטי', en:'Private', ru:'Частный', ar:'خاص' },
  comment_first:    { he:'היה הראשון להגיב!', en:'Be the first to comment!', ru:'Прокомментируйте первым!', ar:'كن أول من يعلّق!' },
  comment_ph:       { he:'כתוב תגובה...', en:'Write a comment...', ru:'Написать комментарий...', ar:'اكتب تعليقاً...' },
  detail_send_msg:  { he:'שלח הודעה', en:'Send message', ru:'Отправить сообщение', ar:'أرسل رسالة' },
  detail_chat_with: { he:'צ’אט עם', en:'Chat with', ru:'Чат с', ar:'دردشة مع' },
  seller_business_verified: { he:'עסק מאומת', en:'Verified business', ru:'Проверенный бизнес', ar:'عمل موثّق' },
  seller_private_label: { he:'מוכר פרטי', en:'Private seller', ru:'Частный продавец', ar:'بائع خاص' },
  mark_taken:       { he:'סמן כנלקח!', en:'Mark as taken!', ru:'Отметить как забрано!', ar:'وضع علامة: أُخذ!' },
  mark_sold:        { he:'סמן כנמכר!', en:'Mark as sold!', ru:'Отметить как продано!', ar:'وضع علامة: بيع!' },
  // R29 — status shown ON the card, as opposed to the button label above
  status_taken:     { he:'נלקח', en:'Taken', ru:'Забрано', ar:'أُخذ' },
  status_sold:      { he:'נמכר', en:'Sold', ru:'Продано', ar:'بيع' },
  // toasts
  toast_saved:      { he:'נשמר ברשימה שלך', en:'Saved to your list', ru:'Сохранено в списке', ar:'حُفظ في قائمتك' },
  toast_unsaved:    { he:'הוסר מהרשימה', en:'Removed from list', ru:'Удалено из списка', ar:'أُزيل من القائمة' },
  toast_taken:      { he:'המוצר סומן כנלקח!', en:'Marked as taken!', ru:'Отмечено как забрано!', ar:'وُضع كأُخذ!' },
  toast_sold:       { he:'המוצר סומן כנמכר!', en:'Marked as sold!', ru:'Отмечено как продано!', ar:'وُضع كبيع!' },
  toast_profile_updated: { he:'הפרופיל עודכן!', en:'Profile updated!', ru:'Профиль обновлён!', ar:'تم تحديث الملف!' },
  toast_name_required:   { he:'שם לא יכול להיות ריק', en:'Name can’t be empty', ru:'Имя не может быть пустым', ar:'الاسم لا يمكن أن يكون فارغاً' },
  toast_fill_name_loc:   { he:'מלא שם מוצר ומיקום', en:'Fill product name & location', ru:'Заполните название и место', ar:'أدخل اسم المنتج والموقع' },
  toast_pick_expiry:     { he:'בחר תאריך פקיעה', en:'Pick an expiry date', ru:'Выберите срок годности', ar:'اختر تاريخ الانتهاء' },
  toast_enter_sale:      { he:'הזן מחיר מכירה', en:'Enter a sale price', ru:'Введите цену продажи', ar:'أدخل سعر البيع' },
  toast_enter_biz:       { he:'הזן שם עסק', en:'Enter a business name', ru:'Введите название бизнеса', ar:'أدخل اسم العمل' },
  toast_published:       { he:'המוצר פורסם בהצלחה!', en:'Published successfully!', ru:'Успешно опубликовано!', ar:'تم النشر بنجاح!' },
  toast_showing_city:    { he:'מציג מוצרים ב{x}', en:'Showing items in {x}', ru:'Показаны товары в {x}', ar:'عرض العناصر في {x}' },
  toast_showing_tag:     { he:'מציג: {x}', en:'Showing: {x}', ru:'Показано: {x}', ar:'عرض: {x}' },
  toast_new_live:        { he:'פוסט חדש התפרסם!', en:'New post just published!', ru:'Новый пост!', ar:'منشور جديد!' },
  // edit profile modal
  edit_profile_title:{ he:'עריכת פרופיל', en:'Edit profile', ru:'Редактировать профиль', ar:'تعديل الملف' },
  field_name:       { he:'שם', en:'Name', ru:'Имя', ar:'الاسم' },
  field_city:       { he:'עיר', en:'City', ru:'Город', ar:'المدينة' },
  field_bio:        { he:'תיאור קצר', en:'Short bio', ru:'Краткое описание', ar:'نبذة قصيرة' },
  save_changes:     { he:'שמור שינויים', en:'Save changes', ru:'Сохранить', ar:'حفظ التغييرات' },
  language:         { he:'שפה', en:'Language', ru:'Язык', ar:'اللغة' },
  login:            { he:'התחבר', en:'Log in', ru:'Войти', ar:'دخول' },
  logout:           { he:'התנתק', en:'Log out', ru:'Выйти', ar:'خروج' },
  login_title:      { he:'התחברות', en:'Log in', ru:'Вход', ar:'تسجيل الدخول' },
  signup_title:     { he:'הרשמה', en:'Sign up', ru:'Регистрация', ar:'إنشاء حساب' },
  login_google:     { he:'המשך עם Google', en:'Continue with Google', ru:'Продолжить с Google', ar:'المتابعة مع Google' },
  login_or:         { he:'או', en:'or', ru:'или', ar:'أو' },
  login_email:      { he:'אימייל', en:'Email', ru:'Эл. почта', ar:'البريد الإلكتروني' },
  login_pass:       { he:'סיסמה', en:'Password', ru:'Пароль', ar:'كلمة المرور' },
  login_do:         { he:'התחבר', en:'Log in', ru:'Войти', ar:'دخول' },
  signup_do:        { he:'הירשם', en:'Sign up', ru:'Зарегистрироваться', ar:'إنشاء حساب' },
  login_need:       { he:'אין לך חשבון? הירשם', en:'No account? Sign up', ru:'Нет аккаунта? Регистрация', ar:'ليس لديك حساب؟ سجّل' },
  login_have:       { he:'כבר יש לך חשבון? התחבר', en:'Have an account? Log in', ru:'Уже есть аккаунт? Войти', ar:'لديك حساب؟ دخول' },
  login_required:   { he:'התחבר כדי להמשיך', en:'Log in to continue', ru:'Войдите, чтобы продолжить', ar:'سجّل الدخول للمتابعة' },
  login_to_post:    { he:'התחבר כדי לפרסם', en:'Log in to post', ru:'Войдите, чтобы публиковать', ar:'سجّل الدخول للنشر' },
  login_to_chat:    { he:'התחבר כדי לשלוח הודעה', en:'Log in to chat', ru:'Войдите, чтобы писать', ar:'سجّل الدخول للمراسلة' },
  // R30 — likes and comments are real rows now, so they need an account
  login_to_like:    { he:'התחבר כדי לסמן לייק', en:'Log in to like', ru:'Войдите, чтобы лайкать', ar:'سجّل الدخول للإعجاب' },
  login_to_comment: { he:'התחבר כדי להגיב', en:'Log in to comment', ru:'Войдите, чтобы комментировать', ar:'سجّل الدخول للتعليق' },
  comment_failed:   { he:'התגובה לא נשמרה', en:'Comment was not saved', ru:'Комментарий не сохранён', ar:'لم يُحفظ التعليق' },
  demo_mode:        { he:'מצב דמו — אין חיבור לשרת, המודעות כאן לדוגמה בלבד', en:'Demo mode — no server connection, these listings are samples', ru:'Демо-режим — нет связи с сервером, объявления примерные', ar:'وضع تجريبي — لا اتصال بالخادم، هذه إعلانات نموذجية' },
  // R31 — feed empty states
  empty_be_first:   { he:'עוד אין מודעות באזור. תהיה הראשון שמשתף', en:'No listings yet. Be the first to share', ru:'Пока нет объявлений. Будьте первым', ar:'لا إعلانات بعد. كن أول من يشارك' },
  empty_post_now:   { he:'פרסם מודעה', en:'Post a listing', ru:'Разместить объявление', ar:'انشر إعلاناً' },
  empty_no_match:   { he:'לא נמצאו מודעות שמתאימות לחיפוש', en:'No listings match your search', ru:'Ничего не найдено', ar:'لا نتائج مطابقة' },
  empty_show_all:   { he:'הצג הכל', en:'Show all', ru:'Показать всё', ar:'عرض الكل' },
  // R33 — the sidebar counts real things now, so the label has to say what it counts
  stat_sellers:     { he:'מפרסמים פעילים', en:'Active posters', ru:'Активных авторов', ar:'ناشرون نشطون' },
  // R35 — button state while a request is in flight
  login_working:    { he:'רגע…', en:'Working…', ru:'Минуту…', ar:'لحظة…' },
  // R39 — reporting, blocking, rate limits
  report_action:    { he:'דווח', en:'Report', ru:'Пожаловаться', ar:'إبلاغ' },
  report_title:     { he:'דיווח על מודעה', en:'Report this listing', ru:'Пожаловаться на объявление', ar:'الإبلاغ عن إعلان' },
  report_spam:      { he:'ספאם או פרסומת', en:'Spam or advertising', ru:'Спам или реклама', ar:'إزعاج أو إعلان' },
  report_offensive: { he:'תוכן פוגעני', en:'Offensive content', ru:'Оскорбительный контент', ar:'محتوى مسيء' },
  report_scam:      { he:'הונאה או רמאות', en:'Scam or fraud', ru:'Мошенничество', ar:'احتيال' },
  report_wrong:     { he:'לא מתאים לאתר', en:'Doesn’t belong here', ru:'Не по теме', ar:'غير مناسب' },
  report_other:     { he:'אחר', en:'Something else', ru:'Другое', ar:'شيء آخر' },
  report_thanks:    { he:'הדיווח התקבל, תודה', en:'Report received, thank you', ru:'Жалоба принята, спасибо', ar:'تم استلام البلاغ، شكراً' },
  block_user:       { he:'חסום משתמש', en:'Block user', ru:'Заблокировать', ar:'حظر المستخدم' },
  block_confirm:    { he:'לחסום את {x}? לא תראה יותר את המודעות והתגובות שלו, ואי אפשר יהיה להתכתב בשני הכיוונים.', en:'Block {x}? You won’t see their listings or comments, and neither of you can message the other.', ru:'Заблокировать {x}? Вы не увидите их объявления и комментарии, переписка станет невозможной.', ar:'حظر {x}؟ لن ترى إعلاناته وتعليقاته، ولن تتمكنا من المراسلة.' },
  block_done:       { he:'המשתמש נחסם', en:'User blocked', ru:'Пользователь заблокирован', ar:'تم حظر المستخدم' },
  block_note:       { he:'החסימה פרטית — הוא לא מקבל הודעה על כך.', en:'Blocking is private — they aren’t told.', ru:'Блокировка приватна — он не узнает.', ar:'الحظر خاص — لن يُعلم بذلك.' },
  login_to_report:  { he:'התחבר כדי לדווח', en:'Log in to report', ru:'Войдите, чтобы пожаловаться', ar:'سجّل الدخول للإبلاغ' },
  login_to_block:   { he:'התחבר כדי לחסום', en:'Log in to block', ru:'Войдите, чтобы заблокировать', ar:'سجّل الدخول للحظر' },
  err_rate_limit:   { he:'פרסמת הרבה בזמן קצר. נסה שוב בעוד שעה.', en:'That’s a lot in a short time. Try again in an hour.', ru:'Слишком много за короткое время. Попробуйте через час.', ar:'الكثير في وقت قصير. حاول بعد ساعة.' },
  err_not_allowed:  { he:'אין לך הרשאה לפעולה הזו', en:'You’re not allowed to do that', ru:'Нет прав на это действие', ar:'ليس لديك صلاحية' },
  err_already_done: { he:'כבר עשית את זה', en:'You’ve already done that', ru:'Вы уже это сделали', ar:'فعلت ذلك بالفعل' },
  err_generic:      { he:'משהו השתבש, נסה שוב', en:'Something went wrong, try again', ru:'Что-то пошло не так', ar:'حدث خطأ، حاول مجدداً' },
  err_timeout:      { he:'השרת לא הגיב', en:'The server did not respond', ru:'Сервер не ответил', ar:'لم يستجب الخادم' },
  block_unavailable:{ he:'אי אפשר לחסום את המפרסם הזה', en:'This poster can’t be blocked', ru:'Этого автора нельзя заблокировать', ar:'لا يمكن حظر هذا الناشر' },
  login_fill:       { he:'מלא את כל השדות', en:'Fill all fields', ru:'Заполните все поля', ar:'املأ كل الحقول' },
  login_check_email:{ he:'שלחנו לך מייל לאישור', en:'Check your email to confirm', ru:'Проверьте почту для подтверждения', ar:'تحقق من بريدك للتأكيد' },
  delete_confirm:   { he:'למחוק את הפוסט?', en:'Delete this post?', ru:'Удалить пост?', ar:'حذف المنشور؟' },
  post_deleted:     { he:'הפוסט נמחק', en:'Post deleted', ru:'Пост удалён', ar:'تم حذف المنشور' },
  delete_failed:    { he:'המחיקה נכשלה', en:'Delete failed', ru:'Не удалось удалить', ar:'فشل الحذف' },
  btn_delete:       { he:'מחק', en:'Delete', ru:'Удалить', ar:'حذف' },
  btn_edit:         { he:'ערוך', en:'Edit', ru:'Изменить', ar:'تعديل' },
  post_updated:     { he:'הפוסט עודכן', en:'Post updated', ru:'Пост обновлён', ar:'تم تحديث المنشور' },
  settings_title:   { he:'הגדרות', en:'Settings', ru:'Настройки', ar:'الإعدادات' },
  field_display_name:{ he:'השם שלי', en:'My name', ru:'Моё имя', ar:'اسمي' },
  field_name_ph:    { he:'איך יקראו לך באפליקציה', en:'How others will see you', ru:'Как вас будут видеть', ar:'كيف سيراك الآخرون' },
  field_name_hint:  { he:'השם שיוצג על הפוסטים ובצ׳אט שלך. תן לכל מכשיר שם שונה כדי לבדוק רב-משתמשים.', en:'Shown on your posts and in chat. Give each device a different name to test multi-user.', ru:'Показывается на постах и в чате. Дайте разным устройствам разные имена.', ar:'يظهر على منشوراتك وفي الدردشة. امنح كل جهاز اسماً مختلفاً.' },
  field_my_city:    { he:'העיר שלי', en:'My city', ru:'Мой город', ar:'مدينتي' },
  field_city_ph:    { he:'לדוגמא: כרמיאל', en:'e.g. Karmiel', ru:'напр.: Кармиэль', ar:'مثال: كرمئيل' },
  field_my_cities:  { he:'הערים שלי', en:'My cities', ru:'Мои города', ar:'مدني' },
  field_cities_ph:  { he:'כרמיאל, חיפה, עכו', en:'Karmiel, Haifa, Acre', ru:'Кармиэль, Хайфа', ar:'كرمئيل، حيفا' },
  field_cities_hint:{ he:'אפשר כמה ערים, הפרד בפסיקים. תקבל התראות מכולן. לחצן GPS מוסיף את העיר הקרובה.', en:'Multiple cities, comma-separated. You get alerts from all of them. GPS adds the nearest city.', ru:'Несколько городов через запятую. GPS добавит ближайший.', ar:'عدة مدن مفصولة بفواصل. GPS يضيف الأقرب.' },
  field_bio_ph:     { he:'כמה מילים על עצמך', en:'A few words about you', ru:'Пара слов о себе', ar:'كلمات عنك' },
  avatar_shuffle:   { he:'החלף תמונה', en:'Change avatar', ru:'Сменить аватар', ar:'تغيير الصورة' },
  field_my_areas:   { he:'שכונות / אזורים שלי', en:'My neighborhoods / areas', ru:'Мои районы', ar:'أحيائي / مناطقي' },
  field_areas_ph:   { he:'גליל מערבי, רמת רבין, מרכז העיר', en:'West Galilee, city center', ru:'Западная Галилея, центр', ar:'الجليل الغربي، وسط المدينة' },
  field_areas_hint: { he:'הפרד בפסיקים. התראה תגיע אם המיקום של הפוסט מכיל את העיר או אחד האזורים.', en:'Comma-separated. You get notified when a post location contains your city or one of these areas.', ru:'Через запятую. Уведомление придёт, если локация поста содержит город или один из районов.', ar:'مفصولة بفواصل. يصلك إشعار إذا احتوى موقع المنشور على مدينتك أو إحدى مناطقك.' },
  notif_only_area:  { he:'התראות רק מהאזור שלי', en:'Notify only from my area', ru:'Уведомления только из моего района', ar:'إشعارات من منطقتي فقط' },
  settings_saved:   { he:'ההגדרות נשמרו!', en:'Settings saved!', ru:'Настройки сохранены!', ar:'تم حفظ الإعدادات!' },
  geo_detect:       { he:'זהה את המיקום שלי אוטומטית', en:'Detect my location automatically', ru:'Определить моё местоположение', ar:'تحديد موقعي تلقائياً' },
  geo_detecting:    { he:'מזהה מיקום...', en:'Detecting location...', ru:'Определяю местоположение...', ar:'جارٍ تحديد الموقع...' },
  geo_found:        { he:'זוהה: {x}', en:'Found: {x}', ru:'Найдено: {x}', ar:'تم العثور: {x}' },
  geo_failed:       { he:'לא הצלחתי לזהות מיקום', en:'Could not detect location', ru:'Не удалось определить', ar:'تعذّر تحديد الموقع' },
  geo_denied:       { he:'הגישה למיקום נחסמה — נסה IP', en:'Location blocked — using IP', ru:'Доступ запрещён — по IP', ar:'تم حظر الموقع — عبر IP' },
  geo_unsupported:  { he:'הדפדפן לא תומך במיקום', en:'Location not supported', ru:'Геолокация не поддерживается', ar:'الموقع غير مدعوم' },
  toast_new_msg:    { he:'הודעה חדשה מ-{x}', en:'New message from {x}', ru:'Новое сообщение от {x}', ar:'رسالة جديدة من {x}' },
  status_online:    { he:'מחובר עכשיו', en:'Online', ru:'В сети', ar:'متصل الآن' },
  status_offline:   { he:'לא מחובר', en:'Offline', ru:'Не в сети', ar:'غير متصل' },
  status_last_seen: { he:'נראה לאחרונה {x}', en:'Last seen {x}', ru:'Был(а) в {x}', ar:'آخر ظهور {x}' },
  view_listing:     { he:'צפה במודעה', en:'View listing', ru:'К объявлению', ar:'عرض الإعلان' },
  attach_media:     { he:'צרף תמונה או וידאו', en:'Attach photo or video', ru:'Прикрепить фото/видео', ar:'إرفاق صورة أو فيديو' },
  media_photo:      { he:'תמונה', en:'Photo', ru:'Фото', ar:'صورة' },
  media_video:      { he:'וידאו', en:'Video', ru:'Видео', ar:'فيديو' },
  media_too_big:    { he:'הקובץ גדול מדי לשליחה', en:'File too large to send', ru:'Файл слишком большой', ar:'الملف كبير جداً' },
  chat_empty_none:  { he:'אין עדיין שיחות', en:'No conversations yet', ru:'Пока нет чатов', ar:'لا محادثات بعد' },
  chat_empty_hint:  { he:'התחל שיחה מתוך מודעה בפיד', en:'Start a chat from a listing in the feed', ru:'Начните чат из объявления', ar:'ابدأ محادثة من إعلان' },
};

let __lang = 'he';
try { __lang = localStorage.getItem('pagia_lang') || 'he'; } catch (e) {}
if (!I18N_LANGS[__lang]) __lang = 'he';

function getLang() { return __lang; }

// t(key, vars) — returns translated string; supports {n}/{x} interpolation.
function t(key, vars) {
  const entry = I18N[key];
  let s = entry ? (entry[__lang] != null ? entry[__lang] : entry.he) : key;
  if (vars) for (const k in vars) s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
  return s;
}

function setLanguage(lang) {
  if (!I18N_LANGS[lang]) return;
  __lang = lang;
  try { localStorage.setItem('pagia_lang', lang); } catch (e) {}
  applyI18n();
  if (typeof window.__rerenderDynamic === 'function') window.__rerenderDynamic();
}

function applyI18n() {
  const dir = I18N_LANGS[__lang].dir;
  document.documentElement.setAttribute('lang', __lang);
  document.documentElement.setAttribute('dir', dir);
  // static text nodes
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  // placeholders
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph')));
  });
  // <title>
  document.title = t('brand') + ' — ' + t('tagline');
  // reflect current choice in the switcher
  const sw = document.getElementById('lang-switcher');
  if (sw && sw.value !== __lang) sw.value = __lang;
}

// Build language switcher <option>s (call once switcher element exists)
function initLangSwitcher() {
  const sw = document.getElementById('lang-switcher');
  if (!sw) return;
  sw.innerHTML = Object.keys(I18N_LANGS)
    .map(l => `<option value="${l}" style="background:#1a1a24;color:#fff">${I18N_LANGS[l].flag} ${I18N_LANGS[l].name}</option>`).join('');
  sw.value = __lang;
  sw.onchange = e => setLanguage(e.target.value);
}

// expose
window.t = t;
window.getLang = getLang;
window.setLanguage = setLanguage;
window.applyI18n = applyI18n;
window.initLangSwitcher = initLangSwitcher;

document.addEventListener('DOMContentLoaded', () => {
  initLangSwitcher();
  applyI18n();
});
