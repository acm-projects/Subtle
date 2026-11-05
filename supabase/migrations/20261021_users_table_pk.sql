-- =====================================================================
-- users_table Primary Key & Clean-up Migration
-- Run once in the Supabase SQL Editor:
-- Supabase Dashboard -> SQL Editor -> New query -> Paste & Run.
-- =====================================================================

-- 1. Ensure `id` column exists and backfill null values with UUIDs
update public.users_table
set id = gen_random_uuid()::text
where id is null;

-- 2. Make `id` default to gen_random_uuid()::text and NOT NULL
alter table public.users_table
  alter column id set default gen_random_uuid()::text,
  alter column id set not null;

-- 3. Add `id` as the PRIMARY KEY constraint (if not already set)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.users_table'::regclass and contype = 'p'
  ) then
    alter table public.users_table add primary key (id);
  end if;
end $$;

-- 4. Create an index on `student_email` for fast lookups
create index if not exists users_table_student_email_idx
  on public.users_table (student_email);

-- 5. Enable RLS and add basic policies so authenticated users can update/read
alter table public.users_table enable row level security;

-- Allow anon and authenticated users to read users (needed for matching radar)
drop policy if exists "Allow select for all" on public.users_table;
create policy "Allow select for all"
  on public.users_table for select
  using (true);

-- Allow anyone to insert on signup
drop policy if exists "Allow insert for all" on public.users_table;
create policy "Allow insert for all"
  on public.users_table for insert
  with check (true);

-- Allow updating user row
drop policy if exists "Allow update for all" on public.users_table;
create policy "Allow update for all"
  on public.users_table for update
  using (true)
  with check (true);
