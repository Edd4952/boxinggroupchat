-- Create table for email notification preferences
-- Columns: id (int8), created_at (auto), email (string), status (bool)
-- NOTE: "timestamp" is a reserved word in PostgreSQL/PostgREST; use created_at instead.
create table if not exists public.emails (
  id bigserial primary key,
  created_at timestamp with time zone not null default now(),
  email text not null,
  status boolean not null default true
);

-- If the table already exists with the old "timestamp" column name, rename it:
-- alter table public.emails rename column "timestamp" to created_at;

-- Helpful index for looking up latest row by email quickly
create index if not exists emails_email_idx on public.emails (email);

-- Prevent duplicate email entries regardless of letter casing.
create unique index if not exists emails_email_lower_unique_idx
  on public.emails (lower(email));

-- Enable RLS
alter table public.emails enable row level security;

-- Policies for this client-side app (anon key) to read/insert/update rows.
-- Tighten these policies if/when you add authentication.
create policy if not exists "public_select_emails" on public.emails
  for select
  using (true);

create policy if not exists "public_insert_emails" on public.emails
  for insert
  with check (true);

create policy if not exists "public_update_emails" on public.emails
  for update
  using (true)
  with check (true);

-- Grant table access to the anon role.
-- Required even when RLS is disabled — GRANT and RLS are separate permission systems.
grant select, insert, update on table public.emails to anon;
