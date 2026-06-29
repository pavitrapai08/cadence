-- ============================================================================
-- Cadence — Migration 0002: RLS helpers, triggers, functions, policies, cron
-- Depends on 0001. Apply with: supabase db push
-- ============================================================================

-- ── RLS helper functions (SECURITY DEFINER → bypass users RLS, no recursion) ─
create or replace function public.current_user_role()
  returns text language sql security definer stable
  set search_path = public as
$$ select role from public.users where id = auth.uid() $$;

create or replace function public.is_admin()
  returns boolean language sql security definer stable
  set search_path = public as
$$ select exists (select 1 from public.users
                  where id = auth.uid() and role = 'admin') $$;

create or replace function public.is_manager_of(target uuid)
  returns boolean language sql security definer stable
  set search_path = public as
$$ select exists (select 1 from public.users
                  where id = target and manager_id = auth.uid()) $$;

-- ── Domain restriction + profile creation (the REAL OAuth boundary) ──────────
create or replace function public.handle_new_user()
  returns trigger language plpgsql security definer
  set search_path = public as
$$
begin
  if new.email not ilike '%@decisionfoundry.com' then
    raise exception 'Only @decisionfoundry.com accounts are allowed';
  end if;
  insert into public.users (id, email, full_name, avatar_url, role)
  values (new.id, new.email,
          new.raw_user_meta_data ->> 'full_name',
          new.raw_user_meta_data ->> 'avatar_url',
          'employee')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Billable helper (single source of the billable rule) ─────────────────────
create or replace function public.entry_is_billable(p_tag_ids uuid[])
  returns boolean language sql stable
  set search_path = public as
$$ select exists (select 1 from public.tags t
                  where t.id = any (p_tag_ids) and t.is_billable) $$;

-- ── Submit week (atomic; only path that flips entries to submitted) ──────────
create or replace function public.submit_week(p_week_start date)
  returns void language plpgsql security definer
  set search_path = public as
$$
declare v_ts uuid;
begin
  insert into public.timesheets (user_id, week_start_date, status, submitted_at)
  values (auth.uid(), p_week_start, 'submitted', now())
  on conflict (user_id, week_start_date)
    do update set status = 'submitted', submitted_at = now()
  returning id into v_ts;

  update public.time_entries
     set status = 'submitted', timesheet_id = v_ts, updated_at = now()
   where user_id = auth.uid()
     and date >= p_week_start and date < p_week_start + 7
     and status = 'draft';

  insert into public.notifications (user_id, type, title, body, related_id)
  values (auth.uid(), 'timesheet_submitted', 'Timesheet submitted',
          'Your week of ' || to_char(p_week_start, 'Mon DD') ||
          ' has been submitted.', v_ts);
end $$;

-- ── Missing-hours check (invoked hourly by pg_cron) ──────────────────────────
create or replace function public.check_missing_hours()
  returns void language plpgsql security definer
  set search_path = public as
$$
declare r record; v_local timestamp; v_today date; v_dow text;
begin
  for r in select * from public.users where is_active loop
    v_local := now() at time zone r.timezone;
    v_today := v_local::date;
    v_dow   := lower(trim(to_char(v_local, 'day')));
    if v_dow = any (r.notification_days)
       and extract(hour from v_local) = extract(hour from r.notification_time)
       and not exists (select 1 from public.time_entries
                       where user_id = r.id and date = v_today)
       and not exists (select 1 from public.notifications
                       where user_id = r.id and type = 'missing_hours'
                         and (created_at at time zone r.timezone)::date = v_today)
    then
      insert into public.notifications (user_id, type, title, body)
      values (r.id, 'missing_hours', 'Log your hours',
              'You haven''t logged hours today.');
    end if;
  end loop;
end $$;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.users           enable row level security;
alter table public.clients         enable row level security;
alter table public.tag_groups      enable row level security;
alter table public.projects        enable row level security;
alter table public.project_members enable row level security;
alter table public.tags            enable row level security;
alter table public.timesheets      enable row level security;
alter table public.time_entries    enable row level security;
alter table public.notifications   enable row level security;

-- users ----------------------------------------------------------------------
drop policy if exists users_select on public.users;
create policy users_select on public.users for select using (
  id = auth.uid() or public.is_manager_of(id) or public.is_admin()
);
drop policy if exists users_update on public.users;
create policy users_update on public.users for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
drop policy if exists users_delete on public.users;
create policy users_delete on public.users for delete using (public.is_admin());

-- clients (readable by all signed-in; writable by admin) ----------------------
drop policy if exists clients_select on public.clients;
create policy clients_select on public.clients for select
  using (auth.uid() is not null);
drop policy if exists clients_write on public.clients;
create policy clients_write on public.clients for all
  using (public.is_admin()) with check (public.is_admin());

-- tag_groups ------------------------------------------------------------------
drop policy if exists tag_groups_select on public.tag_groups;
create policy tag_groups_select on public.tag_groups for select
  using (auth.uid() is not null);
drop policy if exists tag_groups_write on public.tag_groups;
create policy tag_groups_write on public.tag_groups for all
  using (public.is_admin()) with check (public.is_admin());

-- projects --------------------------------------------------------------------
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects for select
  using (auth.uid() is not null);
drop policy if exists projects_write on public.projects;
create policy projects_write on public.projects for all
  using (public.is_admin()) with check (public.is_admin());

-- tags ------------------------------------------------------------------------
drop policy if exists tags_select on public.tags;
create policy tags_select on public.tags for select
  using (auth.uid() is not null);
drop policy if exists tags_write on public.tags;
create policy tags_write on public.tags for all
  using (public.is_admin()) with check (public.is_admin());

-- project_members -------------------------------------------------------------
drop policy if exists project_members_select on public.project_members;
create policy project_members_select on public.project_members for select using (
  user_id = auth.uid() or public.is_manager_of(user_id) or public.is_admin()
);
drop policy if exists project_members_write on public.project_members;
create policy project_members_write on public.project_members for all
  using (public.is_admin()) with check (public.is_admin());

-- timesheets ------------------------------------------------------------------
drop policy if exists timesheets_select on public.timesheets;
create policy timesheets_select on public.timesheets for select using (
  user_id = auth.uid() or public.is_manager_of(user_id) or public.is_admin()
);
drop policy if exists timesheets_insert on public.timesheets;
create policy timesheets_insert on public.timesheets for insert
  with check (user_id = auth.uid());
drop policy if exists timesheets_update on public.timesheets;
create policy timesheets_update on public.timesheets for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- time_entries ----------------------------------------------------------------
drop policy if exists time_entries_select on public.time_entries;
create policy time_entries_select on public.time_entries for select using (
  user_id = auth.uid() or public.is_manager_of(user_id) or public.is_admin()
);
-- INSERT: own rows, draft only, and ONLY against a project you are a member of
drop policy if exists time_entries_insert on public.time_entries;
create policy time_entries_insert on public.time_entries for insert with check (
  user_id = auth.uid()
  and status = 'draft'
  and exists (select 1 from public.project_members pm
              where pm.project_id = time_entries.project_id
                and pm.user_id = auth.uid())
);
-- UPDATE/DELETE: own rows, and only while still draft (submitted = immutable)
drop policy if exists time_entries_update on public.time_entries;
create policy time_entries_update on public.time_entries for update
  using (user_id = auth.uid() and status = 'draft')
  with check (user_id = auth.uid());
drop policy if exists time_entries_delete on public.time_entries;
create policy time_entries_delete on public.time_entries for delete
  using (user_id = auth.uid() and status = 'draft');

-- notifications (owner-only; inserts come from SECURITY DEFINER fns / service) -
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select
  using (user_id = auth.uid());
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications for delete
  using (user_id = auth.uid());

-- ── Realtime: stream notifications to the bell (RLS still applies per row) ────
alter table public.notifications replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- ── Schedule the hourly reminder (re-runnable) ───────────────────────────────
-- If this errors because pg_cron is not enabled, enable it in
-- Dashboard → Database → Extensions, then re-run this block.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'missing-hours-hourly') then
    perform cron.unschedule('missing-hours-hourly');
  end if;
  perform cron.schedule('missing-hours-hourly', '0 * * * *',
                        $cron$ select public.check_missing_hours(); $cron$);
end $$;
