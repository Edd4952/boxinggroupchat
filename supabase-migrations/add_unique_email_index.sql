-- Ensure case-insensitive uniqueness for emails so duplicates cannot be inserted.
-- Keeps the latest row when duplicates already exist.
delete from public.emails older
using public.emails newer
where lower(older.email) = lower(newer.email)
  and older.id < newer.id;

create unique index if not exists emails_email_lower_unique_idx
  on public.emails (lower(email));
