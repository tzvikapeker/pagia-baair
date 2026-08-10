-- =====================================================================
-- פגיה בעיר — R39 · הגנות לקהל אמיתי
--
-- דיווח על מודעה · חסימת משתמש · הגבלת קצב · הסתרה אוטומטית · מנהלים
--
-- הכל נאכף בבסיס הנתונים, לא בדפדפן. בדיקה בצד הלקוח בלבד היא הצעה
-- מנומסת — מי שפותח קונסולה עוקף אותה בשורה אחת.
-- בטוח להרצה חוזרת.
-- =====================================================================

-- ---------------------------------------------------------------
-- מנהלים
-- ---------------------------------------------------------------
create table if not exists public.admins (
  user_id    uuid primary key,
  created_at timestamptz not null default now(),
  note       text
);
alter table public.admins enable row level security;
drop policy if exists "admins self read" on public.admins;
create policy "admins self read" on public.admins for select using (auth.uid() = user_id);

create or replace function public.is_admin() returns boolean
language sql stable security definer as $fn$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$fn$;

-- ---------------------------------------------------------------
-- חסימת משתמשים
-- ---------------------------------------------------------------
create table if not exists public.user_blocks (
  blocker_id uuid not null,
  blocked_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index if not exists user_blocks_blocker_idx on public.user_blocks (blocker_id);

alter table public.user_blocks enable row level security;
drop policy if exists "blocks read own"   on public.user_blocks;
drop policy if exists "blocks insert own" on public.user_blocks;
drop policy if exists "blocks delete own" on public.user_blocks;
create policy "blocks read own"   on public.user_blocks for select using (auth.uid() = blocker_id);
create policy "blocks insert own" on public.user_blocks for insert with check (auth.uid() = blocker_id);
create policy "blocks delete own" on public.user_blocks for delete using (auth.uid() = blocker_id);

-- "האם מישהו מהשניים חסם את השני" — משמש במדיניות הצ'אט
create or replace function public.blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer as $fn$
  select exists (
    select 1 from public.user_blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$fn$;

-- ---------------------------------------------------------------
-- דיווחים
-- ---------------------------------------------------------------
create table if not exists public.post_reports (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  reporter_id uuid not null,
  reason      text not null check (reason in ('spam','offensive','scam','wrong','other')),
  detail      text check (detail is null or char_length(detail) <= 500),
  unique (post_id, reporter_id)          -- דיווח אחד לאדם למודעה
);
create index if not exists post_reports_post_idx on public.post_reports (post_id);

alter table public.post_reports enable row level security;
drop policy if exists "reports insert" on public.post_reports;
drop policy if exists "reports read"   on public.post_reports;
create policy "reports insert" on public.post_reports for insert with check (auth.uid() = reporter_id);
create policy "reports read"   on public.post_reports for select using (auth.uid() = reporter_id or public.is_admin());

alter table public.posts add column if not exists reports_count int not null default 0;
alter table public.posts add column if not exists hidden        boolean not null default false;

create or replace function public.bump_reports_count() returns trigger
language plpgsql security definer as $fn$
declare c int;
begin
  select count(*) into c from public.post_reports where post_id = new.post_id;
  -- שלושה מדווחים שונים מסתירים מודעה עד בדיקת מנהל
  update public.posts set reports_count = c, hidden = (c >= 3) where id = new.post_id;
  return null;
end $fn$;

drop trigger if exists post_reports_count_trg on public.post_reports;
create trigger post_reports_count_trg after insert on public.post_reports
  for each row execute function public.bump_reports_count();

-- ---------------------------------------------------------------
-- הגבלת קצב — נאכפת בשרת, לפני ההכנסה
-- ---------------------------------------------------------------
create or replace function public.enforce_rate_limit() returns trigger
language plpgsql security definer as $fn$
declare
  recent int;
  cap    int;
  window_len interval := interval '1 hour';
begin
  if tg_table_name = 'posts' then cap := 10;
  elsif tg_table_name = 'post_comments' then cap := 40;
  elsif tg_table_name = 'chat_messages' then cap := 150;
  else cap := 100;
  end if;

  execute format('select count(*) from public.%I where user_id = $1 and created_at > now() - $2', tg_table_name)
    into recent using new.user_id, window_len;

  if recent >= cap then
    raise exception 'rate_limit_exceeded: % per hour on %', cap, tg_table_name
      using errcode = 'P0001', hint = 'נסה שוב בעוד זמן מה';
  end if;
  return new;
end $fn$;

drop trigger if exists posts_rate_limit_trg    on public.posts;
drop trigger if exists comments_rate_limit_trg on public.post_comments;
drop trigger if exists chat_rate_limit_trg     on public.chat_messages;
create trigger posts_rate_limit_trg    before insert on public.posts         for each row execute function public.enforce_rate_limit();
create trigger comments_rate_limit_trg before insert on public.post_comments for each row execute function public.enforce_rate_limit();
create trigger chat_rate_limit_trg     before insert on public.chat_messages for each row execute function public.enforce_rate_limit();

-- ---------------------------------------------------------------
-- מדיניות מעודכנת: מודעות מוסתרות ומשתמשים חסומים לא מוצגים
-- ---------------------------------------------------------------
drop policy if exists "public read"  on public.posts;
drop policy if exists "owner delete" on public.posts;
create policy "public read" on public.posts for select using (
  (hidden = false and not public.blocked_between(auth.uid(), user_id))
  or auth.uid() = user_id
  or public.is_admin()
);
create policy "owner delete" on public.posts for delete using (auth.uid() = user_id or public.is_admin());

-- צ'אט: אי אפשר לכתוב למי שחסם אותך, או למי שחסמת
drop policy if exists "chat participants insert" on public.chat_messages;
create policy "chat participants insert" on public.chat_messages for insert with check (
  auth.uid() = user_id
  and (auth.uid()::text = buyer_key or auth.uid() = seller_uid)
  and not public.blocked_between(
        auth.uid(),
        case when auth.uid() = seller_uid then nullif(buyer_key,'')::uuid else seller_uid end
      )
);

-- תגובות של משתמש חסום לא נראות
drop policy if exists "comments read" on public.post_comments;
create policy "comments read" on public.post_comments for select using (
  not public.blocked_between(auth.uid(), user_id)
);
