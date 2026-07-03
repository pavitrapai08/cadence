# Cadence — Track the rhythm of your work

Cadence is DecisionFoundry's internal AI-powered timesheet platform — a direct replacement for Timely. Employees log hours against projects, submit weekly timesheets, and use Claude AI to polish notes and reflect on their week. Admins manage the full workspace.

**Stack:** Next.js 14 · TypeScript · Tailwind CSS · shadcn/ui · Supabase (Postgres + Auth + Realtime) · Claude API (`claude-sonnet-4-6`) · Vercel

---

## Features

| Tab | Who | What |
|---|---|---|
| **Hours** | All | Calendar (day/week/month), log/edit/drag entries, AI polish, submit week |
| **Projects** | All | Dashboard + detail pages with billable/non-billable donut chart |
| **People** | Manager/Admin | Team utilisation, capacity, submitted status |
| **Reports** | All (role-scoped) | Client & Projects report + Timesheets report + CSV/PDF export |
| **AI** | All | Personal weekly digest (Claude, streaming) + rules-based health check |
| **Account** | All | Profile, timezone, notification prefs, workspace settings (admin) |

---

## Prerequisites

- Node.js 18+
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- A Supabase project (free tier works for development)
- A Google Cloud project with OAuth 2.0 credentials
- An Anthropic API key

---

## Local Setup

### 1. Clone and install

```bash
git clone <repo-url> cadence
cd cadence
npm install
```

### 2. Environment variables

Copy the example and fill in real values:

```bash
cp .env.local.example .env.local
```

| Variable | Where to get it | Client? |
|---|---|---|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API Keys | Server only |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon key | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key | Server only |
| `GOOGLE_CLIENT_ID` | Google Cloud → Credentials → OAuth Client ID | Public |
| `GOOGLE_CLIENT_SECRET` | Google Cloud → Credentials → OAuth Client Secret | Server only |
| `CRON_SECRET` | Generate: `openssl rand -base64 32` | Server only |

> **Never commit `.env.local`** — it is git-ignored.

### 3. Google OAuth configuration

In the [Google Cloud Console](https://console.cloud.google.com):
1. Create an OAuth 2.0 Client ID (Web application)
2. Add **Authorised redirect URIs**:
   - `http://localhost:3000/auth/callback` (development)
   - `https://<your-vercel-domain>/auth/callback` (production)
3. Copy the Client ID and Secret into `.env.local`

In the Supabase dashboard → Authentication → Providers → Google:
- Enable Google provider
- Paste the Client ID and Secret
- Set **Authorized domain** hint to `decisionfoundry.com` (this is the `hd` parameter — UX only, the DB trigger is the real boundary)

### 4. Apply database migrations

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

This applies three migrations in order:
- `0001_schema.sql` — all tables, indexes, `updated_at` triggers
- `0002_rls_functions.sql` — RLS helpers, policies, `handle_new_user` trigger, `submit_week`, `check_missing_hours`, pg_cron schedule
- `0003_month_locks.sql` — month locking table, enforcement trigger, auto-lock cron, backfill

### 5. Seed DecisionFoundry data

```bash
npm run db:seed
```

This upserts (safe to re-run):
- 5 clients · 13 projects (with exact colours and external IDs)
- 7 tag groups · all tags with correct `is_billable` / `is_required` flags

### 6. Promote the first admin

Every new user starts as `employee`. The first admin must be promoted manually via SQL in the Supabase SQL Editor:

```sql
update public.users
set role = 'admin'
where email = 'your-email@decisionfoundry.com';
```

After that, admins can promote others via Account → Workspace → Users.

### 7. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with your `@decisionfoundry.com` Google account.

---

## Daily Hours Reminder (pg_cron)

The hourly missing-hours check runs **inside Postgres via `pg_cron`** — no Vercel cron configuration needed. It was scheduled automatically by migration 0002:

```sql
select cron.schedule(
  'missing-hours-hourly',
  '0 * * * *',
  $$ select public.check_missing_hours(); $$
);
```

The function is timezone-aware (per `users.timezone`), idempotent (no duplicate notifications per day), and only fires when:
1. Today (in the user's local timezone) is in their `notification_days`
2. The current local hour matches their `notification_time` hour
3. They have no time entries for today
4. No `missing_hours` notification has been sent today

**Optional HTTP path (Vercel Pro only):** `POST /api/cron/missing-hours` with `x-cron-secret` header — same logic, different trigger. Not used in portfolio deployment.

---

## Running Tests

```bash
# Unit tests (Vitest) — no DB required
npm test

# E2E tests (Playwright) — requires running server + seeded DB
npm run test:e2e

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

---

## Deployment (Vercel)

### First deployment
1. Push the repo to GitHub
2. Import into [Vercel](https://vercel.com/new)
3. Add all environment variables from `.env.local` in Vercel → Settings → Environment Variables
4. Deploy — Vercel runs `next build` automatically on every push

### Rolling back
In the Vercel dashboard → Deployments, click any previous deployment → **Promote to Production**. No git revert needed.

### Portfolio vs Production

| Concern | Portfolio (Vercel Hobby) | Production (600+ employees) |
|---|---|---|
| Cron | Supabase pg_cron (hourly, in-DB) | Same — or Vercel Pro cron (`/api/cron/missing-hours`) |
| Auth | Google OAuth (`@decisionfoundry.com`) | Swap for Microsoft SSO (Azure AD) — one Supabase config change |
| DB auto-pause | Yes (free tier pauses after inactivity) | Supabase Pro ($25/mo) — no pause |
| Realtime connections | ~200 concurrent | Monitor; upgrade Realtime quota if >500 concurrent users |
| Function timeout | 10s (Hobby) | 60s (Pro) — required for AI streaming on large weeks |

---

## Architecture Notes

- **Domain restriction** is enforced in three layers: Google `hd` hint (UX only) → `handle_new_user()` DB trigger (real boundary, raises on non-DF email) → auth callback domain re-check (defence in depth).
- **Billability** lives on `tags.is_billable`. An entry is billable iff it has ≥1 billable tag selected. There is no `is_billable` on projects or clients.
- **Week boundaries** are ISO Monday-start computed via `date-fns` with `weekStartsOn: 1` on both client and server.
- **Hours** are stored as `numeric(5,2)` decimal (e.g. `1.50` = 1h 30m). All sums use the decimal, never the formatted string.
- **No approval workflow.** Timesheets go `draft → submitted`. Submitted = final.
- **Month locking** is enforced by a DB trigger (`check_entry_month_not_locked`). Months are auto-locked on the 1st via pg_cron. Admins can unlock in Account → Workspace.

---

## Security

See [docs/security-reviews/security-review-2026-07-03.md](docs/security-reviews/security-review-2026-07-03.md) for the full Phase 6 security review.

Key points:
- `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are server-only — never `NEXT_PUBLIC_`
- RLS enabled on all nine tables using `SECURITY DEFINER` helpers (no recursion)
- Submitted entries are immutable (DB trigger + API 403)
- gitleaks runs as a pre-commit hook on every commit
