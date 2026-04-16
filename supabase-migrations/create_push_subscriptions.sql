-- Create table for web push subscriptions
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS but allow server role (service functions) unrestricted access.
alter table public.push_subscriptions enable row level security;

-- Optional: allow anonymous insert/select if you prefer (not recommended). Commented out by default.
-- create policy "anon can read push_subscriptions" on public.push_subscriptions
--   for select using (true);
-- create policy "anon can insert push_subscriptions" on public.push_subscriptions
--   for insert with check (true);