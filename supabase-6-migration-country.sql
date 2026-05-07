-- ============================================================
-- [UPGRADE] Migration: Add country to sales_reps
-- ============================================================
-- Run this in the Supabase SQL editor.
-- Adds an optional country field to sales reps.
-- Allowed values (enforced in the UI): UK, France, Germany
-- ============================================================

alter table public.sales_reps
  add column if not exists country text;
