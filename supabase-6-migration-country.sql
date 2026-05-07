-- ============================================================
-- [UPGRADE] Migration: Add country to sales_reps + fix update RLS
-- ============================================================
-- Run this in the Supabase SQL editor.
-- 1. Adds optional country column to sales_reps
-- 2. Adds missing UPDATE policy (was blocking all rep edits)
-- ============================================================

-- Add country column (safe to re-run)
alter table public.sales_reps
  add column if not exists country text;

-- Add missing UPDATE policy for sales_reps
-- (insert/delete existed but update was never added, silently blocking saves)
drop policy if exists "approved users can update sales_reps" on public.sales_reps;
create policy "approved users can update sales_reps"
  on public.sales_reps for update to authenticated
  using (is_approved())
  with check (is_approved());

-- Add UPDATE policy for deals (any approved user can edit deals)
drop policy if exists "superusers can update deals" on public.deals;
drop policy if exists "approved users can update deals" on public.deals;
create policy "approved users can update deals"
  on public.deals for update to authenticated
  using (is_approved())
  with check (is_approved());

-- Add DELETE policy for deals (any approved user can delete deals)
drop policy if exists "superusers can delete deals" on public.deals;
drop policy if exists "approved users can delete deals" on public.deals;
create policy "approved users can delete deals"
  on public.deals for delete to authenticated
  using (is_approved());
