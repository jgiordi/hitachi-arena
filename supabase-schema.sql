-- ============================================================
-- Hitachi Sales Arena — Supabase Schema
-- Run this in Supabase > SQL Editor
-- ============================================================

-- Reps table (auto-populated on first login via Google OAuth)
create table if not exists public.reps (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text unique not null,
  avatar_url text,
  created_at timestamptz default now()
);

-- Deals table
create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid references public.reps(id) on delete cascade not null,
  package_id text not null,
  package_name text not null,
  client_name text,
  value numeric default 0,
  points_earned integer default 0,
  period text not null,       -- e.g. "Q2-2026"
  month text not null,        -- e.g. "2026-04"
  closed_at timestamptz default now(),
  created_at timestamptz default now()
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

alter table public.reps enable row level security;
alter table public.deals enable row level security;

-- Anyone logged in can read all reps
create policy "reps are viewable by authenticated users"
  on public.reps for select
  to authenticated
  using (true);

-- Users can insert/update their own rep profile
create policy "users can upsert own rep"
  on public.reps for insert
  to authenticated
  with check (id = auth.uid());

create policy "users can update own rep"
  on public.reps for update
  to authenticated
  using (id = auth.uid());

-- Anyone logged in can read all deals (for leaderboard)
create policy "deals are viewable by authenticated users"
  on public.deals for select
  to authenticated
  using (true);

-- Users can only insert their own deals
create policy "users can insert own deals"
  on public.deals for insert
  to authenticated
  with check (rep_id = auth.uid());

-- ============================================================
-- Leaderboard view (optional helper)
-- ============================================================

create or replace view public.leaderboard_view as
select
  r.id,
  r.name,
  r.avatar_url,
  count(d.id) as deals_count,
  coalesce(sum(d.value), 0) as total_revenue,
  coalesce(sum(d.points_earned), 0) as points,
  0 as streak,
  false as is_new_this_quarter
from public.reps r
left join public.deals d on d.rep_id = r.id
group by r.id, r.name, r.avatar_url
order by points desc;

-- ============================================================
-- Enable Realtime on deals table
-- ============================================================
-- Go to Supabase > Database > Replication and enable the
-- deals table, OR run:
-- alter publication supabase_realtime add table public.deals;
