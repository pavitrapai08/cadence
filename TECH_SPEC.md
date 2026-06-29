# Technical Specification — Cadence

**Version:** 1.2 · **Build type:** Portfolio / Internal Tool · **Stack:** Next.js 14 + Vercel + Supabase + Claude API
**Companion files:** `CLAUDE.md` (standing rules + complete tag groups), `IMPLEMENTATION_PLAN.md` (phased build).

> **v1.2 changes:** added `tags.is_billable`, `users.timezone`, `users.dismissed_welcome`; pinned `hours numeric(5,2)`; added §4a (RLS helpers, auth/domain trigger, updated_at trigger, submit RPC, missing-hours cron function); moved the daily reminder to Supabase `pg_cron`; made the health check deterministic; added `max_tokens` + `runtime='nodejs'` + AI rate-limit; added `jspdf-autotable`; added §16 testing & §17 migrations.

---

## 1. System overview

Cadence is DecisionFoundry's internal time-tracking and AI-powered timesheet platform — a direct replacement for Timely. Employees log hours against projects they are assigned to, submit weekly timesheets (submit = final, no approval step), and use AI to polish notes and reflect on their week. Admins manage the workspace. No external email service — all notifications are in-app via Supabase Realtime.

---

## 2. The six tabs

| Tab | Who sees it | What it does |
|---|---|---|
| Hours | All | Calendar (day/week/month) — log, edit, copy, move, drag-drop entries |
| Projects | All (admin manages) | Dashboard + project detail pages with billable/NB breakdown |
| People | Manager + Admin | Team utilisation, submitted vs pending |
| Reports | All (role-scoped) | Client & Projects report + Timesheets report + export |
| AI | All | Weekly digest (personal) + Timesheet health check |
| Account | All | Profile, notifications, workspace settings (admin) |

---

## 3. Architecture

```
┌─────────────────────────────────────┐
│  Browser (Next.js client)            │
│  + Supabase Realtime subscription    │
│    (bell icon updates live,          │
│     filtered to user_id)             │
└──────────────┬──────────────────────┘
               │ fetch (JSON / stream)
               ▼
┌──────────────────────────────────────┐
│  Vercel serverless route handlers    │
│  runtime=nodejs on AI routes         │
│  /api/entries   /api/timesheets      │
│  /api/ai/narrative  (stream)         │
│  /api/ai/digest     (stream)         │
│  /api/ai/health     (JSON, no LLM)   │
│  /api/reports   /api/projects        │
│  /api/admin/*   /api/notifications   │
│  /api/cron/missing-hours (Pro only)  │
│  maxDuration = 60 on AI routes       │
└──────┬──────────────────┬────────────┘
       │                  │
┌──────▼──────────┐  ┌────▼─────────────┐
│ Supabase        │  │ Claude API        │
│ Postgres + RLS  │  │ claude-sonnet-4-6 │
│ Google OAuth    │  │ narrative +       │
│ Realtime        │  │ digest (health is │
│ pg_cron (hourly)│  │ rules-based, NO   │
│                 │  │ LLM)              │
└─────────────────┘  └──────────────────┘
```

---

## 4. Data model (Supabase Postgres)

All tables: `id uuid pk default gen_random_uuid()`, `created_at timestamptz default now()`. RLS on every table. Tables with `updated_at` get the `set_updated_at` trigger (§4a).

### users
```sql
id uuid references auth.users primary key,
email text not null unique,
full_name text,
avatar_url text,
role text not null default 'employee',  -- employee | manager | admin
manager_id uuid references users(id),
capacity_hours int not null default 40,
timezone text not null default 'Asia/Kolkata',  -- IANA tz, drives reminder + "today"
notification_days text[] default '{"monday","tuesday","wednesday","thursday","friday"}',
notification_time time default '17:00',
dismissed_welcome boolean not null default false,
is_active boolean default true,
updated_at timestamptz default now()
```

### clients
```sql
id uuid pk,
name text not null,
is_active boolean default true,
created_by uuid references users(id)
```
Seed: `Dr. Reddy's` · `Intrigue Media Solutions Inc` · `SiteOne Landscape Supply` · `The Chicago Dental Studio` · `Non Billable Project`

### projects
```sql
id uuid pk,
name text not null,
client_id uuid references clients(id),
external_id text,
description text,
colour text not null default '#1B6B3A',
tag_group_id uuid references tag_groups(id),
budget_hours numeric,
is_active boolean default true,  -- false = archived: hidden from entry modal, kept in reports
created_by uuid references users(id)
```
Seed: 13 projects with exact colours and external IDs from `CLAUDE.md §16`.

### project_members ← CRITICAL junction table
```sql
project_id uuid references projects(id) not null,
user_id uuid references users(id) not null,
added_by uuid references users(id),
added_at timestamptz default now(),
primary key (project_id, user_id)
```
**RLS rule:** employees can only create `time_entries` against projects where a `project_members` row exists for their `user_id`. Enforced in RLS (`with check`) AND in the API route — the project dropdown queries `project_members` to show only assigned projects. Admin assigns members when creating or editing a project.

### tag_groups
```sql
id uuid pk,
name text not null unique,
created_by uuid references users(id)
```
Seed: 7 tag groups from `CLAUDE.md §16`.

### tags
```sql
id uuid pk,
tag_group_id uuid references tag_groups(id) not null,
name text not null,
is_required boolean default false,
is_billable boolean not null default true,  -- sole source of billable/NB classification
sort_order int default 0
```
Seed: all tags from `CLAUDE.md §16`. Only `All Hands` has `is_required = true`. `is_billable` per the §16 seed rule (groups 1–2: false if name starts `NB_`; groups 3–7: all false).

### time_entries
```sql
id uuid pk,
user_id uuid references users(id) not null,
project_id uuid references projects(id) not null,
date date not null,
hours numeric(5,2) not null check (hours > 0 and hours <= 24),
raw_notes text,
ai_description text,
tag_ids uuid[] default '{}',
status text default 'draft',  -- draft | submitted
timesheet_id uuid references timesheets(id),
updated_at timestamptz default now()
```
- RLS: employees see `user_id = auth.uid()` only; managers see `is_manager_of(user_id)`; admins see all.
- **Submitted entries are immutable:** the UPDATE/DELETE RLS policies require `status = 'draft'`, and the API double-checks (returns 403). The submit RPC is the only path that flips an entry to `submitted`.
- **Billable classification (derived, not stored):** an entry is billable iff any of its `tag_ids` map to a tag with `is_billable = true`. Reporting uses the `entry_billable` SQL helper / view (§4a) so the rule lives in one place.
- **tag_ids integrity:** the API validates on write that every tag_id belongs to the selected project's `tag_group_id`. (Array is intentional denormalisation for simple reads; reports `unnest` it — see §10/§17.)

### timesheets
```sql
id uuid pk,
user_id uuid references users(id) not null,
week_start_date date not null,  -- always a Monday (date-fns weekStartsOn:1)
status text default 'draft',    -- draft | submitted
submitted_at timestamptz,
unique(user_id, week_start_date)
```
No `manager_comment`, `reviewed_at`, `reviewed_by` — there is no approval step.

### notifications
```sql
id uuid pk,
user_id uuid references users(id) not null,
type text not null,  -- timesheet_submitted | missing_hours
title text not null,
body text,
is_read boolean default false,
related_id uuid,
created_at timestamptz default now()
```
RLS: users see only their own notifications. Supabase Realtime enabled; the client subscribes with filter `user_id=eq.<uid>` so the bell only ever receives the owner's rows.

---

## 4a. Database functions, triggers & RLS (first migration)

These are **required for Phase 0 to work at all** — they were the silent gaps in v1.1.

**RLS helper functions** (avoid the `users`-policy recursion footgun):
```sql
create or replace function public.current_user_role()
  returns text language sql security definer stable
  set search_path = public as
$$ select role from public.users where id = auth.uid() $$;

create or replace function public.is_admin()
  returns boolean language sql security definer stable
  set search_path = public as
$$ select exists(select 1 from public.users where id = auth.uid() and role = 'admin') $$;

create or replace function public.is_manager_of(target uuid)
  returns boolean language sql security definer stable
  set search_path = public as
$$ select exists(select 1 from public.users where id = target and manager_id = auth.uid()) $$;
```

**Domain restriction + profile creation** (the real OAuth boundary):
```sql
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
          new.raw_user_meta_data->>'full_name',
          new.raw_user_meta_data->>'avatar_url',
          'employee')
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

**updated_at trigger** (applied to `users`, `time_entries`; Postgres does not auto-update timestamps):
```sql
create or replace function public.set_updated_at()
  returns trigger language plpgsql as
$$ begin new.updated_at = now(); return new; end $$;
-- create trigger set_updated_at before update on <table> for each row ...
```

**Billable helper** (single source of the billable rule):
```sql
create or replace function public.entry_is_billable(p_tag_ids uuid[])
  returns boolean language sql stable as
$$ select exists(select 1 from public.tags t where t.id = any(p_tag_ids) and t.is_billable) $$;
```

**Submit week (atomic)** — one transaction, never half-submitted:
```sql
create or replace function public.submit_week(p_week_start date)
  returns void language plpgsql security definer
  set search_path = public as
$$
declare v_ts uuid;
begin
  insert into timesheets (user_id, week_start_date, status, submitted_at)
  values (auth.uid(), p_week_start, 'submitted', now())
  on conflict (user_id, week_start_date)
    do update set status='submitted', submitted_at=now()
  returning id into v_ts;

  update time_entries
     set status='submitted', timesheet_id=v_ts, updated_at=now()
   where user_id=auth.uid()
     and date >= p_week_start and date < p_week_start + 7
     and status='draft';

  insert into notifications (user_id, type, title, body, related_id)
  values (auth.uid(), 'timesheet_submitted', 'Timesheet submitted',
          'Your week of ' || to_char(p_week_start,'Mon DD') || ' has been submitted.', v_ts);
end $$;
```

**Missing-hours cron function** — invoked hourly by `pg_cron`:
```sql
create or replace function public.check_missing_hours()
  returns void language plpgsql security definer
  set search_path = public as
$$
declare r record; v_local timestamptz; v_today date; v_dow text;
begin
  for r in select * from users where is_active loop
    v_local := now() at time zone r.timezone;
    v_today := v_local::date;
    v_dow   := lower(trim(to_char(v_local,'day')));
    if v_dow = any(r.notification_days)
       and extract(hour from v_local) = extract(hour from r.notification_time)
       and not exists (select 1 from time_entries
                       where user_id=r.id and date=v_today)
       and not exists (select 1 from notifications
                       where user_id=r.id and type='missing_hours'
                         and (created_at at time zone r.timezone)::date = v_today)
    then
      insert into notifications (user_id, type, title, body)
      values (r.id, 'missing_hours', 'Log your hours',
              'You haven''t logged hours today.');
    end if;
  end loop;
end $$;

-- schedule (run once, in the migration or Supabase SQL editor):
select cron.schedule('missing-hours-hourly', '0 * * * *',
                     $$ select public.check_missing_hours(); $$);
```
`pg_cron` is enabled via `create extension if not exists pg_cron;` (Supabase: Database → Extensions). This needs **no `CRON_SECRET`** — it runs inside Postgres. The HTTP route `/api/cron/missing-hours` (CRON_SECRET-guarded) is the optional Vercel-Pro alternative that simply calls `check_missing_hours()`.

---

## 5. API routes

All routes validate the Supabase session. AI routes set `export const maxDuration = 60` **and** `export const runtime = 'nodejs'`. All return `{ data }` or `{ error: { code, message } }`.

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/entries` | GET | All | Entries for a user in a date range |
| `/api/entries` | POST | All | Create entry (validates project_members + tag/group match) |
| `/api/entries/:id` | PATCH | All | Update (blocked if submitted) |
| `/api/entries/:id` | DELETE | All | Delete (blocked if submitted) |
| `/api/timesheets` | POST | All | Submit week — calls `submit_week()` RPC (atomic) |
| `/api/ai/narrative` | POST | All | Stream one polished sentence (`max_tokens≈100`) |
| `/api/ai/digest` | POST | All | Stream personal weekly digest (`max_tokens≈1024`) |
| `/api/ai/health` | POST | All | Rules-based health flags (JSON, **no LLM**) |
| `/api/projects` | GET | All | Projects the user is a member of |
| `/api/projects` | POST | Admin | Create project |
| `/api/projects/:id` | PATCH | Admin | Update project |
| `/api/projects/:id/members` | POST/DELETE | Admin | Assign/remove team members |
| `/api/reports/clients` | GET | All (scoped) | Hours by client per week |
| `/api/reports/timesheets` | GET | All (scoped) | Flat entry list with filters |
| `/api/reports/people` | GET | Manager/Admin | Weekly utilisation per user |
| `/api/admin/users` | GET/PATCH | Admin | Manage users, roles, **manager_id** |
| `/api/admin/tag-groups` | GET/POST/PATCH | Admin | Manage tag groups |
| `/api/admin/tags` | POST/PATCH/DELETE | Admin | Manage tags (incl. is_billable) |
| `/api/notifications` | GET | All | Unread notifications |
| `/api/notifications/:id/read` | PATCH | All | Mark as read |
| `/api/cron/missing-hours` | POST | Cron (CRON_SECRET) | **Optional (Pro)** — calls `check_missing_hours()` |

---

## 6. Claude API integration

Model: `claude-sonnet-4-6`, server-side only, streaming on narrative and digest routes. Every call sets `max_tokens` and runs in the Node runtime.

**Narrative** (`max_tokens ≈ 100`):
```
You are a professional timesheet assistant for DecisionFoundry,
a data analytics consulting firm. Turn rough notes into ONE
concise, professional timesheet sentence. Be specific and
factual. No preamble. Maximum one sentence.
```

**Digest** (`max_tokens ≈ 1024`, streaming):
```
You are helping a DecisionFoundry employee reflect on their week.
Given time entries grouped by project, write a short personal
paragraph per project. Write in second person ("You worked on...").
Be specific and encouraging. This is for personal reflection only,
not a client email.
```

**Health check — NO Claude call.** Pure, deterministic, instant, reproducible:
```ts
// for each entry this week:
//   no_note   → !note || note.trim() === ''
//   too_brief → note.trim().split(/\s+/).length < 5
//   else      → ok (green)
// returns [{ entryId, date, project, issue: 'no_note' | 'too_brief' }]
```
Rationale: word-count is exact and free; an LLM would add latency, cost, and non-determinism that flaps the QA check.

**Rate / abuse guard:** the "Polish with AI" and "Generate my week" buttons are disabled while a stream is in flight. A soft per-user cap (e.g. 60 narrative calls/hour) is enforced server-side via a lightweight count on `time_entries.updated_at` or an `ai_usage` check; exceeding it returns `{ error: { code: 'rate_limited' } }` shown as a toast. Production: move to Upstash/Vercel rate-limit. `ANTHROPIC_API_KEY` is server-only.

---

## 7. Hours tab — calendar detail

### Week view (default)
- 5 columns Mon–Fri; Sat/Sun collapsed unless entries exist (weekend entries are still part of the submitted week)
- Top bar: `Day | Week | Month` toggle · `< Jun 23–Jun 27 >` navigation · `Today` button · total hours · `Submit week` button · `AI summary` shortcut
- On mobile: always show week range + total hours in top bar even when only 3 days are visible
- Each entry card: project colour dot · name (truncated) · hours (rendered via `formatHours`) · drag handle `⠿`
- First-run state: zero entries **and** `dismissed_welcome=false` → welcome card with 3 steps (dismiss persists)

### Entry modal
```
Note           text input
               ↓ "Polish with AI" button (disabled while streaming)
               → streams ONE sentence inline
               → Accept / Edit / Regenerate

Project        searchable dropdown
               → grouped by client
               → shows ONLY projects user is a member of
               → on selection: tag group loads automatically

Date           date picker (defaults to clicked day)

Hours          numeric input (decimal hours, stored numeric(5,2))
               + quick buttons: 15m(0.25) / 30m(0.5) / 1h(1.0) / 2h(2.0)

Tags           searchable dropdown
               → shows ONLY the selected project's tag group
               → is_required tag: shows "(required)" label
               → if required tag not selected: amber warning text (does NOT block save)
               → selected tags determine entry billability (≥1 billable tag ⇒ billable)

Three-dot "More" menu:
  Copy to another date  → date picker → POST new entry (blocked if target week submitted)
  Move to another date  → date picker → PATCH entry date (blocked if target week submitted)
  Delete                → confirmation → DELETE (blocked if submitted)
```

### Drag and drop (@dnd-kit)
- Each entry card is draggable; each day column is a droppable zone
- On drop: `PATCH /api/entries/:id` with new date
- Blocked if the entry's timesheet status is submitted (source or target week)

### Submit week
See `CLAUDE.md §10`. Implemented via the `submit_week()` RPC (atomic).

---

## 8. Project detail page `/projects/[id]`

**Header:** colour dot · name · client · external ID · date range · Active badge · back arrow
**Three stat widgets:** Total logged · This week · This month
**Donut chart (recharts):** billable vs non-billable hours, exact hours in legend. Split computed via `entry_is_billable` over the project's entries — billable + non-billable = total logged, by construction (no rounding: sums use decimal hours).
**Weekly bar chart (recharts):** last 5 weeks, horizontal bars, hours per week
**Tag usage bars:** top tags by hours logged on this project (via `unnest(tag_ids)` join to `tags`)
**Empty state** if no hours logged yet (rendered before any chart).
**No team members section** — admin-only data, not shown here.

---

## 9. People tab

- Filter: date range · person
- "Missing hours" filter (amber) — users who have **zero entries today** OR are **under `capacity_hours`** for the selected range (both conditions surfaced, labelled)
- "Overtime" filter — users **over their own `capacity_hours`** (NOT a hardcoded 40)
- Submitted status column — who has submitted this week (green tick) vs pending
- Table: Name · Weekly mini-bars · Logged · Capacity · Billable % · Submitted
- Manager sees only `is_manager_of` users; admin sees all.

---

## 10. Reports tab

### Client & Projects report
- Date range picker, client filter
- Expandable table: Client → Projects → weekly columns → Total
- Long ranges: weekly columns scroll horizontally; UI caps the default range to 12 weeks with a clear "showing N weeks" note (no silent truncation)
- Export CSV (papaparse) + PDF (jspdf + jspdf-autotable)

### Timesheets report
- **Role-aware:** Employee sees own entries, no User column. Manager/Admin sees team entries, User column visible. (Server scopes the data via RLS — the client never receives out-of-scope rows.)
- Role context banner at top of page
- Filters: date · status (Draft/Submitted, by `time_entries.status`) · project · tag
- Table: Date · [User if manager/admin] · Project · Note · Tag · Status
- Summary bar: entries · people · projects · total hours · Export button

---

## 11. AI Insights tab

**Card 1 — Weekly digest**
- Heading: "Your week at a glance"
- Button: "Generate my week" (disabled while streaming) → streams personal digest
- One paragraph per project, second person · Copy button
- Empty state: "Log some hours this week first"

**Card 2 — Timesheet health check** (deterministic, no LLM)
- Heading: "Ready to submit?"
- Button: "Check my timesheet" → JSON flags rendered as dots
- Amber dot: `no_note` or `too_brief` → shows date + project + issue
- Green dot: note has ≥5 words
- All green: "Everything looks good — ready to submit ✓"
- Empty state: "No entries this week to check"

---

## 12. Account tab

**Personal settings:** name, email (read-only from Google), avatar, weekly capacity (`capacity_hours`), **timezone** (`users.timezone`)
**Notifications:**
- Hours reminder: which days (checkboxes Mon–Fri) + what time (time picker, matched by hour in the user's timezone)
- Powered by Supabase Realtime + `pg_cron` `check_missing_hours()`
- No email — in-app only
**Notification bell (top bar):** unread count badge · dropdown last 10 · "Mark all read" · Realtime subscription filtered to `user_id`
**Workspace settings (admin only):** manage clients, projects (colour, external ID, tag group, members), tag groups, tags (incl. `is_required`/`is_billable`), users (role + **manager_id**)

---

## 13. Responsive layout

| Device | Width | Nav | Notes |
|---|---|---|---|
| Mobile | 375–767 | Bottom bar | Week view: 3 days visible, swipe for more. Always show full week range + total hours in top bar. Search on month view. |
| Tablet | 768–1023 | Sidebar | Two column |
| Desktop | ≥1024 | Left sidebar | Full layout |

---

## 14. Folder structure

```
cadence/
├── app/
│   ├── page.tsx                       → redirect to /hours
│   ├── auth/callback/route.ts         → domain re-check, sign out non-DF
│   ├── hours/page.tsx
│   ├── projects/page.tsx
│   ├── projects/[id]/page.tsx
│   ├── people/page.tsx
│   ├── reports/clients/page.tsx
│   ├── reports/timesheets/page.tsx
│   ├── ai/page.tsx
│   ├── account/page.tsx
│   └── api/
│       ├── entries/route.ts
│       ├── entries/[id]/route.ts
│       ├── timesheets/route.ts
│       ├── ai/narrative/route.ts      maxDuration=60, runtime=nodejs, stream
│       ├── ai/digest/route.ts         maxDuration=60, runtime=nodejs, stream
│       ├── ai/health/route.ts         JSON, rules-based (no LLM)
│       ├── projects/route.ts
│       ├── projects/[id]/route.ts
│       ├── projects/[id]/members/route.ts
│       ├── reports/clients/route.ts
│       ├── reports/timesheets/route.ts
│       ├── reports/people/route.ts
│       ├── admin/users/route.ts
│       ├── admin/tag-groups/route.ts
│       ├── admin/tags/route.ts
│       ├── notifications/route.ts
│       └── cron/missing-hours/route.ts  optional (Pro), CRON_SECRET
├── components/
│   ├── layout/Sidebar.tsx  MobileNav.tsx  TopBar.tsx  NotificationBell.tsx
│   ├── hours/CalendarWeek.tsx  CalendarDay.tsx  CalendarMonth.tsx
│   ├── hours/EntryCard.tsx  EntryModal.tsx  DraggableEntry.tsx  DroppableDay.tsx
│   ├── hours/SubmitWeekButton.tsx  MissingDaysModal.tsx  SubmittedBadge.tsx
│   ├── hours/WelcomeCard.tsx        (first-run state)
│   ├── projects/ProjectCard.tsx  ProjectDetail.tsx  DonutChart.tsx  TagUsageBars.tsx
│   ├── people/UtilisationChart.tsx  PersonRow.tsx
│   ├── reports/ClientReport.tsx  TimesheetReport.tsx  ExportButton.tsx
│   ├── ai/DigestStream.tsx  HealthCheck.tsx
│   └── shared/TagDropdown.tsx  WeekNav.tsx  EmptyState.tsx  LoadingSkeleton.tsx
├── lib/
│   ├── supabase/{client.ts, server.ts, realtime.ts}
│   ├── claude.ts
│   ├── seed.ts              idempotent: all 13 projects, 7 tag groups, all tags + is_billable
│   ├── reports.ts
│   ├── hours.ts             formatHours / parseHours (decimal ⇄ "Xh Ym")
│   ├── week.ts              ISO week helpers (Monday start) — single source
│   └── billable.ts          entry billability (mirrors entry_is_billable)
├── supabase/migrations/     version-controlled SQL (schema, RLS, functions, triggers, pg_cron)
├── tests/
│   ├── unit/                vitest: hours.ts, week.ts, billable.ts, health rules
│   └── e2e/                 playwright: critical path + RLS cross-user isolation
├── docs/security-reviews/
├── .env.local
├── vercel.json              (Pro only: cron config)
├── CLAUDE.md  TECH_SPEC.md  IMPLEMENTATION_PLAN.md  README.md
```

---

## 15. Security

- Google OAuth restricted to `@decisionfoundry.com` via the `handle_new_user()` trigger (real boundary) + `hd` hint + callback re-check (§3)
- `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` server-only
- No email service keys
- RLS on every table, using `SECURITY DEFINER` helpers (no recursion)
- `project_members` enforces project visibility per user
- Submitted entries cannot be edited or deleted (RLS `status='draft'` + API 403)
- Realtime subscription filtered to `user_id`; notifications RLS owner-only
- `/api/cron/missing-hours` (optional) secured by `CRON_SECRET`; `pg_cron` path is in-DB
- gitleaks runs as a pre-commit hook (Phase 0 onward), not just Phase 6
- Session expiry: 401 → redirect to login, preserve unsaved data in `sessionStorage`
- Portfolio note: Vercel Hobby = personal use only and **cannot run hourly cron** (hence pg_cron). For 600+ employees in production: Vercel Pro ($20/mo) + Supabase Pro ($25/mo) — required for no auto-pause, sufficient concurrent Realtime connections, hourly Vercel cron (if used), and DB storage at scale. Note: 600 concurrent Realtime clients may exceed even Pro's 500 — connections are pooled/lazy; monitor and upgrade the Realtime quota if needed.

---

## 16. Testing strategy

| Layer | Tool | Covers |
|---|---|---|
| Unit | Vitest | `formatHours/parseHours` (1.5⇄"1h 30m"), `week.ts` (Monday start, range), `billable.ts` (≥1 billable tag), health-check rules (no_note/too_brief) |
| Integration | Vitest + Supabase test client | submit_week atomicity, tag/group validation on entry create |
| RLS | Playwright/SQL with two seeded users | employee A cannot read B's entries; manager sees only team; submitted entries reject PATCH/DELETE; cron function idempotency |
| E2E | Playwright | critical path: log → polish AI → drag → submit → entries locked → bell updates; non-DF login rejected |

CI gate: `lint` + `build` + `vitest` must pass before a phase is "done". RLS negatives are the highest-value tests — never leave them manual-only.

---

## 17. Migrations & seed

- Schema is authored as ordered SQL files in `supabase/migrations/` and applied via the Supabase CLI (`supabase db push`). The Table Editor is for inspection, not the source of truth.
- Migration 0001: extensions (`pg_cron`), tables, indexes, `updated_at` triggers.
- Migration 0002: RLS helpers, policies, `handle_new_user` trigger, `submit_week`, `entry_is_billable`, `check_missing_hours`, `cron.schedule`.
- `lib/seed.ts` is idempotent (upsert by natural key) — safe to re-run; seeds 5 clients, 13 projects, 7 tag groups, all tags with `is_billable`/`is_required`.
- README documents: env setup, Google OAuth config (`hd` + redirect URLs), `supabase db push`, running the seed, **promoting the first admin via SQL**, and the Vercel rollback step.
