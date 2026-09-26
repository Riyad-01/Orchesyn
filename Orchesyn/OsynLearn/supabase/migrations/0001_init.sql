-- OsynLearn · Supabase (free tier) schema
-- Paste into: Supabase dashboard → SQL editor → Run.
-- The anon key is public by design; row-level security below keeps each
-- learner's rows private. Guest (local-only) mode needs none of this.

create extension if not exists pgcrypto;

-- ---------- profiles ----------
create table if not exists profiles (
  id text primary key,
  name text not null default 'Learner',
  email text,
  avatar_color text not null default '#7C5CFF',
  level text not null default 'B1',
  goal text not null default 'general',
  accent_target text not null default 'neutral',
  daily_goal_min int not null default 10,
  available_min_per_day int not null default 15,
  native_language text,
  practice_language text,
  exam_date text,
  ielts_module text,
  target_overall numeric,
  target_speaking numeric,
  target_sections jsonb,
  ui_language text,
  section_levels jsonb,
  plan text not null default 'free',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- sessions ----------
create table if not exists sessions (
  id text primary key,
  user_id text not null,
  mode text not null,
  title text not null,
  status text not null,
  topic_id text,
  theme_id text,
  scenario_id text,
  drill_id text,
  mock_id text,
  started_at timestamptz not null,
  finished_at timestamptz,
  spoken_sec int not null default 0,
  overall int not null default 0,
  band numeric not null default 0,
  dimension_scores jsonb not null default '{}'::jsonb,
  report_id text not null
);
create index if not exists sessions_user_started on sessions (user_id, started_at desc);

-- ---------- reports (full feedback payload) ----------
create table if not exists reports (
  id text primary key,
  user_id text,
  session_id text,
  mode text,
  overall int,
  band numeric,
  cefr text,
  transcript text,
  payload jsonb not null
);

-- ---------- coach sessions ----------
create table if not exists coach_sessions (
  id text primary key,
  user_id text not null,
  theme_id text,
  scenario_id text,
  title text not null,
  messages jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  totals jsonb not null default '{}'::jsonb
);

-- ---------- ielts mock results ----------
create table if not exists ielts_mock_results (
  id text primary key,
  user_id text not null,
  mock_id text not null,
  date timestamptz not null,
  band numeric not null,
  overall int not null,
  parts jsonb not null default '[]'::jsonb,
  report_ids jsonb not null default '[]'::jsonb
);

-- ---------- notifications ----------
create table if not exists notifications (
  id text primary key,
  user_id text not null,
  title text not null,
  body text not null,
  kind text not null default 'info',
  read boolean not null default false,
  at timestamptz not null default now()
);

-- ---------- row level security: each learner sees only their rows ----------
alter table profiles enable row level security;
alter table sessions enable row level security;
alter table reports enable row level security;
alter table coach_sessions enable row level security;
alter table ielts_mock_results enable row level security;
alter table notifications enable row level security;

drop policy if exists profiles_self on profiles;
create policy profiles_self on profiles for all using (id = auth.uid()::text) with check (id = auth.uid()::text);

drop policy if exists sessions_self on sessions;
create policy sessions_self on sessions for all using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);

drop policy if exists reports_self on reports;
create policy reports_self on reports for all using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);

drop policy if exists coach_self on coach_sessions;
create policy coach_self on coach_sessions for all using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);

drop policy if exists mocks_self on ielts_mock_results;
create policy mocks_self on ielts_mock_results for all using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);

drop policy if exists notif_self on notifications;
create policy notif_self on notifications for all using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);
