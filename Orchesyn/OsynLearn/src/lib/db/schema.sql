-- ==========================================================================
-- OsynLearn-clone schema (Postgres / Supabase)
--
-- Design notes:
--   * `profiles` is keyed to auth.users and created by a trigger, so a user
--     never exists in the app without a profile row.
--   * Row Level Security is on for every table: users read and write their own
--     rows and nothing else. There is no service-role access from the client.
--   * `reports.payload` is JSONB because a feedback report is a deep, evolving
--     structure. The columns you filter and aggregate on are promoted out.
-- ==========================================================================

create extension if not exists "pgcrypto";

-- ------------------------------- profiles -------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  user_id uuid generated always as (id) stored,
  name text not null default 'Learner',
  email text,
  avatar_color text not null default '#7C5CFF',
  level text not null default 'B1' check (level in ('A2','B1','B2','C1','C2')),
  goal text not null default 'general',
  accent_target text not null default 'neutral',
  daily_goal_min integer not null default 10 check (daily_goal_min between 1 and 120),
  available_min_per_day integer not null default 10,
  native_language text,
  exam_date date,
  plan text not null default 'free' check (plan in ('free','plus','pro')),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now()
);

-- ------------------------------- sessions -------------------------------
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null,
  title text not null,
  status text not null default 'completed',
  topic_id text,
  theme_id text,
  scenario_id text,
  drill_id text,
  mock_id text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  spoken_sec integer not null default 0,
  overall integer not null default 0,
  band numeric(3,1) not null default 0,
  dimension_scores jsonb not null default '{}'::jsonb,
  report_id text
);

create index if not exists sessions_user_started_idx
  on public.sessions (user_id, started_at desc);

-- ------------------------------- reports -------------------------------
create table if not exists public.reports (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid references public.sessions (id) on delete set null,
  mode text not null,
  overall integer not null,
  band numeric(3,1) not null,
  cefr text,
  transcript text,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists reports_user_created_idx
  on public.reports (user_id, created_at desc);

-- --------------------------- coach conversations ---------------------------
create table if not exists public.coach_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  theme_id text,
  scenario_id text,
  title text not null,
  messages jsonb not null default '[]'::jsonb,
  totals jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  last_at timestamptz not null default now()
);

create index if not exists coach_sessions_user_idx
  on public.coach_sessions (user_id, last_at desc);

-- --------------------------- IELTS mock results ---------------------------
create table if not exists public.ielts_mock_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mock_id text not null,
  band numeric(3,1) not null,
  overall integer not null,
  parts jsonb not null default '[]'::jsonb,
  report_ids text[] not null default '{}',
  date timestamptz not null default now()
);

-- ----------------------------- notifications -----------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'system',
  title text not null,
  body text not null,
  read boolean not null default false,
  at timestamptz not null default now()
);

-- ==========================================================================
-- Row Level Security
-- ==========================================================================
alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.reports enable row level security;
alter table public.coach_sessions enable row level security;
alter table public.ielts_mock_results enable row level security;
alter table public.notifications enable row level security;

create policy "own profile select" on public.profiles for select using (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);

create policy "own sessions select" on public.sessions for select using (auth.uid() = user_id);
create policy "own sessions write" on public.sessions for insert with check (auth.uid() = user_id);
create policy "own sessions update" on public.sessions for update using (auth.uid() = user_id);
create policy "own sessions delete" on public.sessions for delete using (auth.uid() = user_id);

create policy "own reports select" on public.reports for select using (auth.uid() = user_id);
create policy "own reports write" on public.reports for insert with check (auth.uid() = user_id);
create policy "own reports delete" on public.reports for delete using (auth.uid() = user_id);

create policy "own coach select" on public.coach_sessions for select using (auth.uid() = user_id);
create policy "own coach write" on public.coach_sessions for insert with check (auth.uid() = user_id);
create policy "own coach update" on public.coach_sessions for update using (auth.uid() = user_id);
create policy "own coach delete" on public.coach_sessions for delete using (auth.uid() = user_id);

create policy "own mocks select" on public.ielts_mock_results for select using (auth.uid() = user_id);
create policy "own mocks write" on public.ielts_mock_results for insert with check (auth.uid() = user_id);
create policy "own mocks delete" on public.ielts_mock_results for delete using (auth.uid() = user_id);

create policy "own notifications select" on public.notifications for select using (auth.uid() = user_id);
create policy "own notifications write" on public.notifications for insert with check (auth.uid() = user_id);
create policy "own notifications update" on public.notifications for update using (auth.uid() = user_id);

-- ==========================================================================
-- Profile bootstrap: every new auth user gets a profile row automatically.
-- ==========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, 'learner'), '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
