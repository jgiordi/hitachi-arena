-- ============================================================
-- Migration: Password-based auth with approval flow
-- Run this in Supabase > SQL Editor
--
-- IMPORTANT: Before running, disable email confirmation:
-- Supabase > Authentication > Providers > Email >
-- uncheck "Enable email confirmations"
-- ============================================================

-- Add approval and superuser columns to reps
alter table public.reps
  add column if not exists approved boolean not null default false,
  add column if not exists is_superuser boolean not null default false;

-- ============================================================
-- Helper functions
-- ============================================================

create or replace function public.is_approved()
returns boolean as $$
  select coalesce(
    (select approved from public.reps where id = auth.uid()),
    false
  )
$$ language sql security definer stable;

create or replace function public.is_superuser()
returns boolean as $$
  select coalesce(
    (select is_superuser from public.reps where id = auth.uid()),
    false
  )
$$ language sql security definer stable;

-- ============================================================
-- Update RLS on reps table
-- ============================================================

drop policy if exists "reps are viewable by authenticated users" on public.reps;
drop policy if exists "users can upsert own rep" on public.reps;
drop policy if exists "users can update own rep" on public.reps;

-- Users can always read their own record (needed to check approved status on login)
create policy "users can read own rep"
  on public.reps for select to authenticated
  using (id = auth.uid());

-- Approved users can read all reps
create policy "approved users can read all reps"
  on public.reps for select to authenticated
  using (is_approved());

-- Users can insert their own rep record (on signup)
create policy "users can insert own rep"
  on public.reps for insert to authenticated
  with check (id = auth.uid());

-- Users can update their own basic info (name, avatar)
create policy "users can update own rep"
  on public.reps for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Superusers can update any rep (for approving/rejecting)
create policy "superusers can update any rep"
  on public.reps for update to authenticated
  using (is_superuser());

-- Superusers can delete any rep (for rejecting users)
create policy "superusers can delete any rep"
  on public.reps for delete to authenticated
  using (is_superuser());

-- ============================================================
-- Restrict sales_reps and deals to approved users only
-- ============================================================

drop policy if exists "sales_reps viewable by authenticated" on public.sales_reps;
create policy "approved users can view sales_reps"
  on public.sales_reps for select to authenticated
  using (is_approved());

drop policy if exists "sales_reps insertable by authenticated" on public.sales_reps;
create policy "approved users can insert sales_reps"
  on public.sales_reps for insert to authenticated
  with check (is_approved());

drop policy if exists "sales_reps deletable by authenticated" on public.sales_reps;
create policy "approved users can delete sales_reps"
  on public.sales_reps for delete to authenticated
  using (is_approved());

drop policy if exists "deals are viewable by authenticated users" on public.deals;
create policy "approved users can view deals"
  on public.deals for select to authenticated
  using (is_approved());

drop policy if exists "authenticated users can insert deals" on public.deals;
create policy "approved users can insert deals"
  on public.deals for insert to authenticated
  with check (is_approved());

-- ============================================================
-- After jgiordmaina@hitachisolutions.com signs up,
-- run this to grant superuser + approved status:
-- ============================================================
-- update public.reps
--   set approved = true, is_superuser = true
--   where email = 'jgiordmaina@hitachisolutions.com';
