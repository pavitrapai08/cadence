# CLAUDE.md — Cadence (AI Timesheet Assistant)

> **Purpose.** Always-on context for every Claude Code session on this repo. It carries standing rules and constraints — not step-by-step workflows. The build plan lives in `IMPLEMENTATION_PLAN.md`; the architecture lives in `TECH_SPEC.md`. Start every session with: `Read @CLAUDE.md, @TECH_SPEC.md, @IMPLEMENTATION_PLAN.md`.

---

## 0. Revision notes (v1.2 — gap-fix pass before implementation)

This revision closes gaps found in the v1.1 review that would have blocked Phase 0 or failed silently in production. **These decisions are now binding.** Key changes:

1. **Billability has a real data source** — `tags.is_billable` (boolean). An entry is billable iff it has ≥1 billable tag. See §6.
2. **Daily reminder cron runs in Supabase `pg_cron`** (free tier, reliable) — NOT Vercel cron, which can only run once/day on Hobby. Vercel cron is the production-on-Pro alternative only. See §11.
3. **RLS uses `SECURITY DEFINER` helper functions** (`is_admin()`, `is_manager_of()`, `current_user_role()`) to avoid the infinite-recursion footgun on the `users` table. See §15 and `TECH_SPEC.md §4a`.
4. **Domain restriction + profile creation is a server-side DB trigger**, not a config toggle. See §3.
5. **Health check is deterministic (pure rules), not a Claude call.** See §8.
6. **Hours format, week-start, and timezone are pinned conventions.** See §6.
7. Added: `tags.is_billable`, `users.timezone`, `users.dismissed_welcome`; `updated_at` triggers; `jspdf-autotable`; automated tests; version-controlled migrations; gitleaks pre-commit; Realtime per-user filter; AI rate-limit guard.

---

## 1. Project identity

**Cadence** — Track the rhythm of your work.

Cadence is DecisionFoundry's internal AI-powered timesheet and time-tracking platform — a direct replacement for Timely. Employees log hours against projects (billable / non-billable), submit weekly timesheets, and use AI to polish their notes and understand their week. Admins manage the entire workspace. Built for 600+ DecisionFoundry employees.

- **Build type:** Portfolio project, scoped for internal DF adoption.
- **Audience:** DecisionFoundry employees, managers, and admins.
- **AI advantage over Timely:** Cadence turns rough notes into professional one-sentence descriptions and generates a personal weekly digest. Timely has no equivalent.
- **Reference product:** Timely (app.timelyapp.com) — replicate its core UX, then go further with AI.

---

## 2. Stack (locked)

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router), TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Hosting | Vercel (Hobby for portfolio; Pro for production) |
| Database / Auth | Supabase (Postgres + Google OAuth + Realtime) |
| Scheduled jobs | **Supabase `pg_cron`** (portfolio); Vercel Cron only on Pro |
| AI | Claude API · `@anthropic-ai/sdk` · model `claude-sonnet-4-6` |
| Charts | recharts |
| Drag and drop | @dnd-kit/core + @dnd-kit/sortable |
| Export | jspdf + **jspdf-autotable** (PDF tables) + papaparse (CSV) |
| In-app notifications | Supabase Realtime (no external email service) |
| Tests | Vitest (unit/logic) + Playwright (E2E + RLS isolation) |
| Dates | date-fns (single source; ISO week, Monday start) |

**No Docker. No AWS. No Terraform. No Resend. No email service of any kind.**
Deployment is a git push to Vercel.

---

## 3. Authentication — Google OAuth only (portfolio)

> **Production note:** When Cadence is adopted by DF, swap Google OAuth for Microsoft SSO (Azure AD) using the same Supabase provider swap — one configuration change, no code changes.

Google Workspace (`@decisionfoundry.com`) accounts only. No email/password. No anonymous sessions.

**Domain restriction is enforced in THREE layers (not a single config toggle):**
1. **Google provider `hd=decisionfoundry.com`** hint — UX only, NOT a security boundary.
2. **DB trigger `handle_new_user()`** on `auth.users` insert — raises and aborts if `email NOT ILIKE '%@decisionfoundry.com'`. This is the real boundary. The same trigger creates the `public.users` profile row with `role = 'employee'`. See `TECH_SPEC.md §4a`.
3. **OAuth callback route** re-checks the email domain and signs out + redirects any non-DF session as defence-in-depth.

**Profile row creation:** the `public.users` row is created by the `handle_new_user()` trigger — never assume Supabase creates it. Without this trigger, login succeeds but the app has no profile/role and 500s.

**First admin (bootstrap):** every user starts as `employee`. The first admin is promoted manually once, via SQL (documented in README):
`update public.users set role='admin' where email='<first-admin>@decisionfoundry.com';`
After that, admins promote others via Workspace settings.

**Manager assignment:** `users.manager_id` is set by an admin in Workspace → Users (assign-manager dropdown). The People tab and manager RLS depend on it being populated.

**First-run state:** if the logged-in user has zero time entries **and** `dismissed_welcome = false`, show a welcome card on the Hours tab with three steps: "1. Select a project → 2. Add what you worked on → 3. Log your hours." Dismissing it sets `dismissed_welcome = true` (persists). One card, no wizard.

---

## 4. Three roles — strict access control

| Role | Can see | Can do |
|---|---|---|
| Employee | Own entries and timesheets only | Log, edit, drag, copy, move entries; submit timesheets; view own reports |
| Manager | Own entries + assigned team members' | Everything employee can + view team utilisation + view team timesheets in Reports |
| Admin | Everything | Everything manager can + manage projects, clients, tag groups, users, roles |

**No approval workflow.** Timesheets go `draft → submitted` — that is the end of the lifecycle. There is no approve/reject step. Submitted = final. Managers and admins can see submitted timesheets in Reports but take no action on them. Manager timesheets follow the same flow: submit = done, no self-approval needed.

RLS on every table. Employees can never read another employee's entries. **Role/manager checks in RLS use `SECURITY DEFINER` helper functions** (§15) — never a direct subquery on `users` from a `users` policy (causes infinite recursion).

---

## 5. Platform constraints (Vercel)

1. **Function timeout.** `export const maxDuration = 60` on every route calling Claude.
2. **Node runtime.** `export const runtime = 'nodejs'` on every Claude route — `@anthropic-ai/sdk` requires Node, not Edge.
3. **Streaming.** AI routes use `text/event-stream`. Streamed responses exempt from body size limit.
4. **No file uploads.** JSON only — 4.5 MB body limit is not a concern.
5. **Cron.** Hobby cron runs at most once/day — insufficient for the hourly hours-reminder. Use Supabase `pg_cron` (§11). `/api/cron/missing-hours` exists for the Pro/Vercel-cron path only.

---

## 6. DecisionFoundry conventions (from real Timely data)

**Billable vs non-billable — THE rule.** There is no `is_billable` on projects or clients. Billability lives on the **tag**: `tags.is_billable boolean not null default true`.
- An **entry** is **billable** iff it has **≥1 billable tag selected**; otherwise (all non-billable tags, or no tags) it is **non-billable**.
- The full `hours` of an entry go to its single category — we never split one entry's hours across billable/non-billable.
- Seed rule: in tag groups 1 & 2, tags whose name starts with `NB_` → `is_billable = false`, all others `true`. In tag groups 3–7 (all under non-billable projects) → **every tag `is_billable = false`**.
- This is the sole source for the project donut chart, People "Billable %", and the utilisation tooltip.

**Hours format.** Stored as `numeric(5,2)` decimal hours (e.g. `1.50` = 1h 30m). Quick buttons: 15m=`0.25`, 30m=`0.5`, 1h=`1.0`, 2h=`2.0`. Free numeric entry allowed. A single `formatHours(decimal)` util renders `"Xh Ym"`; a single `parseHours()` util is the inverse. All sums use the decimal value — never the formatted string — so `1.5 + 0.75 = 2.25` ("2h 15m") with no rounding drift.

**Week boundaries.** ISO week, **Monday start**, computed with date-fns (`weekStartsOn: 1`) on both client and server. `timesheets.week_start_date` is always the Monday of that week. A submitted week covers **Mon–Sun** (weekend entries included). The missing-days warning checks **Mon–Fri only**.

**Timezone.** `users.timezone` (IANA, e.g. `Asia/Kolkata`, default `Asia/Kolkata`) drives the daily reminder and "today" calculations for the cron. Set in Account.

**Project colours:** per-project, set by admin. Not auto-derived from billable/non-billable.
```
Dr. Reddy's Canada    → #1B6B3A  (dark green)
Dr. Reddy's Australia → salmon/pink
Dr. Reddy's DACH      → teal
Dr. Reddy's N.Europe  → light teal
Dr. Reddy's UK        → purple
Intrigue Media        → blue
NB_AI Internal        → yellow
NB_Certifications     → dark green
NB_Learning & Dev     → light purple
NB_Org Activity       → dark red/maroon
NB_Presales BIA       → green
SiteOne               → yellow
Chicago Dental        → salmon/pink
```

**Tag groups are per project.** When a user selects a project in the entry modal, they see ONLY that project's tag group. Tags are not global. Full list in §16.

**Required tags:** `is_required = true` tags (only `All Hands` on NB_Organizational Activity) show a visual amber warning if not selected. This is a reminder — it does NOT block saving or submitting.

**Project visibility:** employees see ONLY projects they are assigned to in the entry modal dropdown. This is enforced via the `project_members` table (see `TECH_SPEC.md §4`).

**External IDs:** each project has an External ID (e.g. `US-SFM-MCI-DRR-1291`) shown in reports and exports.

**Capacity:** 40h/week per employee (configurable per user by admin via `capacity_hours`).

---

## 7. The six tabs

```
1. Hours    → time entry calendar (day / week / month views)
2. Projects → project dashboard + individual project detail pages
3. People   → team utilisation (manager/admin only)
4. Reports  → client & projects report + timesheets report
5. AI       → weekly digest + timesheet health check
6. Account  → profile, notifications, workspace settings (admin)
```

Mobile: bottom navigation bar with the same six tabs. AI tab styled in green.

---

## 8. AI features

**AI Narrative Generator (inside entry modal):**
- User writes rough notes → clicks "Polish with AI"
- Claude returns **ONE sentence** — short, crisp, professional
- Streams token by token. User can Accept, Edit, or Regenerate.
- `max_tokens` capped low (≈100) so it can never run long.
- If Claude fails → show "AI unavailable, try again" — do NOT crash the modal
- System prompt: *"You are a professional timesheet assistant for DecisionFoundry, a data analytics consulting firm. Turn rough notes into ONE concise, professional timesheet sentence. Be specific and factual. No preamble. Maximum one sentence."*

**AI Insights tab — two cards:**

**Card 1 — Weekly digest (personal reflection)** — *Claude, streaming*
- Personal: "Here's what you did this week" — NOT a client email
- One paragraph per project, second person ("You worked on...")
- Copy button for personal use
- Empty state: "Log some hours this week first"

**Card 2 — Timesheet health check** — *deterministic, NO Claude call*
- Pure rule, runs instantly, fully reproducible:
  - `no_note` → note is null/empty/whitespace
  - `too_brief` → `note.trim().split(/\s+/).length < 5`
- Amber flag for either; green when the note has ≥5 words
- Empty state: "No entries this week to check"
- All-green state: "Everything looks good — ready to submit ✓"
- Designed to be used before clicking "Submit week"
- Using an LLM here was rejected: word-count is exact and free; an LLM would be slow, costly, and non-deterministic (would flap the QA check).

**AI guardrails:** `maxDuration = 60` and `runtime = 'nodejs'` on `/api/ai/narrative` and `/api/ai/digest`. The "Polish with AI" / "Generate my week" buttons are disabled while a stream is in flight (prevents spam), plus a soft per-user cap (see `TECH_SPEC.md §6`).

---

## 9. Time entry operations

| Operation | How triggered |
|---|---|
| Create | Click "+ New" on a day column, or click empty space |
| Edit | Click an entry card |
| Copy to another date | Three-dot "More" menu in entry modal |
| Move to another date | Three-dot "More" menu in entry modal |
| Drag and drop | Drag card to another day column (@dnd-kit) |
| Delete | Three-dot "More" menu (only if week not submitted) |

Copy/Move into a date whose week is already **submitted** is blocked (target week is read-only) — surface a toast, do not silently fail.

---

## 10. Timesheet submission flow

**Submit button location:** week view header, next to total hours.

**On click — missing days check:**
If any Mon–Fri day has zero hours logged, show a confirmation modal:
*"You haven't logged hours for [day names]. Submit anyway?"*
[Go back] [Submit anyway]
This is a warning only — not a hard block.

**On confirm:**
- All entries for the week (Mon–Sun) → `status = 'submitted'`
- Timesheet row → `status = 'submitted'`, `submitted_at = now()`
- Week view shows "Submitted ✓" badge in header
- All entries become read-only (cannot edit, delete, or drag)
- Submit button disappears / is replaced by the submitted badge
- An in-app notification is created for the user confirming submission
- Done atomically in one DB transaction (a Postgres RPC) so entries and the timesheet never end up half-submitted.

**After submission:**
- Visible in Reports → Timesheets report as status "Submitted"
- Visible in People tab (manager sees who has/hasn't submitted)
- No approval step. Submitted = final.

---

## 11. In-app notifications (Supabase Realtime — no email)

All notifications are in-app only. No external email service. Powered by Supabase Realtime — the bell icon updates in real time without page refresh.

**Notification types:**
- `timesheet_submitted` — "Your week of Jun 23–27 has been submitted."
- `missing_hours` — "You haven't logged hours today." (triggered by the daily check)

**Daily hours reminder — runs in Supabase `pg_cron` (portfolio tier):**
- User configures in Account → Notifications: which days + what time.
- A `pg_cron` job runs **every hour on the hour** and calls SQL function `check_missing_hours()`.
- For each active user, the function computes the user's **local** date/hour from `users.timezone`, and inserts a `missing_hours` notification when ALL hold:
  1. today (local) ∈ `notification_days`
  2. `hour(local now) = hour(notification_time)` (match by hour — cron is hourly, so the minute is ignored)
  3. zero `time_entries` for the user for today (local date)
  4. **no `missing_hours` notification already exists for that user today** (idempotency — prevents duplicates across hourly runs)
- Supabase Realtime fires the bell update automatically.
- **Why not Vercel cron:** Vercel Hobby cron runs at most once/day and cannot honour a per-user hourly time. `/api/cron/missing-hours` (secured by `CRON_SECRET`) is kept only as the production-on-Pro alternative that calls the same logic.

**Bell component:** `NotificationBell.tsx` in the top bar. Shows unread count badge. Dropdown shows last 10 notifications. "Mark all read" button. The Realtime subscription is filtered to `user_id=eq.<uid>` AND notifications RLS restricts rows to the owner — so a user can never receive another user's events.

---

## 12. Error handling (apply to every component and route)

**API routes return:**
```ts
{ data: T } on success
{ error: { code: string, message: string } } on failure
```

**Client components must handle:**
- **Loading state:** skeleton or spinner while data fetches
- **Empty state:** friendly message when no data (see each section above)
- **Error state:** toast notification with the error message + retry button
- **AI failure:** "AI unavailable — try again later." Never crash the modal or page.
- **Submit failure:** show the error, keep entries in draft (never lose data)

**Session expiry:**
- If any API call returns 401 → redirect to login page
- Show message: "Your session expired. Please sign in again."
- Preserve unsaved entry data in `sessionStorage` before redirect so user doesn't lose their work

**Observability:** server route errors are logged with a structured `{ code, message, route, userId }` shape and surfaced in Vercel Observability/Logs (built-in, no external service). Sentry free tier is an optional add-on, not required.

---

## 13. Coding conventions

- **Scaffold before logic.** List files/routes needed, create stubs, then fill logic.
- **One task at a time.** Clear context between phases.
- **Max ~300 lines per file.** Refactor into `lib/` modules if exceeded.
- **Conventional commits:** `feat(hours): …`, `fix(reports): …`, `feat(ai): …`
- **Server vs client:** AI calls and privileged DB writes in route handlers only. Interactive components are `'use client'`.
- **Never expose** `ANTHROPIC_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` to the client.
- **Schema lives in version-controlled SQL migrations** (`supabase/migrations/*.sql`), applied via the Supabase CLI — never hand-edited in the Table Editor as the source of truth. Seed (`lib/seed.ts`) must be idempotent (upsert, safe to re-run).
- **Tests:** Vitest for pure logic (hours math, week math, billability, health-check rules). Playwright for the critical path and RLS cross-user isolation. New logic ships with a test.
- **Secrets:** gitleaks runs as a pre-commit hook from Phase 0 (not just Phase 6).

---

## 14. Canonical env vars

```
ANTHROPIC_API_KEY=           # server only
SUPABASE_SERVICE_ROLE_KEY=   # server only
NEXT_PUBLIC_SUPABASE_URL=    # public
NEXT_PUBLIC_SUPABASE_ANON_KEY= # public
GOOGLE_CLIENT_ID=             # OAuth config
GOOGLE_CLIENT_SECRET=        # server only
CRON_SECRET=                 # server only — secures the OPTIONAL Vercel-cron endpoint
```

No `RESEND_API_KEY`. No email service keys of any kind. The primary cron path (`pg_cron`) runs inside Postgres and needs no secret; `CRON_SECRET` only guards the optional `/api/cron/missing-hours` HTTP route.

---

## 15. Canonical table names + RLS helpers

**Tables:** `users`, `clients`, `projects`, `project_members`, `tag_groups`, `tags`, `time_entries`, `timesheets`, `notifications`

Full schema in `TECH_SPEC.md §4`. `project_members` is a critical junction table — employees only see projects they are assigned to.

**RLS helper functions (in `public`, `SECURITY DEFINER`, `stable`)** — defined in the first migration, used by every policy to avoid recursion:
- `current_user_role() → text` — the caller's role
- `is_admin() → boolean`
- `is_manager_of(target uuid) → boolean` — true if `target.manager_id = auth.uid()`

Because these are `SECURITY DEFINER`, they bypass RLS on `users` and never recurse. Policies reference them (e.g. `using ( user_id = auth.uid() or is_manager_of(user_id) or is_admin() )`). Production optimisation: move `role`/`manager_id` into JWT claims via an auth hook.

---

## 16. Complete tag groups (seed data)

> **`is_billable` seed rule:** groups 1 & 2 → billable unless name starts with `NB_`; groups 3–7 → all `false`.

**Tag Group 1: `MCI COE_Billable Project Tags`**
Used by exactly these 6 projects:
1. Dr. Reddy's SOW 2_Base Market_Canada DTR COE_One Time
2. Dr. Reddy's SOW 2_DACH DTR COE_One Time
3. Dr. Reddy's SOW 2_Northern Europe DTR COE_One Time
4. Dr. Reddy's SOW 2_UK DTR COE_One Time
5. Dr. Reddy's SOW 2_Australia DTR COE_One Time
6. Intrigue Media Solutions Inc DTR COE_One Time

Billable (`is_billable=true`): Pre Discovery · Discovery and Concepting · Data Source Authentication · Data Ingestion / Preparation · Harmonization / Transformation · Wireframe Development · Dashboard Creation · User Acceptance Testing · QA / Validation / Audit · Client Communication (Calls/ Emails/ Tickets) · Project Manager Tasks · Client Training · Users, Workspace and Account Management · Client Audit Project · Maintenance Activities · Solution Design and Architecture · Data Strategy · Final Delivery

Non-billable (`is_billable=false`): NB_Data Ingestion / Preparation · NB_Discovery and Concepting · NB_Internal Meeting · NB_Client Success Meetings · NB_Client Success Task · NB_Memosight · NB_Harmonization & Transformation · NB_Wireframe Development · NB_Dashboard Creation · NB_User Acceptance Testing · NB_QA / Validation / Audit · NB_Communication & Meetings · NB_Project Manager Tasks · NB_No Cost Scope · NB_Internal Training / Shadowing · NB_Project KT · NB_Escalation Management · NB_Client Success Communication · NB_Pre Sales · NB_Delivery Account Growth

**Tag Group 2: `SF Tags - Salesforce Cloud Consulting`**
Used by exactly these 2 projects:
1. SiteOne Landscape Supply SFDC COE_One Time
2. The Chicago Dental Studio SFMC COE_One Time

Billable: Discovery and Concepting · Solution Design and Architecture · Client Communication (Calls/ Emails/ Tickets) · Documentation · Client Training · QA / Validation / Audit · Product Development · Project Management
Non-billable (`NB_`): NB_Internal meeting · NB_Client Success Meetings · NB_Project Management · NB_Client Success Communication · NB_Client Success Sales · NB_Client Communication · NB_Delivery Account Growth

**Tag Group 3: `AI Internal`** — *all non-billable*
Used by exactly this 1 project: NB_AI Internal
Tags: Memosight · Building · AI Research · Tool Exploration · Automating using AI · Marketing Insights · SF Sales Enablement

**Tag Group 4: `NB_Certifications & Training`** — *all non-billable*
Used by exactly this 1 project: NB_Certifications & Training
Tags: Tutoring and Teaching · SF Set Up and Partner Access

**Tag Group 5: `NB_Learning & Development SF COE`** — *all non-billable*
Used by exactly this 1 project: NB_Learning and Development SF COE
Tags: Adverity · Agentblazer Status · AI - Org wide (Praveen's AI email) · MCI Accredited Professional (SADA) · Microsoft Certified: Power BI Data Analyst Associate · NinjaCat · Salesforce Certified Agentforce Specialist · Salesforce Certified Marketing Cloud Email Specialist · Salesforce Certified Marketing Cloud Engagement · Salesforce Certified Platform Administrator · Salesforce Certified Platform Developer I · Salesforce Certified Platform Developer II · Salesforce Certified: Data Cloud Consultant · Supermetrics Training · Udemy: Automate the Boring Stuff with Python · Udemy: Looker Studio / Google Data Studio Complete Advanced Tutorial · Udemy: Python for Data Science and Machine Learning · Udemy: The Advanced SQL Course · Udemy: The Complete Google BiqQuery Masterclass: Beginner to Expert · Udemy: The Complete SQL Masterclass · Soft Skills

**Tag Group 6: `NB_Organizational Activity_Datorama COE`** — *all non-billable*
Used by exactly this 1 project: NB_Organizational Activity_Datorama COE
Tags: All Hands *(is_required: true — amber warning if not selected, never blocks save/submit)* · Backend activities (HR/ IT/ Income Tax/ Facilities/Finance) · DF Holiday · Metronome · DF Training Programs (Workshops, Presentations, Hackathons) · Peer Mentoring & Motivation · Performance Reviews (1 on 1's / Quarter Reviews) · Personal Leaves · Process Compliance (Timely/ Fifteen Five/ Greyt HR/ Empulse/ Know B4) · Smurfs Activities · Meeting with TM · Interviews

**Tag Group 7: `NB_Presales`** — *all non-billable*
Used by exactly this 1 project: NB_Presales - BIA
Tags: SOW's / Proposals · Pre Sales - Existing Business · Pre Sales - New Business · SF_North America · SF_Rest of the world · Non-SF Projects · Demo

---

## 17. Definition of done (every task)

Scaffolded files ≤300 lines · lint + build clean · **unit tests pass for any new logic** · no secret in client bundle (gitleaks pre-commit clean) · RLS verified (positive + cross-user negative) · empty and loading states implemented · error states implemented · works on Vercel preview URL at 375/768/1280 · CLAUDE.md and phase outcomes updated.
