-- ============================================================================
-- Cadence — Migration 0001: extensions, tables, indexes, updated_at triggers
-- Apply with: supabase db push   (or paste into the Supabase SQL editor)
-- ============================================================================

-- Extensions ----------------------------------------------------------------
-- pg_cron powers the hourly missing-hours reminder (see 0002 + TECH_SPEC §4a).
-- On Supabase you may also need to enable it once via Dashboard → Database →
-- Extensions. gen_random_uuid() is built into Postgres 13+ (Supabase = 15).
create extension if not exists pg_cron;

-- updated_at trigger function -----------------------------------------------
create or replace function public.set_updated_at()
  returns trigger language plpgsql as
$$ begin new.updated_at = now(); return new; end $$;

-- users ----------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  avatar_url text,
  role text not null default 'employee'
    check (role in ('employee', 'manager', 'admin')),
  manager_id uuid references public.users (id),
  capacity_hours int not null default 40,
  timezone text not null default 'Asia/Kolkata',
  notification_days text[] default
    '{"monday","tuesday","wednesday","thursday","friday"}',
  notification_time time default '17:00',
  dismissed_welcome boolean not null default false,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create trigger users_set_updated_at before update on public.users
  for each row execute function public.set_updated_at();

-- clients --------------------------------------------------------------------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean default true,
  created_by uuid references public.users (id),
  created_at timestamptz default now()
);

-- tag_groups -----------------------------------------------------------------
create table if not exists public.tag_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_by uuid references public.users (id),
  created_at timestamptz default now()
);

-- projects -------------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  client_id uuid references public.clients (id),
  external_id text,
  description text,
  colour text not null default '#1B6B3A',
  tag_group_id uuid references public.tag_groups (id),
  budget_hours numeric,
  is_active boolean default true,
  created_by uuid references public.users (id),
  created_at timestamptz default now()
);

-- project_members (critical junction: who may log against a project) ---------
create table if not exists public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  added_by uuid references public.users (id),
  added_at timestamptz default now(),
  primary key (project_id, user_id)
);

-- tags -----------------------------------------------------------------------
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  tag_group_id uuid not null references public.tag_groups (id) on delete cascade,
  name text not null,
  is_required boolean default false,
  is_billable boolean not null default true,
  sort_order int default 0,
  created_at timestamptz default now(),
  unique (tag_group_id, name)
);

-- timesheets -----------------------------------------------------------------
create table if not exists public.timesheets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  week_start_date date not null,                 -- always a Monday
  status text default 'draft' check (status in ('draft', 'submitted')),
  submitted_at timestamptz,
  created_at timestamptz default now(),
  unique (user_id, week_start_date)
);

-- time_entries ---------------------------------------------------------------
create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  project_id uuid not null references public.projects (id),
  date date not null,
  hours numeric(5, 2) not null check (hours > 0 and hours <= 24),
  raw_notes text,
  ai_description text,
  tag_ids uuid[] default '{}',
  status text default 'draft' check (status in ('draft', 'submitted')),
  timesheet_id uuid references public.timesheets (id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create trigger time_entries_set_updated_at before update on public.time_entries
  for each row execute function public.set_updated_at();

-- notifications --------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null check (type in ('timesheet_submitted', 'missing_hours')),
  title text not null,
  body text,
  is_read boolean default false,
  related_id uuid,
  created_at timestamptz default now()
);

-- Indexes --------------------------------------------------------------------
create index if not exists idx_time_entries_user_date
  on public.time_entries (user_id, date);
create index if not exists idx_time_entries_project
  on public.time_entries (project_id);
create index if not exists idx_time_entries_timesheet
  on public.time_entries (timesheet_id);
create index if not exists idx_project_members_user
  on public.project_members (user_id);
create index if not exists idx_tags_group on public.tags (tag_group_id);
create index if not exists idx_projects_client on public.projects (client_id);
create index if not exists idx_notifications_user_unread
  on public.notifications (user_id, is_read);
create index if not exists idx_users_manager on public.users (manager_id);
