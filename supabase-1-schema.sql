-- ============================================================
-- Hitachi Sales Arena — Full Schema (Fresh Install)
-- ============================================================
-- Run this ONE script on a brand new Supabase project.
-- It replaces the need to run migrations 2, 3, and 4 separately.
--
-- Files 2, 3, and 4 only exist for upgrading an EXISTING database
-- that was set up before those features were added.
--
-- BEFORE running:
--   Supabase > Authentication > Providers > Email >
--   uncheck "Enable email confirmations"
--
-- AFTER running:
--   Sign up with your admin account, then run:
--     update public.reps
--       set approved = true, is_superuser = true
--       where email = 'your@email.com';
-- ============================================================

-- ============================================================
-- Tables
-- ============================================================

-- Reps table (one row per auth user, created automatically on sign-up)
create table if not exists public.reps (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text unique not null,
  avatar_url text,
  approved boolean not null default false,
  is_superuser boolean not null default false,
  created_at timestamptz default now()
);

-- Sales reps table (admin-managed team members, separate from auth users)
create table if not exists public.sales_reps (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  job_title text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Packages table (admin-managed, used in deals)
create table if not exists public.packages (
  id text primary key,  -- slug, e.g. 'cloud-assessment'
  name text not null,
  points integer not null,
  color text not null default '#185FA5',
  created_at timestamptz default now()
);

-- Seed default packages
insert into public.packages (id, name, points, color) values
  ('cloud-assessment',    'Cloud Assessment',      320, '#185FA5'),
  ('security-assessment', 'Security Assessment',   200, '#993556'),
  ('data-ai-accelerator', 'Data & AI Accelerator', 400, '#854F0B'),
  ('support-managed',     'Support & Managed',     150, '#3B6D11')
on conflict (id) do nothing;

-- Deals table
create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid references public.sales_reps(id) on delete cascade not null,
  logged_by uuid references auth.users(id) on delete set null,
  package_id text not null,
  package_name text not null,
  client_name text,
  value numeric default 0,
  points_earned integer default 0,
  period text not null,   -- e.g. "Q2-2026"
  month text not null,    -- e.g. "2026-04"
  closed_at timestamptz default now(),
  created_at timestamptz default now()
);

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
-- Trigger: auto-create reps row on sign-up (bypasses RLS)
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
-- Row Level Security
-- ============================================================

alter table public.reps enable row level security;
alter table public.sales_reps enable row level security;
alter table public.packages enable row level security;
alter table public.deals enable row level security;

-- reps
create policy "users can read own rep"
  on public.reps for select to authenticated
  using (id = auth.uid());

create policy "approved users can read all reps"
  on public.reps for select to authenticated
  using (is_approved());

create policy "users can insert own rep"
  on public.reps for insert to authenticated
  with check (id = auth.uid());

create policy "users can update own rep"
  on public.reps for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "superusers can update any rep"
  on public.reps for update to authenticated
  using (is_superuser());

create policy "superusers can delete any rep"
  on public.reps for delete to authenticated
  using (is_superuser());

-- sales_reps
create policy "approved users can view sales_reps"
  on public.sales_reps for select to authenticated
  using (is_approved());

create policy "approved users can insert sales_reps"
  on public.sales_reps for insert to authenticated
  with check (is_approved());

create policy "approved users can delete sales_reps"
  on public.sales_reps for delete to authenticated
  using (is_approved());

-- packages
create policy "approved users can read packages"
  on public.packages for select to authenticated
  using (is_approved());

create policy "superusers can insert packages"
  on public.packages for insert to authenticated
  with check (is_superuser());

create policy "superusers can update packages"
  on public.packages for update to authenticated
  using (is_superuser());

create policy "superusers can delete packages"
  on public.packages for delete to authenticated
  using (is_superuser());

-- deals
create policy "approved users can view deals"
  on public.deals for select to authenticated
  using (is_approved());

create policy "approved users can insert deals"
  on public.deals for insert to authenticated
  with check (is_approved());

-- ============================================================
-- Enable Realtime on deals table
-- ============================================================
-- Go to Supabase > Database > Replication and enable the
-- deals table, OR run:
-- alter publication supabase_realtime add table public.deals;

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
