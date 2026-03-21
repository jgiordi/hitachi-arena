-- ============================================================
-- [UPGRADE ONLY] Migration: Add sales_reps table
-- ============================================================
-- NOT needed for a fresh install — use supabase-1-schema.sql instead.
-- Only run this if you have an existing database that was set up
-- WITHOUT the sales_reps table and need to add it.
-- ============================================================

-- Sales reps table (managed by admin, separate from auth users)
create table if not exists public.sales_reps (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  job_title text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Add logged_by column to deals (tracks which user logged the deal)
alter table public.deals
  add column if not exists logged_by uuid references auth.users(id) on delete set null;

-- Change rep_id in deals to reference sales_reps instead of reps
-- First drop old foreign key constraint if it exists
alter table public.deals
  drop constraint if exists deals_rep_id_fkey;

-- Add new foreign key pointing to sales_reps
alter table public.deals
  add constraint deals_rep_id_fkey
  foreign key (rep_id) references public.sales_reps(id) on delete cascade;

-- RLS for sales_reps
alter table public.sales_reps enable row level security;

-- Anyone logged in can read reps
create policy "sales_reps viewable by authenticated"
  on public.sales_reps for select
  to authenticated
  using (true);

-- Anyone logged in can insert reps (admin use)
create policy "sales_reps insertable by authenticated"
  on public.sales_reps for insert
  to authenticated
  with check (true);

-- Anyone logged in can delete reps
create policy "sales_reps deletable by authenticated"
  on public.sales_reps for delete
  to authenticated
  using (true);

-- Update deals RLS to allow any authenticated user to insert
-- (rep_id now points to sales_reps, not auth.users)
drop policy if exists "users can insert own deals" on public.deals;

create policy "authenticated users can insert deals"
  on public.deals for insert
  to authenticated
  with check (true);
