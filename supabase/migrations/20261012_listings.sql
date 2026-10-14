-- =====================================================================
-- Listings backend migration
-- Run once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
-- Safe to re-run: every statement is guarded with IF NOT EXISTS / DO blocks.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Make `id` a real primary key
--    Today `id` is a nullable text column with no default, so two
--    listings could share an id (or have none). Keep it as text so
--    nothing that already references it breaks, but auto-fill it with a UUID.
-- ---------------------------------------------------------------------
update public.listing_table
set id = gen_random_uuid()::text
where id is null;

alter table public.listing_table
  alter column id set default gen_random_uuid()::text,
  alter column id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.listing_table'::regclass and contype = 'p'
  ) then
    alter table public.listing_table add primary key (id);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2. New columns
-- ---------------------------------------------------------------------
alter table public.listing_table
  -- who posted it (filled automatically from the logged-in user)
  add column if not exists user_id      uuid references auth.users(id) on delete cascade default auth.uid(),
  add column if not exists created_at   timestamptz not null default now(),
  add column if not exists updated_at   timestamptz not null default now(),
  add column if not exists is_active    boolean not null default true,
  -- marketplace fields from the README
  add column if not exists city         text,
  add column if not exists room_type    text,
  add column if not exists company_tags text[] not null default '{}',
  add column if not exists image_urls   text[] not null default '{}',
  -- for the Subtle score / maps later
  add column if not exists latitude     double precision,
  add column if not exists longitude    double precision;

-- Convert amenities from strict enum to text[] so all amenities can be saved
alter table public.listing_table
  alter column amenities type text[] using amenities::text[],
  alter column amenities set default '{}';

-- Basic sanity checks (NOT VALID = don't fail on any old bad rows)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'listing_rent_nonnegative') then
    alter table public.listing_table
      add constraint listing_rent_nonnegative check (monthly_rent is null or monthly_rent >= 0) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'listing_dates_ordered') then
    alter table public.listing_table
      add constraint listing_dates_ordered check (start_date is null or end_date is null or end_date >= start_date) not valid;
  end if;
end $$;

-- Keep updated_at fresh on every edit
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists listing_set_updated_at on public.listing_table;
create trigger listing_set_updated_at
  before update on public.listing_table
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 3. Indexes for the browse filters
-- ---------------------------------------------------------------------
create index if not exists listing_rent_idx    on public.listing_table (monthly_rent);
create index if not exists listing_dates_idx   on public.listing_table (start_date, end_date);
create index if not exists listing_city_idx    on public.listing_table (city);
create index if not exists listing_user_idx    on public.listing_table (user_id);
create index if not exists listing_created_idx on public.listing_table (created_at desc);
create index if not exists listing_amenities_idx on public.listing_table using gin (amenities);

-- ---------------------------------------------------------------------
-- 4. Row Level Security
-- ---------------------------------------------------------------------
alter table public.listing_table enable row level security;

drop policy if exists "Logged-in users can browse active listings" on public.listing_table;
create policy "Logged-in users can browse active listings"
  on public.listing_table for select
  to authenticated
  using (is_active or user_id = auth.uid());

drop policy if exists "Users create their own listings" on public.listing_table;
create policy "Users create their own listings"
  on public.listing_table for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users edit their own listings" on public.listing_table;
create policy "Users edit their own listings"
  on public.listing_table for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users delete their own listings" on public.listing_table;
create policy "Users delete their own listings"
  on public.listing_table for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 5. Photo storage bucket
--    Files live at: listing-images/{user_id}/{listing_id}/{uuid}.{ext}
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

drop policy if exists "Users upload listing images to own folder" on storage.objects;
create policy "Users upload listing images to own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete own listing images" on storage.objects;
create policy "Users delete own listing images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

