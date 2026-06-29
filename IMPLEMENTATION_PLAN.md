# Phase-wise Implementation Plan — Cadence

**Companion files:** `CLAUDE.md` (standing rules + complete tag groups), `TECH_SPEC.md` (architecture & schema).
**How to use:** one phase per focused session. Start each with `Read @CLAUDE.md, @TECH_SPEC.md, @IMPLEMENTATION_PLAN.md`. A phase is done only when its Acceptance Criteria and QA Checks pass on the **deployed Vercel preview URL**.

> **v1.2 changes:** Phase 0 now builds the RLS helpers, auth/domain trigger, `updated_at` triggers, `submit_week`/`entry_is_billable`/`check_missing_hours` functions, version-controlled migrations, gitleaks pre-commit, and seeds `is_billable`. The cron moved to `pg_cron`. Health check is rules-based. Overtime uses `capacity_hours`. Added hours/week utils, tag-group validation, `jspdf-autotable`, and a Vitest/Playwright test gate per phase.

**QA tags:**
- **[CC]** — Claude Code verifies while building
- **[YOU]** — you verify by hand on the deployed URL

---

## Phase 0 — Setup, schema, RLS, functions, seed, auth, deploy pipeline

**Objective:** running Next.js app on Vercel with Google OAuth (DF-only), all tables + RLS + DB functions, the daily-reminder cron in pg_cron, and pre-seeded DF data — all from version-controlled migrations — before any feature UI is built.

**Tasks**
1. `npx create-next-app@latest cadence --typescript --tailwind --app --eslint`
2. Install: `@supabase/supabase-js @anthropic-ai/sdk recharts @dnd-kit/core @dnd-kit/sortable jspdf jspdf-autotable papaparse date-fns date-fns-tz` · dev: `vitest @playwright/test`
3. Init Supabase CLI; author schema as ordered migrations in `supabase/migrations/` (NOT the Table Editor):
   - **0001** — `create extension pg_cron;` · all 9 tables from `TECH_SPEC.md §4` (incl. `tags.is_billable`, `users.timezone`, `users.dismissed_welcome`, `hours numeric(5,2)`) · indexes · `set_updated_at` triggers on `users` + `time_entries`
   - **0002** — RLS helpers (`current_user_role`, `is_admin`, `is_manager_of`), `handle_new_user` trigger (domain check + profile insert), `entry_is_billable`, `submit_week`, `check_missing_hours`, `cron.schedule('missing-hours-hourly','0 * * * *', ...)`, and **all RLS policies for the three roles** (using the helpers — never a self-subquery on `users`)
4. Enable RLS on every table; enable Supabase Realtime on `notifications`
5. Configure Supabase Google OAuth: set `hd=decisionfoundry.com`, redirect URLs; build `app/auth/callback/route.ts` to re-check domain and sign out non-DF
6. Build `lib/seed.ts` (idempotent upsert) — seed from `CLAUDE.md §16`: 5 clients · 13 projects (exact colours, external IDs, tag-group assignment) · 7 tag groups · all tags with `is_required` + `is_billable` (groups 1–2: false if `NB_` prefix; groups 3–7: all false). Only `All Hands` is `is_required`.
7. Run `supabase db push` + seed → verify in Table Editor: 13 projects, 7 tag groups, all tags, correct `is_billable` counts
8. Build `lib/hours.ts` (formatHours/parseHours) and `lib/week.ts` (ISO Monday-start helpers) + Vitest unit tests for both
9. Add env vars to `.env.local` and Vercel: `ANTHROPIC_API_KEY` · `SUPABASE_SERVICE_ROLE_KEY` · `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` · `GOOGLE_CLIENT_ID` · `GOOGLE_CLIENT_SECRET` · `CRON_SECRET`
10. Add gitleaks pre-commit hook (husky) — runs on every commit from now on
11. Connect repo to Vercel; confirm push → preview deploy
12. Build app shell: `Sidebar.tsx` · `MobileNav.tsx` · `TopBar.tsx` · `NotificationBell.tsx` — six tabs, navigation only, no content yet
13. Add `/api/health` to confirm Supabase connection and Google auth working
14. **Promote the first admin** via SQL (documented), so an admin exists to manage the workspace

**Acceptance criteria**
- `npm run dev` starts on `localhost:3000`
- Google OAuth login works with `@decisionfoundry.com`; **non-DF email is rejected by the `handle_new_user` trigger** (login fails, no profile created)
- A `public.users` row is auto-created on first login with `role='employee'`
- All 13 projects, 7 tag groups, tags (with correct `is_billable`) present in Table Editor
- `pg_cron` job `missing-hours-hourly` is scheduled (visible in `cron.job`)
- Push to main → Vercel preview URL builds green

**QA checks**
- **[YOU]** Google OAuth with DF account → lands on shell with six tabs ✅
- **[YOU]** Google login with non-DF email → rejected, no row created ✅
- **[YOU]** Sidebar navigation routes to each tab ✅
- **[CC]** RLS positive: user reads their own rows
- **[CC]** RLS negative: a second account cannot read the first user's `time_entries`
- **[CC]** No `users`-policy recursion error on any query (helpers used)
- **[CC]** Vitest: `hours.ts` (1.5⇄"1h 30m") and `week.ts` (Monday start) pass
- **[YOU]** Secrets: DevTools → Sources → search `sk-ant` → absent ✅; gitleaks pre-commit blocks a planted secret
- **[CC]** `npm run lint`, `npm run build`, `npm run test` clean

**Definition of done:** migrations applied; seed (with is_billable) confirmed; OAuth DF-only working; pg_cron scheduled; first admin promoted.

---

## Phase 1 — Hours tab: calendar + time entry CRUD + drag and drop

**Objective:** the core feature — log, view, edit, copy, move, and drag entries in a Timely-style calendar.

**Tasks**
1. Build `CalendarWeek.tsx` — 5 columns Mon–Fri (Sat/Sun shown only if entries exist), day headers showing date + total hours (via `formatHours`), entry cards per day, "+ New" per day. Top bar: Day/Week/Month toggle · `< week range >` · Today · total week hours. All week math via `lib/week.ts`.
2. Build `CalendarDay.tsx` and `CalendarMonth.tsx`. Month view includes a search bar filtering by project name or note text.
3. Build `EntryCard.tsx` — project colour dot, truncated name, hours, drag handle `⠿`.
4. Build `EntryModal.tsx` per `TECH_SPEC.md §7`:
   - Project dropdown shows ONLY projects with a `project_members` row for the current user
   - On project selection, tag group loads; tags dropdown updates
   - Hours: decimal input + quick buttons (0.25/0.5/1/2) via `parseHours`
   - Required tag (All Hands) → amber warning if unselected — does NOT block save
   - "Polish with AI" placeholder wiring (full stream in Phase 2)
   - Three-dot "More": Copy to date · Move to date · Delete
5. Build `DraggableEntry.tsx` + `DroppableDay.tsx` (@dnd-kit). On drop → `PATCH /api/entries/:id` date.
6. Build `WelcomeCard.tsx` — shown if zero entries AND `dismissed_welcome=false`; dismissing PATCHes the user row.
7. Build `/api/entries` routes (GET, POST, PATCH, DELETE). POST/PATCH **validate** that the project is in the user's `project_members` AND every `tag_id` belongs to the project's `tag_group_id`. PATCH/DELETE return 403 if entry is submitted.
8. All entry/calendar components `'use client'`.
9. Every component: loading skeleton · empty state · error toast.

**Acceptance criteria**
- Log an entry with project, hours, tags, notes
- Project dropdown shows only assigned projects (not all 13)
- Tags dropdown shows only that project's tag group; invalid tag/project combo rejected by API
- Required tag shows amber warning, does not block save
- Week navigation moves correctly (Monday start)
- Drag entry to another day → persists after reload
- Copy → two entries on different days; Move → entry on new day only
- Welcome card shown for new user; dismissal persists across reload

**QA checks**
- **[YOU]** Entry on `NB_Organizational Activity` without All Hands → amber warning, saves ✅
- **[YOU]** Entry on `Dr. Reddy's Canada` → MCI COE tags only ✅
- **[YOU]** Drag Mon→Thu → correct after reload ✅
- **[YOU]** Copy → two identical entries on different days ✅
- **[YOU]** Week `<` `>` navigate; Today returns to current week ✅
- **[YOU]** Month search "Reddy" → only Dr. Reddy's entries ✅
- **[CC]** Project dropdown query joins through `project_members`
- **[CC]** Hour totals: 1.5 + 0.75 = 2.25 ("2h 15m") — Vitest on `hours.ts`
- **[CC]** API rejects a tag_id not in the project's tag_group (400)
- **[CC]** RLS: cannot read another user's entries
- **[YOU]** Responsive: week at 375px shows 3 days, range + total in top bar ✅
- **[YOU]** Welcome card: shown first login; dismissed and not shown again after reload ✅

**Definition of done:** full entry lifecycle on deployed URL; project visibility + tag/group validation enforced.

---

## Phase 2 — AI narrative + timesheet submission

**Objective:** the AI feature that beats Timely, plus the submission flow.

**Tasks**
1. Build `POST /api/ai/narrative` — streams ONE sentence. `maxDuration=60`, `runtime='nodejs'`, `max_tokens≈100`, system prompt from `TECH_SPEC.md §6`. On failure → `{ error: { code:'ai_unavailable', message:'AI unavailable, try again later.' } }` — never crash the modal. Button disabled while streaming.
2. Wire "Polish with AI" into `EntryModal.tsx` — stream inline, Accept / Edit / Regenerate. `ai_description` saved on Accept.
3. Build `SubmitWeekButton.tsx`:
   - Check if any Mon–Fri day has zero entries (via `lib/week.ts`)
   - If missing: `MissingDaysModal.tsx` — "You haven't logged hours for [days]. Submit anyway?" [Go back] [Submit anyway]
   - On confirm: `POST /api/timesheets` → calls `submit_week()` RPC (atomic: entries+timesheet→submitted, creates `timesheet_submitted` notification)
4. Build `SubmittedBadge.tsx` — replaces Submit button once submitted; "Submitted ✓ [date]"
5. All entries read-only after submission (modal read-only; drag blocked; delete blocked) — enforced in UI + RLS + API 403
6. Build `POST /api/timesheets` route (calls the RPC)
7. Wire Supabase Realtime on `notifications` (filtered `user_id=eq.<uid>`) — bell updates live when the submission notification is created

**Acceptance criteria**
- AI polish streams one crisp sentence (never a paragraph)
- AI failure → friendly error, modal stays open
- Submit checks missing days, shows confirmation
- After submission: entries read-only, badge replaces button, submission is atomic
- Bell updates in real time after submission (no refresh)

**QA checks**
- **[YOU]** Narrative streams token by token ✅
- **[CC]** Narrative is one sentence (system prompt + max_tokens cap)
- **[CC]** `maxDuration=60` and `runtime='nodejs'` set on `/api/ai/narrative`
- **[YOU]** Submit with missing days → modal shows correct day names ✅
- **[YOU]** Submit anyway → entries locked, badge shows ✅
- **[YOU]** Edit/drag a submitted entry → blocked (read-only) ✅
- **[CC]** Submitted entries: PATCH and DELETE return 403; RLS rejects update
- **[CC]** `submit_week` is atomic (Vitest/integration: entries + timesheet flip together)
- **[YOU]** Bell badge increments in real time after submission (no reload) ✅

**Definition of done:** log → polish AI → submit week (missing-days check, atomic) → entries locked → bell updates live.

---

## Phase 3 — Projects tab

**Objective:** project dashboard and individual project detail pages.

**Tasks**
1. Build `ProjectCard.tsx` — colour dot, name, client, external ID, active badge, three-dot (edit/archive — admin only).
2. Build `/projects/page.tsx` — Dashboard (recent) + All Projects (search + filters: Active / tag / client). Shows projects the user is a member of (admin sees all).
3. Build `/projects/[id]/page.tsx`:
   - Header: back arrow, colour dot, name, client, external ID, date range, Active badge
   - Stat widgets: Total logged · This week · This month
   - Donut (recharts): billable vs non-billable via `entry_is_billable` (exact hours in legend)
   - Weekly bar chart: last 5 weeks
   - Tag usage bars: top tags by hours (`unnest(tag_ids)` join `tags`)
   - Empty state if no hours logged
4. Build admin project create/edit modal: name, client, colour picker, external ID, description, tag group, member assignment, budget hours.
5. Build `POST /api/projects` · `PATCH /api/projects/:id` (admin) · `POST/DELETE /api/projects/:id/members`.

**Acceptance criteria**
- All 13 projects appear for admin; assigned projects for employees
- Project detail shows correct data
- Donut: billable/non-billable split correct (sums to total, no rounding)
- Admin creates project, assigns tag group + members → immediately available in entry modal for those members
- Archiving removes from entry modal dropdown; historical entries preserved + still in reports

**QA checks**
- **[YOU]** `Dr. Reddy's Canada` → external ID `US-SFM-MCI-DRR-1291` ✅
- **[CC]** Donut: billable + non-billable = total logged (decimal sums, no rounding)
- **[CC]** Billable split matches `entry_is_billable` (Vitest on `billable.ts`)
- **[CC]** Only admin can POST/PATCH projects → 403 otherwise
- **[YOU]** Admin creates test project + member → member sees it in entry modal ✅
- **[YOU]** Empty state when project has no hours ✅
- **[YOU]** Responsive: cards stack at 375px ✅

**Definition of done:** 13 projects navigable with working detail pages; admin project + member management complete.

---

## Phase 4 — People tab + Reports tab + exports

**Objective:** utilisation dashboard and both report types with role-aware data.

**Tasks**
1. Build `UtilisationChart.tsx` — stacked bar, logged vs `capacity_hours` per week. Tooltip: Capacity · Logged · Billable % · Non-Billable % · Free capacity.
2. Build `PersonRow.tsx` — name, role, weekly mini-bars, logged, capacity, billable %, submitted status.
3. Build `/people/page.tsx` — "Missing hours" filter (zero today OR under capacity) · "Overtime" filter (**over own `capacity_hours`**, not hardcoded 40) · date range. Manager sees `is_manager_of`; admin all.
4. Build `/reports/clients/page.tsx` — date range, client filter, expandable table (client→projects→weekly columns→total, default range capped at 12 weeks with a note), Export CSV + PDF.
5. Build `/reports/timesheets/page.tsx`:
   - Role context banner; Employee = no User column (server-scoped); Manager/Admin = User column + team
   - Filters: date · status (Draft/Submitted) · project · tag
   - Table: Date · [User] · Project · Note · Tag · Status
   - Summary bar: entries · people · projects · total hours · Export
6. Build `ExportButton.tsx` — CSV via papaparse, PDF via jspdf + **jspdf-autotable**. Export pulls server-scoped data (no client-side privilege leak).

**Acceptance criteria**
- People tab shows correct weekly utilisation bars
- "Missing hours" highlights users with no entries today / under capacity
- Submitted column ticks submitted users this week
- Employee sees own entries only, no User column; Manager sees team + User column
- CSV and PDF export download correctly (PDF tables via autotable)

**QA checks**
- **[YOU]** Hover utilisation bar → correct breakdown ✅
- **[CC]** Utilisation: logged ÷ `capacity_hours` × 100% per user
- **[CC]** Overtime filter uses each user's `capacity_hours`, not 40
- **[CC]** Manager sees only `is_manager_of` users (RLS)
- **[YOU]** Employee → Reports → no User column ✅; Manager → User column ✅
- **[YOU]** PDF export opens cleanly (autotable table); readable on mobile ✅
- **[YOU]** Reports table scrolls horizontally at 375px ✅
- **[YOU]** Empty states when no data matches filters ✅

**Definition of done:** all reports work; role scoping confirmed server-side; exports download.

---

## Phase 5 — AI Insights tab + Account tab + reminder cron

**Objective:** dedicated AI section, account management, and the daily hours reminder.

**Tasks**
1. Build `/ai/page.tsx` with two cards per `TECH_SPEC.md §11`.
2. Build `POST /api/ai/digest` — loads week's entries grouped by project, streams personal digest. `maxDuration=60`, `runtime='nodejs'`, `max_tokens≈1024`. Button disabled while streaming.
3. Build `POST /api/ai/health` — **rules-based, NO LLM**: returns JSON flags for entries with no note (`no_note`) or note under 5 words (`too_brief`).
4. Build `DigestStream.tsx` — streaming output + Copy. Empty: "Log some hours this week first."
5. Build `HealthCheck.tsx` — amber/green per entry. All-green: "Everything looks good — ready to submit ✓". Empty: "No entries this week to check."
6. Build `/account/page.tsx` — personal settings (incl. **timezone**, capacity), notification prefs (days + time), notification history.
7. **Daily reminder runs in `pg_cron`** (built in Phase 0): verify `check_missing_hours()` honours timezone, matches by hour, skips users with entries, and is idempotent (no duplicate per day). `/api/cron/missing-hours` exists only as the optional Pro/Vercel path (CRON_SECRET-guarded).
8. Workspace settings (admin): manage clients, projects, tag groups, tags (incl. is_billable/is_required), users (role + **manager_id** assignment).

**Acceptance criteria**
- Digest generates personal paragraphs (second person, not client language)
- Health check correctly flags no-note / brief notes; all-green when detailed
- Reminder: configure Mon–Fri 17:00 in user's tz → at that local hour, if no entries → bell shows new notification (and only once that day)
- Admin creates a tag group, adds tags, assigns to a project → employee sees new tags
- Bell updates in real time for all notification types

**QA checks**
- **[YOU]** Digest tone personal/reflective — no client-email language ✅
- **[YOU]** Entry with no note → health flags it; add 5+ word note → flag clears ✅
- **[CC]** Health check is deterministic (Vitest on the rules) — same input, same flags
- **[YOU]** All entries detailed → all-green state ✅
- **[YOU]** Admin adds tag group + assigns to test project → employee sees new tags ✅
- **[CC]** `check_missing_hours()` idempotency: second run same hour creates no duplicate
- **[CC]** `check_missing_hours()` respects timezone + skips users who logged today
- **[CC]** `/api/cron/missing-hours` returns 403 if `CRON_SECRET` wrong
- **[YOU]** Responsive: AI + account tabs usable at 375px ✅
- **[YOU]** Empty states on both AI cards ✅

**Definition of done:** AI Insights tab functional; admin manages workspace; pg_cron fires timezone-correct, idempotent reminders in real time.

---

## Phase 6 — Security pass + final QA + go-live

**Objective:** verified, documented, tagged v1.0.0.

**Tasks**
1. `gitleaks detect --source . --verbose` → zero findings (pre-commit hook already active since P0)
2. Full security checklist:
   - No `ANTHROPIC_API_KEY` / service role key in client bundle
   - OAuth rejects non-`@decisionfoundry.com` (trigger-level)
   - Employee cannot read another employee's entries (RLS cross-user)
   - Submitted entries cannot be edited/deleted
   - `/api/cron/missing-hours` 403 without correct `CRON_SECRET`
   - Admin-only routes 403 for employee/manager
   - No `users`-policy recursion under load
3. Run full test suite: `vitest` + Playwright E2E + RLS isolation — all green
4. Save review to `docs/security-reviews/security-review-[date].md`
5. Write `README.md`: setup, env vars, Google OAuth (`hd` + redirects), `supabase db push` + seed, **first-admin promotion SQL**, pg_cron note, portfolio/production distinction, Vercel rollback step
6. Full E2E pass on production URL across all six tabs
7. Tag `v1.0.0` and push

**Acceptance criteria**
- gitleaks clean; test suite green
- All six tabs work on production URL
- Security checklist passes
- README complete

**QA checks (all on production URL)**
- **[YOU]** No API key in production bundle (DevTools) ✅
- **[CC]** RLS cross-user: employee A cannot read employee B's entries (Playwright)
- **[YOU]** Non-DF Google account rejected at login ✅
- **[YOU]** Hours: log → polish AI (one sentence) → drag → submit week → entries locked ✅
- **[YOU]** Projects: Dr. Reddy's Canada → detail with donut ✅
- **[YOU]** People: utilisation + missing-hours filter ✅
- **[YOU]** Reports: employee no user column; manager user column ✅
- **[YOU]** AI: digest personal; health flags thin notes ✅
- **[YOU]** Account: admin adds project + tag group; employee sees it ✅
- **[YOU]** Notifications: bell updates in real time ✅
- **[YOU]** All six tabs responsive at 375px on a real phone ✅
- **[YOU]** Rollback: previous deployment promotable in Vercel ✅

**Definition of done:** v1.0.0 tagged; security review committed; README complete; all QA + tests green.

---

## Summary — definition of done every phase

Scaffolded files ≤300 lines · lint + build + **vitest** clean · no secret in client bundle (gitleaks pre-commit) · RLS verified (positive + cross-user negative) · empty + loading + error states on every component · feature works on Vercel preview/production at 375/768/1280 · conventional commit per task · migrations version-controlled.

---

## Risk register

| Risk | Mitigation | Phase |
|---|---|---|
| API key exposed in client bundle | Server-only secrets, never NEXT_PUBLIC_ for secrets; gitleaks pre-commit | P0, P6 |
| Employee sees all 13 projects | project_members RLS + query join | P0, P1 |
| Employee reads another's data | RLS per role on every table (SECURITY DEFINER helpers) | P0, P6 |
| **RLS infinite recursion on users** | SECURITY DEFINER helper functions / JWT claims, never self-subquery | P0 |
| Google OAuth open to non-DF | `handle_new_user` trigger raises on non-DF email + callback re-check | P0, P6 |
| **No profile row after login** | `handle_new_user` trigger inserts `public.users` row | P0 |
| **No first admin exists** | Manual SQL promotion of first admin, documented in README | P0 |
| **No billable data source** | `tags.is_billable` + `entry_is_billable` helper; seeded per §16 | P0, P3 |
| **Hourly cron impossible on Hobby** | Supabase `pg_cron` (in-DB); Vercel cron only on Pro | P0, P5 |
| Reminder fires wrong time/duplicates | timezone-aware, hour-match, idempotent NOT EXISTS check | P5 |
| AI narrative too long | System prompt + `max_tokens≈100` + verified in QA | P2 |
| AI route timeout / Edge incompat | `maxDuration=60` + `runtime='nodejs'` + streaming | P2, P5 |
| AI cost/abuse at 600 users | Button disabled while streaming + soft per-user cap | P2, P5 |
| Tags show wrong group / invalid combo | Project→tag_group join; API validates tag∈group | P1 |
| Required tag blocks submission | Visual reminder only, never a hard block | P1 |
| Drag and drop fails on mobile | @dnd-kit touch support, tested at 375px | P1 |
| Submitted entries edited | status check in RLS + PATCH/DELETE 403; atomic submit_week | P2 |
| Half-submitted week | `submit_week` RPC in one transaction | P2 |
| Cron endpoint called by anyone | CRON_SECRET on optional HTTP route; pg_cron is in-DB | P0, P6 |
| Realtime bell leaks others' events | Subscribe filtered to user_id + owner-only RLS | P0, P2 |
| Empty recharts with zero data | Empty state before chart renders | P3, P4 |
| Session expiry mid-workflow | 401 → redirect, preserve data in sessionStorage | P2+ |
| Hours rounding errors | decimal numeric(5,2) + single formatHours util; sums on decimals | P0, P1 |
| Week off-by-one / locale | single `lib/week.ts`, ISO Monday start, client+server | P0, P1 |
| Overtime wrong (hardcoded 40) | compare to per-user `capacity_hours` | P4 |
| Schema drift / unreproducible DB | version-controlled migrations + idempotent seed | P0 |
| Untested regressions | Vitest + Playwright + RLS tests gate each phase | all |

---

## Coverage matrix

| Feature | P0 | P1 | P2 | P3 | P4 | P5 | P6 |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Google OAuth + roles + domain trigger | ✅ | | | | | | ✅ |
| Profile-creation + first-admin bootstrap | ✅ | | | | | | |
| RLS all tables (+ helper fns, no recursion) | ✅ | | | | | | ✅ |
| project_members table + visibility | ✅ | ✅ | | | | | ✅ |
| Seed: 13 projects, 7 tag groups, tags + is_billable | ✅ | | | | | | ✅ |
| Migrations + idempotent seed | ✅ | | | | | | |
| DB functions (submit_week, entry_is_billable, check_missing_hours) | ✅ | | ✅ | ✅ | | ✅ | |
| Supabase Realtime on notifications (filtered) | ✅ | | ✅ | | | ✅ | ✅ |
| pg_cron reminder scheduled | ✅ | | | | | ✅ | |
| Hours/week utils + tests | ✅ | ✅ | | | | | |
| gitleaks pre-commit | ✅ | | | | | | ✅ |
| Hours calendar (day/week/month) | | ✅ | | | | | ✅ |
| Time entry CRUD + tag/group validation | | ✅ | | | | | ✅ |
| Per-project colour coding | | ✅ | | | | | ✅ |
| Tag dropdown (project-specific) | | ✅ | | | | | ✅ |
| Required tag visual reminder | | ✅ | | | | | ✅ |
| Week navigation + Today | | ✅ | | | | | ✅ |
| Copy / Move (blocked if submitted) | | ✅ | | | | | ✅ |
| Drag and drop entries | | ✅ | | | | | ✅ |
| Month view search | | ✅ | | | | | ✅ |
| First-run welcome card (persisted dismiss) | | ✅ | | | | | ✅ |
| Empty + loading + error states (all) | | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Session expiry handling | | ✅ | | | | | ✅ |
| AI narrative (one sentence, max_tokens, nodejs) | | | ✅ | | | | ✅ |
| AI failure graceful handling | | | ✅ | | | | ✅ |
| AI rate/abuse guard | | | ✅ | | | ✅ | |
| Timesheet submission (atomic, no approval) | | | ✅ | | | | ✅ |
| Missing days confirmation modal | | | ✅ | | | | ✅ |
| Submitted entries read-only | | | ✅ | | | | ✅ |
| Submitted badge in week header | | | ✅ | | | | ✅ |
| Bell real-time update (filtered) | | | ✅ | | | ✅ | ✅ |
| Projects dashboard | | | | ✅ | | | ✅ |
| Project detail (donut via is_billable + tag bars) | | | | ✅ | | | ✅ |
| Admin project + member management | | | | ✅ | | ✅ | ✅ |
| People utilisation (capacity-based) | | | | | ✅ | | ✅ |
| Overtime by per-user capacity | | | | | ✅ | | |
| Submitted status column (People) | | | | | ✅ | | ✅ |
| Client & Projects report | | | | | ✅ | | ✅ |
| Timesheets report (role-aware, server-scoped) | | | | | ✅ | | ✅ |
| CSV + PDF (jspdf-autotable) export | | | | | ✅ | | ✅ |
| AI weekly digest (personal) | | | | | | ✅ | ✅ |
| AI health check (rules-based, deterministic) | | | | | | ✅ | ✅ |
| Reminder (pg_cron, tz-aware, idempotent) | | | | | | ✅ | ✅ |
| Workspace admin (full, incl. manager_id) | | | | | | ✅ | ✅ |
| Responsive 375/768/1280 all tabs | | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Security pass + gitleaks + README + tests | | | | | | | ✅ |
| Vitest + Playwright + RLS test gate | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
