-- =====================================================================
-- פגיה בעיר — R37 · הרץ אותי פעם אחת
--
--   1. https://supabase.com/dashboard/project/gdenjwpcsvtheejjpxir/sql/new
--   2. הדבק את כל הקובץ הזה
--   3. Run
--
-- מה זה עושה: מוסיף מוני לייקים ותגובות שמתעדכנים אוטומטית,
-- ואינדקסים שמאפשרים חיפוש מהיר גם עם הרבה מודעות.
-- בטוח להרצה חוזרת. לא מוחק שום נתון.
-- =====================================================================

-- ============================================================
-- R37: קנה מידה — מונים מתוחזקים ואינדקס חיפוש
--
-- הבעיה: ספירת לייקים נעשתה ע"י משיכת כל שורות הלייקים לדפדפן. מודעה עם
-- 50,000 לייקים הורידה 50,000 שורות רק כדי להציג מספר. אותו דבר בתגובות.
-- הפתרון: עמודת מונה שמתוחזקת ע"י טריגר — הדפדפן קורא מספר אחד.
--
-- ובנוסף: חיפוש שרץ רק על מה שנטען לא מוצא כלום כשיש מיליון מודעות.
-- אינדקס trigram מאפשר חיפוש חלקי מהיר ישירות במסד.
-- בטוח להרצה חוזרת.
-- ============================================================

alter table public.posts add column if not exists likes_count    int not null default 0;
alter table public.posts add column if not exists comments_count int not null default 0;

create or replace function public.bump_likes_count() returns trigger language plpgsql security definer as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts set likes_count = likes_count + 1 where id = new.post_id;
  elsif (tg_op = 'DELETE') then
    update public.posts set likes_count = greatest(0, likes_count - 1) where id = old.post_id;
  end if;
  return null;
end $$;

create or replace function public.bump_comments_count() returns trigger language plpgsql security definer as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts set comments_count = comments_count + 1 where id = new.post_id;
  elsif (tg_op = 'DELETE') then
    update public.posts set comments_count = greatest(0, comments_count - 1) where id = old.post_id;
  end if;
  return null;
end $$;

drop trigger if exists post_likes_count_trg    on public.post_likes;
drop trigger if exists post_comments_count_trg on public.post_comments;
create trigger post_likes_count_trg    after insert or delete on public.post_likes    for each row execute function public.bump_likes_count();
create trigger post_comments_count_trg after insert or delete on public.post_comments for each row execute function public.bump_comments_count();

-- מסנכרן מונים קיימים (למקרה שכבר יש נתונים)
update public.posts p set
  likes_count    = coalesce((select count(*) from public.post_likes    l where l.post_id = p.id), 0),
  comments_count = coalesce((select count(*) from public.post_comments c where c.post_id = p.id), 0);

-- חיפוש: trigram מאפשר ILIKE '%טקסט%' מהיר בלי סריקת טבלה מלאה
create extension if not exists pg_trgm;
create index if not exists posts_product_trgm  on public.posts using gin (product gin_trgm_ops);
create index if not exists posts_desc_trgm     on public.posts using gin (description gin_trgm_ops);
create index if not exists posts_location_trgm on public.posts using gin (location gin_trgm_ops);
