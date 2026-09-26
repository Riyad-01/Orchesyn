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
-- 0002_production_services: orgs, teacher workflow, billing, consents, durable attempts.
-- Server-enforced authorisation: RLS below mirrors lib/rbac.ts; routes double-check.

create table if not exists orgs (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists org_members (
  user_id text not null references profiles(id),
  org_id text not null references orgs(id),
  role text not null check (role in ('learner','teacher','org_admin')),
  created_at timestamptz not null default now(),
  primary key (user_id, org_id)
);

create table if not exists org_invites (
  code text primary key,
  org_id text not null references orgs(id),
  role text not null check (role in ('learner','teacher')),
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists assignments (
  id text primary key,
  org_id text not null references orgs(id),
  learner_id text not null,
  lesson_id text not null,
  assigned_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists submissions (
  id text primary key,
  org_id text not null references orgs(id),
  learner_id text not null,
  lesson_id text not null,
  body text not null,
  created_at timestamptz not null default now()
);

-- immutable audit trail: no update/delete grants to any role
create table if not exists feedback_overrides (
  id text primary key,
  submission_id text not null references submissions(id),
  org_id text not null,
  teacher_id text not null,
  note text not null,
  previous_feedback text not null,
  created_at timestamptz not null default now()
);

create table if not exists subscriptions (
  user_id text primary key references profiles(id),
  offer text not null,
  status text not null check (status in ('active','past_due','cancelled','refunded')),
  period_end date,
  updated_at timestamptz not null default now()
);

-- idempotency: webhook events apply at most once
create table if not exists webhook_events (
  event_id text primary key,
  type text not null,
  user_id text not null,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

create table if not exists writing_attempts (
  id text primary key,
  user_id text not null references profiles(id),
  task_id text not null,
  body text not null,
  bands jsonb,
  tier text not null,
  created_at timestamptz not null default now()
);

create table if not exists consents (
  user_id text primary key references profiles(id),
  recording_upload boolean not null default false,
  retention_days int not null default 90 check (retention_days in (30,90,365)),
  updated_at timestamptz not null default now()
);

alter table orgs enable row level security;
alter table org_members enable row level security;
alter table org_invites enable row level security;
alter table assignments enable row level security;
alter table submissions enable row level security;
alter table feedback_overrides enable row level security;
alter table subscriptions enable row level security;
alter table webhook_events enable row level security;
alter table writing_attempts enable row level security;
alter table consents enable row level security;

-- membership helper (security definer avoids recursive RLS on org_members)
create or replace function my_role_in(org text) returns text language sql stable security definer as
$$ select role from org_members where user_id = auth.uid()::text and org_id = org limit 1 $$;

create policy orgs_member on orgs for select using (my_role_in(id) is not null or auth.uid()::text in (select user_id from org_members where role = 'org_admin'));
create policy members_same_org on org_members for select using (my_role_in(org_id) is not null);
create policy members_manage_admin on org_members for insert with check (my_role_in(org_id) in ('teacher','org_admin') or user_id = auth.uid()::text);
create policy invites_read_member on org_invites for select using (my_role_in(org_id) is not null);
create policy invites_write_teacher on org_invites for insert with check (my_role_in(org_id) in ('teacher','org_admin'));
create policy assignments_read on assignments for select using (my_role_in(org_id) is not null or learner_id = auth.uid()::text);
create policy assignments_write_teacher on assignments for insert with check (my_role_in(org_id) in ('teacher','org_admin'));
create policy submissions_owner on submissions for select using (learner_id = auth.uid()::text or my_role_in(org_id) in ('teacher','org_admin'));
create policy submissions_insert_own on submissions for insert with check (learner_id = auth.uid()::text and my_role_in(org_id) = 'learner');
create policy overrides_read_org on feedback_overrides for select using (my_role_in(org_id) in ('teacher','org_admin'));
create policy overrides_write_teacher on feedback_overrides for insert with check (my_role_in(org_id) in ('teacher','org_admin'));
create policy subs_self on subscriptions for select using (user_id = auth.uid()::text);
-- webhook_events & subscriptions writes happen via service role (webhook handler), never via anon RLS
create policy attempts_self on writing_attempts for all using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);
create policy consents_self on consents for all using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);
