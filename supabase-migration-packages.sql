-- ============================================================
-- Migration: Package management
-- Run this in Supabase > SQL Editor
-- ============================================================

create table if not exists public.packages (
  id text primary key,       -- slug, e.g. 'cloud-assessment'
  name text not null,
  points integer not null,
  color text not null default '#185FA5',
  created_at timestamptz default now()
);

-- Seed original packages (no-op on re-run)
insert into public.packages (id, name, points, color) values
  ('cloud-assessment',    'Cloud Assessment',     320, '#185FA5'),
  ('security-assessment', 'Security Assessment',  200, '#993556'),
  ('data-ai-accelerator', 'Data & AI Accelerator',400, '#854F0B'),
  ('support-managed',     'Support & Managed',    150, '#3B6D11')
on conflict (id) do nothing;

alter table public.packages enable row level security;

-- Approved users can read packages (needed for LogDeal modal)
drop policy if exists "approved users can read packages" on public.packages;
create policy "approved users can read packages"
  on public.packages for select to authenticated
  using (is_approved());

-- Only superusers can create/edit/delete packages
drop policy if exists "superusers can insert packages" on public.packages;
create policy "superusers can insert packages"
  on public.packages for insert to authenticated
  with check (is_superuser());

drop policy if exists "superusers can update packages" on public.packages;
create policy "superusers can update packages"
  on public.packages for update to authenticated
  using (is_superuser());

drop policy if exists "superusers can delete packages" on public.packages;
create policy "superusers can delete packages"
  on public.packages for delete to authenticated
  using (is_superuser());
