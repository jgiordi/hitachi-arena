-- ============================================================
-- [UPGRADE ONLY] Migration: Password-based auth with approval flow
-- ============================================================
-- NOT needed for a fresh install — use supabase-1-schema.sql instead.
-- Only run this if you have an existing database that was set up
-- WITHOUT the approval flow and need to add it.
--
-- IMPORTANT: Before running, disable email confirmation in
-- Supabase > Authentication > Providers > Email >
-- uncheck "Enable email confirmations"
--
-- AFTER running: grant yourself superuser + approved status:
--   update public.reps
--     set approved = true, is_superuser = true
--     where email = 'your@email.com';
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
drop policy if exists "users can read own rep" on public.reps;
create policy "users can read own rep"
  on public.reps for select to authenticated
  using (id = auth.uid());

-- Approved users can read all reps
drop policy if exists "approved users can read all reps" on public.reps;
create policy "approved users can read all reps"
  on public.reps for select to authenticated
  using (is_approved());

-- Users can insert their own rep record (on signup)
drop policy if exists "users can insert own rep" on public.reps;
create policy "users can insert own rep"
  on public.reps for insert to authenticated
  with check (id = auth.uid());

-- Users can update their own basic info (name, avatar)
drop policy if exists "users can update own rep" on public.reps;
create policy "users can update own rep"
  on public.reps for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Superusers can update any rep (for approving/rejecting)
drop policy if exists "superusers can update any rep" on public.reps;
create policy "superusers can update any rep"
  on public.reps for update to authenticated
  using (is_superuser());

-- Superusers can delete any rep (for rejecting users)
drop policy if exists "superusers can delete any rep" on public.reps;
create policy "superusers can delete any rep"
  on public.reps for delete to authenticated
  using (is_superuser());

-- ============================================================
-- Restrict sales_reps and deals to approved users only
-- ============================================================

drop policy if exists "sales_reps viewable by authenticated" on public.sales_reps;
drop policy if exists "approved users can view sales_reps" on public.sales_reps;
create policy "approved users can view sales_reps"
  on public.sales_reps for select to authenticated
  using (is_approved());

drop policy if exists "sales_reps insertable by authenticated" on public.sales_reps;
drop policy if exists "approved users can insert sales_reps" on public.sales_reps;
create policy "approved users can insert sales_reps"
  on public.sales_reps for insert to authenticated
  with check (is_approved());

drop policy if exists "sales_reps deletable by authenticated" on public.sales_reps;
drop policy if exists "approved users can delete sales_reps" on public.sales_reps;
create policy "approved users can delete sales_reps"
  on public.sales_reps for delete to authenticated
  using (is_approved());

drop policy if exists "deals are viewable by authenticated users" on public.deals;
drop policy if exists "approved users can view deals" on public.deals;
create policy "approved users can view deals"
  on public.deals for select to authenticated
  using (is_approved());

drop policy if exists "authenticated users can insert deals" on public.deals;
drop policy if exists "approved users can insert deals" on public.deals;
create policy "approved users can insert deals"
  on public.deals for insert to authenticated
  with check (is_approved());

-- ============================================================
-- Trigger: auto-create reps row on new auth user
-- (runs as security definer, bypasses RLS)
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.reps (id, name, email, approved)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      split_part(new.email, '@', 1)
    ),
    new.email,
    false
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- After jgiordmaina@hitachisolutions.com signs up,
-- run this to grant superuser + approved status:
-- ============================================================
-- update public.reps
--   set approved = true, is_superuser = true
--   where email = 'jgiordmaina@hitachisolutions.com';
