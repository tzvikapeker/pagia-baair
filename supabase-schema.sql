-- ============================================================
-- פגיה בעיר — Supabase schema (R15)
-- הרץ את הקובץ הזה פעם אחת ב-SQL Editor של הפרויקט שלך.
-- ============================================================

-- טבלת פוסטים (פגיה + סטוק בטבלה אחת, מופרדים ב-feed_type)
create table if not exists public.posts (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  client_id     text,                                   -- מזהה דפדפן, למניעת echo ב-realtime
  feed_type     text not null check (feed_type in ('pagia','stock')),
  product       text not null,
  category      text,
  emoji         text,
  media_url     text,
  media_type    text default 'image',
  description   text,
  expiry        date,                                   -- pagia בלבד
  price         numeric default 0,                      -- pagia
  free          boolean default false,                  -- pagia
  original_price numeric default 0,                     -- stock
  sale_price    numeric default 0,                      -- stock
  quantity      int default 1,                          -- stock
  discount_pct  int default 0,                          -- stock
  location      text,
  tags          text[] default '{}',
  user_name     text,
  user_avatar   text,
  is_business   boolean default false,
  biz_name      text
);

create index if not exists posts_created_idx on public.posts (created_at desc);
create index if not exists posts_feed_idx    on public.posts (feed_type, created_at desc);

-- RLS: קריאה פתוחה + הוספה פתוחה ("פתוח ליוזרים בלי הגבלה")
alter table public.posts enable row level security;

drop policy if exists "public read"   on public.posts;
drop policy if exists "public insert" on public.posts;
create policy "public read"   on public.posts for select using (true);
create policy "public insert" on public.posts for insert with check (true);
-- שים לב: אין UPDATE/DELETE פתוחים — הגנה בסיסית מפני השחתה.

-- Storage bucket ציבורי לתמונות/וידאו
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "public media read"   on storage.objects;
drop policy if exists "public media upload" on storage.objects;
create policy "public media read"   on storage.objects for select using (bucket_id = 'media');
create policy "public media upload" on storage.objects for insert with check (bucket_id = 'media');

-- Realtime: שדר INSERTs של פוסטים לכל הלקוחות המחוברים
do $$
begin
  alter publication supabase_realtime add table public.posts;
exception when duplicate_object then null;
end $$;

-- ============================================================
-- R16: צ'אט רב-משתמשים (חדרים לפי פוסט)
-- ============================================================
create table if not exists public.chat_messages (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  room          text not null,          -- מזהה הפוסט (dbId) = חדר השיחה
  client_id     text,
  sender_name   text,
  sender_avatar text,
  text          text not null,
  media_url     text,                   -- R24: מדיה בצ'אט
  media_type    text
);

-- R24 (למי שכבר יצר את הטבלה קודם):
alter table public.chat_messages add column if not exists media_url text;
alter table public.chat_messages add column if not exists media_type text;

-- ============================================================
-- R26: התחברות אמיתית (Auth) — בעלות ומחיקה/עריכה למחבר בלבד
-- ============================================================
alter table public.posts         add column if not exists user_id uuid;
alter table public.chat_messages add column if not exists user_id uuid;

-- posts: קריאה פתוחה · הוספה למחוברים · עריכה/מחיקה רק לבעלים
drop policy if exists "public insert" on public.posts;
drop policy if exists "auth insert"   on public.posts;
drop policy if exists "owner update"  on public.posts;
drop policy if exists "owner delete"  on public.posts;
create policy "auth insert"  on public.posts for insert with check (auth.uid() = user_id);
create policy "owner update" on public.posts for update using (auth.uid() = user_id);
create policy "owner delete" on public.posts for delete using (auth.uid() = user_id);

-- chat: הוספה למחוברים · מחיקה רק לבעלים
drop policy if exists "public chat insert" on public.chat_messages;
drop policy if exists "auth chat insert"   on public.chat_messages;
drop policy if exists "owner chat delete"  on public.chat_messages;
create policy "auth chat insert" on public.chat_messages for insert with check (auth.uid() = user_id);
create policy "owner chat delete" on public.chat_messages for delete using (auth.uid() = user_id);

create index if not exists chat_room_idx on public.chat_messages (room, created_at);

alter table public.chat_messages enable row level security;
drop policy if exists "public chat read"   on public.chat_messages;
drop policy if exists "public chat insert" on public.chat_messages;
create policy "public chat read"   on public.chat_messages for select using (true);
create policy "public chat insert" on public.chat_messages for insert with check (true);

do $$
begin
  alter publication supabase_realtime add table public.chat_messages;
exception when duplicate_object then null;
end $$;

-- ============================================================
-- R29: סימון "נלקח / נמכר" — הרץ את הבלוק הזה פעם אחת
-- בלעדיו הכפתור עובד רק מקומית בדפדפן ולא נשמר.
-- העדכון מוגן ממילא ע"י "owner update" — רק הבעלים יכול לסמן.
-- ============================================================
alter table public.posts add column if not exists taken boolean not null default false;
create index if not exists posts_taken_idx on public.posts (taken, created_at desc);

-- ============================================================
-- R30: לייקים + תגובות אמיתיים, וצ'אט פרטי גם בצד השרת
-- כל הבלוק בטוח להרצה חוזרת (if not exists / drop policy if exists).
-- הוא רק מוסיף — לא מוחק אף נתון קיים.
-- ============================================================

-- ---------- לייקים ----------
-- שורה אחת לכל (פוסט, משתמש). ה-PK הכפול הוא מה שמונע לייק כפול.
create table if not exists public.post_likes (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists post_likes_post_idx on public.post_likes (post_id);

alter table public.post_likes enable row level security;
drop policy if exists "likes read"   on public.post_likes;
drop policy if exists "likes insert" on public.post_likes;
drop policy if exists "likes delete" on public.post_likes;
create policy "likes read"   on public.post_likes for select using (true);
create policy "likes insert" on public.post_likes for insert with check (auth.uid() = user_id);
create policy "likes delete" on public.post_likes for delete using (auth.uid() = user_id);

-- ---------- תגובות ----------
create table if not exists public.post_comments (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  post_id       uuid not null references public.posts(id) on delete cascade,
  user_id       uuid not null,
  author_name   text,
  author_avatar text,
  text          text not null check (char_length(text) between 1 and 1000)
);
create index if not exists post_comments_post_idx on public.post_comments (post_id, created_at);

alter table public.post_comments enable row level security;
drop policy if exists "comments read"   on public.post_comments;
drop policy if exists "comments insert" on public.post_comments;
drop policy if exists "comments delete" on public.post_comments;
create policy "comments read"   on public.post_comments for select using (true);
create policy "comments insert" on public.post_comments for insert with check (auth.uid() = user_id);
create policy "comments delete" on public.post_comments for delete using (auth.uid() = user_id);

do $$
begin
  alter publication supabase_realtime add table public.post_likes;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.post_comments;
exception when duplicate_object then null;
end $$;

-- ---------- צ'אט פרטי בצד השרת ----------
-- עד כה "public chat read using (true)" — כלומר כל אחד יכול היה לשלוף את כל
-- ההודעות בטבלה. עכשיו רק שני הצדדים בשיחה רואים אותה.
-- buyer_key = מזהה הקונה (החלק שאחרי ':' ב-room), seller_uid = בעל הפוסט.
alter table public.chat_messages add column if not exists buyer_key  text;
alter table public.chat_messages add column if not exists seller_uid uuid;
create index if not exists chat_participants_idx on public.chat_messages (buyer_key, seller_uid);

drop policy if exists "public chat read"   on public.chat_messages;
drop policy if exists "public chat insert" on public.chat_messages;
drop policy if exists "auth chat insert"   on public.chat_messages;
drop policy if exists "chat participants read"   on public.chat_messages;
drop policy if exists "chat participants insert" on public.chat_messages;
create policy "chat participants read" on public.chat_messages for select
  using (auth.uid()::text = buyer_key or auth.uid() = seller_uid);
create policy "chat participants insert" on public.chat_messages for insert
  with check (auth.uid() = user_id and (auth.uid()::text = buyer_key or auth.uid() = seller_uid));

-- שים לב: הודעות שנשלחו לפני R30 אין להן buyer_key/seller_uid, ולכן הן לא
-- יופיעו יותר. הן לא נמחקות — רק מוסתרות. לביטול מלא של השינוי הזה:
--   drop policy "chat participants read" on public.chat_messages;
--   create policy "public chat read" on public.chat_messages for select using (true);
