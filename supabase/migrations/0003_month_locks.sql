-- ============================================================================
-- Cadence — Migration 0003: month locks
-- Admins can lock/unlock any month. Months auto-lock on the 1st via pg_cron.
-- Employees (and managers) cannot create, edit, or delete entries in a locked
-- month. The submit_week RPC (status-only UPDATE) is explicitly allowed through.
-- Depends on 0001 + 0002. Apply with: supabase db push
-- ============================================================================

-- ── month_locks table ────────────────────────────────────────────────────────
create table if not exists public.month_locks (
  year        int  not null,
  month       int  not null check (month between 1 and 12),
  is_locked   boolean not null default true,
  locked_by   uuid references public.users (id),
  locked_at   timestamptz not null default now(),
  unlocked_by uuid references public.users (id),
  unlocked_at timestamptz,
  primary key (year, month)
);

create index if not exists idx_month_locks_lookup
  on public.month_locks (year, month) where is_locked = true;

-- ── Enforcement trigger on time_entries ─────────────────────────────────────
-- Fires BEFORE INSERT, UPDATE, DELETE.
-- For UPDATE: passes through if only status/timesheet_id/updated_at changed
-- (submit_week path) so employees can still submit timesheets in locked months.
create or replace function public.check_entry_month_not_locked()
  returns trigger language plpgsql security definer
  set search_path = public as
$$
declare
  v_date date;
begin
  v_date := case when TG_OP = 'DELETE' then OLD.date else NEW.date end;

  -- Pass through status-only updates (submit_week sets status + timesheet_id)
  if TG_OP = 'UPDATE'
     and OLD.hours           = NEW.hours
     and OLD.raw_notes       is not distinct from NEW.raw_notes
     and OLD.ai_description  is not distinct from NEW.ai_description
     and OLD.tag_ids         = NEW.tag_ids
     and OLD.project_id      = NEW.project_id
     and OLD.date            = NEW.date
  then
    return NEW;
  end if;

  if exists (
    select 1 from public.month_locks
    where year      = extract(year  from v_date)::int
      and month     = extract(month from v_date)::int
      and is_locked = true
  ) then
    raise exception 'month_locked: Entries for % are locked. Ask an admin to unlock.',
      to_char(v_date, 'FMMonth YYYY');
  end if;

  return case when TG_OP = 'DELETE' then OLD else NEW end;
end $$;

drop trigger if exists time_entries_check_month_lock on public.time_entries;
create trigger time_entries_check_month_lock
  before insert or update or delete on public.time_entries
  for each row execute function public.check_entry_month_not_locked();

-- ── Auto-lock function (pg_cron calls this on the 1st of each month) ────────
-- Uses ON CONFLICT DO NOTHING so a manual admin unlock is never overwritten.
create or replace function public.auto_lock_previous_month()
  returns void language plpgsql security definer
  set search_path = public as
$$
declare
  v_prev date := date_trunc('month', now()) - interval '1 month';
begin
  insert into public.month_locks (year, month, is_locked)
  values (extract(year from v_prev)::int, extract(month from v_prev)::int, true)
  on conflict (year, month) do nothing;
end $$;

-- Schedule: 1st of every month at 00:05 UTC (5-min offset avoids midnight load)
do $$
begin
  if exists (select 1 from cron.job where jobname = 'auto-lock-previous-month') then
    perform cron.unschedule('auto-lock-previous-month');
  end if;
  perform cron.schedule('auto-lock-previous-month', '5 0 1 * *',
                        $cron$ select public.auto_lock_previous_month(); $cron$);
end $$;

-- ── Backfill: lock all months before the current month ───────────────────────
-- Safe to re-run (ON CONFLICT DO NOTHING). Runs once at migration time to
-- establish the correct locked state for historical months.
insert into public.month_locks (year, month, is_locked)
select
  extract(year  from d)::int,
  extract(month from d)::int,
  true
from generate_series(
  '2024-01-01'::date,
  (date_trunc('month', now()) - interval '1 day')::date,
  '1 month'::interval
) as d
on conflict (year, month) do nothing;

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.month_locks enable row level security;

-- All authenticated users can read (calendar needs to show the lock state)
drop policy if exists month_locks_select on public.month_locks;
create policy month_locks_select on public.month_locks for select
  using (auth.uid() is not null);

-- Only admins can insert / update / delete rows (the auto-lock fn is SECURITY
-- DEFINER so it bypasses RLS; admin API routes use the user session)
drop policy if exists month_locks_admin_write on public.month_locks;
create policy month_locks_admin_write on public.month_locks for all
  using (public.is_admin()) with check (public.is_admin());
