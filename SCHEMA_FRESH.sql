-- =====================================================================
-- פגיה בעיר — סכימה מלאה לפרויקט חדש
--
-- הרץ פעם אחת ב-SQL Editor של הפרויקט החדש:
--   Dashboard → SQL Editor → New query → הדבק הכל → Run
--
-- זה הקובץ המאוחד. supabase-schema.sql נבנה בשכבות לאורך הפיתוח
-- (R15 עד R37) עם בלוקים שמתקנים זה את זה; כאן הכל כבר במצב הסופי,
-- בסדר הנכון, בלי היסטוריה. בטוח להרצה חוזרת.
-- =====================================================================

-- ---------------------------------------------------------------
-- מודעות
-- ---------------------------------------------------------------
create table if not exists public.posts (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  user_id        uuid,                      -- בעל המודעה (auth.users)
  client_id      text,                      -- מזהה דפדפן, למניעת הד ב-realtime
  feed_type      text not null check (feed_type in ('pagia','stock')),
  product        text not null,
  category       text,
  emoji          text,
  media_url      text,
  media_type     text default 'image',
  description    text,
  location       text,
  tags           text[] default '{}',
  taken          boolean not null default false,
  likes_count    int not null default 0,    -- מתוחזק ע"י טריגר
  comments_count int not null default 0,    -- מתוחזק ע"י טריגר
  -- פגיה בלבד
  expiry         date,
  price          numeric default 0,
  free           boolean default false,
  -- סטוק בלבד
  original_price numeric default 0,
  sale_price     numeric default 0,
  quantity       int default 1,
  discount_pct   int default 0,
  -- תצוגת המפרסם
  user_name      text,
  user_avatar    text,
  is_business    boolean default false,
  biz_name       text
);

create index if not exists posts_created_idx on public.posts (created_at desc);
create index if not exists posts_feed_idx    on public.posts (feed_type, created_at desc);
create index if not exists posts_taken_idx   on public.posts (taken, created_at desc);

alter table public.posts enable row level security;
drop policy if exists "public read"   on public.posts;
drop policy if exists "auth insert"   on public.posts;
drop policy if exists "owner update"  on public.posts;
drop policy if exists "owner delete"  on public.posts;
create policy "public read"  on public.posts for select using (true);
create policy "auth insert"  on public.posts for insert with check (auth.uid() = user_id);
create policy "owner update" on public.posts for update using (auth.uid() = user_id);
create policy "owner delete" on public.posts for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- לייקים — מפתח מורכב מונע לייק כפול ברמת המסד
-- ---------------------------------------------------------------
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

-- ---------------------------------------------------------------
-- תגובות
-- ---------------------------------------------------------------
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

-- ---------------------------------------------------------------
-- מונים — כדי שהדפדפן יקרא מספר אחד ולא ימשוך את כל השורות
-- ---------------------------------------------------------------
create or replace function public.bump_likes_count() returns trigger language plpgsql security definer as $fn$
begin
  if (tg_op = 'INSERT') then
    update public.posts set likes_count = likes_count + 1 where id = new.post_id;
  elsif (tg_op = 'DELETE') then
    update public.posts set likes_count = greatest(0, likes_count - 1) where id = old.post_id;
  end if;
  return null;
end $fn$;

create or replace function public.bump_comments_count() returns trigger language plpgsql security definer as $fn$
begin
  if (tg_op = 'INSERT') then
    update public.posts set comments_count = comments_count + 1 where id = new.post_id;
  elsif (tg_op = 'DELETE') then
    update public.posts set comments_count = greatest(0, comments_count - 1) where id = old.post_id;
  end if;
  return null;
end $fn$;

drop trigger if exists post_likes_count_trg    on public.post_likes;
drop trigger if exists post_comments_count_trg on public.post_comments;
create trigger post_likes_count_trg    after insert or delete on public.post_likes    for each row execute function public.bump_likes_count();
create trigger post_comments_count_trg after insert or delete on public.post_comments for each row execute function public.bump_comments_count();

-- ---------------------------------------------------------------
-- צ'אט — חדר לכל (מודעה, קונה). רק שני הצדדים רואים.
-- ---------------------------------------------------------------
create table if not exists public.chat_messages (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  room          text not null,              -- "<post_id>:<buyer>"
  user_id       uuid,
  client_id     text,
  buyer_key     text,                       -- מזהה הקונה
  seller_uid    uuid,                       -- בעל המודעה
  sender_name   text,
  sender_avatar text,
  text          text,
  media_url     text,
  media_type    text
);
create index if not exists chat_room_idx         on public.chat_messages (room, created_at);
create index if not exists chat_participants_idx on public.chat_messages (buyer_key, seller_uid);

alter table public.chat_messages enable row level security;
drop policy if exists "chat participants read"   on public.chat_messages;
drop policy if exists "chat participants insert" on public.chat_messages;
drop policy if exists "owner chat delete"        on public.chat_messages;
create policy "chat participants read" on public.chat_messages for select
  using (auth.uid()::text = buyer_key or auth.uid() = seller_uid);
create policy "chat participants insert" on public.chat_messages for insert
  with check (auth.uid() = user_id and (auth.uid()::text = buyer_key or auth.uid() = seller_uid));
create policy "owner chat delete" on public.chat_messages for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- חיפוש — trigram מאפשר חיפוש חלקי מהיר בלי סריקת טבלה מלאה
-- ---------------------------------------------------------------
create extension if not exists pg_trgm;
create index if not exists posts_product_trgm  on public.posts using gin (product gin_trgm_ops);
create index if not exists posts_desc_trgm     on public.posts using gin (description gin_trgm_ops);
create index if not exists posts_location_trgm on public.posts using gin (location gin_trgm_ops);

-- ---------------------------------------------------------------
-- אחסון תמונות וסרטונים
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('media','media',true)
on conflict (id) do nothing;

drop policy if exists "public media read"   on storage.objects;
drop policy if exists "public media upload" on storage.objects;
create policy "public media read"   on storage.objects for select using (bucket_id = 'media');
create policy "public media upload" on storage.objects for insert with check (bucket_id = 'media' and auth.uid() is not null);

-- ---------------------------------------------------------------
-- זמן אמת
-- ---------------------------------------------------------------
do $$ begin alter publication supabase_realtime add table public.posts;         exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.chat_messages; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.post_likes;    exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.post_comments; exception when duplicate_object then null; end $$;
