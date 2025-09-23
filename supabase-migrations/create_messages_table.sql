-- Create a simple messages table for the chat app
-- Run this in the Supabase SQL editor (SQL -> New query) and execute.

-- 1) Table
CREATE TABLE IF NOT EXISTS public.messages (
  id bigserial PRIMARY KEY,
  user text NOT NULL,
  content text NOT NULL,
  color text,
  created_at timestamptz DEFAULT now()
);

-- 2) Enable Row Level Security (RLS)
-- We'll add example policies below. If you want to skip RLS during quick testing,
-- you can comment out the RLS ON line, but for production you should keep RLS enabled.
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 3) Quick-test permissive policy (ONLY FOR LOCAL TESTING)
-- This policy allows anyone with the anon key to insert/select messages.
-- WARNING: This is permissive and not recommended for production.
-- CREATE POLICY "allow anon access to messages" ON public.messages
--  FOR ALL
--  USING (true)
--  WITH CHECK (true);

-- 4) Recommended: authenticated inserts, public reads
-- If you use Supabase Auth and want people to be able to read messages publicly
-- but only authenticated users to insert, use the following policies instead of the permissive one.
-- First, drop the permissive policy if it exists (replace 'allow anon access to messages')
-- then create the recommended policies:

-- DROP POLICY "allow anon access to messages" ON public.messages;

-- Policy: allow selects for everyone (public reads)
CREATE POLICY "public_select_messages" ON public.messages
  FOR SELECT
  USING (true);

-- Policy: allow inserts only for authenticated users
-- CREATE POLICY "authenticated_insert_messages" ON public.messages
--   FOR INSERT
--   WITH CHECK (auth.role() = 'authenticated');

-- After creating policies, verify them in the Supabase UI under Auth -> Policies
