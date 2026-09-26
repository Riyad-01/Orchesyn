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
