# Phase 0 — Setup, schema, RLS, functions, seed, auth, shell

**Status:** code complete & verified locally (build green, 18 unit tests passing).
**Remaining:** the external-account steps below (Supabase, Google OAuth, Vercel) —
these need your credentials, so they can't be automated. Follow them in order.

---

## 1. What was built (in the repo, done)

### Tooling & config
- **Next.js 14.2** (App Router, TypeScript, Tailwind) scaffolded; React 18.
- Dependencies installed: `@supabase/supabase-js`, `@supabase/ssr`, `@anthropic-ai/sdk`,
  `recharts`, `@dnd-kit/*`, `jspdf` + `jspdf-autotable`, `papaparse`, `date-fns` + `date-fns-tz`,
  shadcn primitives (`clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react`);
  dev: `vitest`, `@playwright/test`, `tsx`, `husky`.
- [tailwind.config.ts](../tailwind.config.ts) + [app/globals.css](../app/globals.css) — shadcn-style theme tokens + Cadence brand green (AI tab) + warning amber.
- [lib/utils.ts](../lib/utils.ts) — `cn()` helper.
- [vitest.config.ts](../vitest.config.ts) — `@/` alias, `tests/unit/**`.
- [.env.local.example](../.env.local.example) — every env var with placeholders.
- `package.json` scripts: `test`, `test:watch`, `test:e2e`, `db:seed`, `prepare`.

### Database (version-controlled SQL migrations)
- [supabase/migrations/0001_schema.sql](../supabase/migrations/0001_schema.sql) — `pg_cron` extension; all **9 tables**
  (`users`, `clients`, `tag_groups`, `projects`, `project_members`, `tags`, `timesheets`,
  `time_entries`, `notifications`) with the v1.2 fields (`tags.is_billable`, `users.timezone`,
  `users.dismissed_welcome`, `hours numeric(5,2)`), indexes, and `updated_at` triggers.
- [supabase/migrations/0002_rls_functions.sql](../supabase/migrations/0002_rls_functions.sql) —
  RLS helper functions (`current_user_role`, `is_admin`, `is_manager_of`), the `handle_new_user`
  trigger (DF-domain check + profile creation), `entry_is_billable`, the atomic `submit_week` RPC,
  `check_missing_hours`, **RLS policies for all three roles on every table**, Realtime on
  `notifications`, and the hourly `pg_cron` schedule.

### App logic + tests (18 passing)
- [lib/hours.ts](../lib/hours.ts) — `formatHours`/`parseHours` (decimal ⇄ "Xh Ym").
- [lib/week.ts](../lib/week.ts) — ISO week, Monday start (single source).
- [lib/billable.ts](../lib/billable.ts) — entry billability (mirrors `entry_is_billable`).
- Tests: [tests/unit/hours.test.ts](../tests/unit/hours.test.ts), [week.test.ts](../tests/unit/week.test.ts), [billable.test.ts](../tests/unit/billable.test.ts).

### Auth + Supabase wiring
- [lib/supabase/client.ts](../lib/supabase/client.ts), [server.ts](../lib/supabase/server.ts), [middleware.ts](../lib/supabase/middleware.ts).
- [middleware.ts](../middleware.ts) — refreshes the session and redirects unauthenticated users to `/login`.
- [app/login/page.tsx](../app/login/page.tsx) — Google sign-in (passes `hd=decisionfoundry.com`).
- [app/auth/callback/route.ts](../app/auth/callback/route.ts) — exchanges the code and re-checks the email domain (defence-in-depth).

### Shell + routes
- `app/(app)/layout.tsx` — authenticated shell (Sidebar + TopBar + MobileNav), role-aware nav.
- [Sidebar.tsx](../components/layout/Sidebar.tsx), [MobileNav.tsx](../components/layout/MobileNav.tsx), [TopBar.tsx](../components/layout/TopBar.tsx), [NotificationBell.tsx](../components/layout/NotificationBell.tsx) (static for now).
- Six tab stub pages: `/hours`, `/projects`, `/people`, `/reports/clients`, `/reports/timesheets`, `/ai`, `/account`.
- [app/page.tsx](../app/page.tsx) → redirects to `/hours`. [app/api/health/route.ts](../app/api/health/route.ts) → connectivity + env check.
- gitleaks pre-commit hook at [.husky/pre-commit](../.husky/pre-commit).

### Verified locally
- `npm run build` → green (all 13 routes compile; middleware bundled).
- `npm test` → 18/18 passing.
- Lint + type-check → clean (run as part of `next build`).

---

## 2. Manual steps you need to do (in order)

### A. Create the Supabase project
1. Go to <https://supabase.com> → New project. Note the **project ref** (the `xxxx` in `xxxx.supabase.co`).
2. Project Settings → **API**: copy `Project URL`, `anon public` key, and `service_role` key.
3. Project Settings → **Database → Extensions**: enable **`pg_cron`** (toggle on).

### B. Fill in environment variables
```bash
cp .env.local.example .env.local
```
Fill `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`ANTHROPIC_API_KEY`, and a random `CRON_SECRET`. (`GOOGLE_*` are configured in Supabase, step D.)

### C. Apply the database migrations
**Option 1 — Supabase SQL editor (no CLI needed):** open the SQL editor, paste the contents of
`supabase/migrations/0001_schema.sql`, run it; then paste `0002_rls_functions.sql`, run it.
**Option 2 — Supabase CLI (source-of-truth path):**
```bash
npx supabase login
npx supabase link --project-ref <your-ref>
npx supabase db push
```
If the `cron.schedule(...)` block errors because pg_cron wasn't enabled yet, enable it (step A.3)
and re-run just that block (it is re-runnable).

### D. Configure Google OAuth
1. **Google Cloud Console** → APIs & Services → Credentials → Create OAuth client ID (Web application).
   - Authorized redirect URI: `https://<your-ref>.supabase.co/auth/v1/callback`
   - Copy the Client ID + Client secret.
2. **Supabase** → Authentication → Providers → **Google**: paste the Client ID + secret, enable.
3. **Supabase** → Authentication → URL Configuration:
   - Site URL: `http://localhost:3000` (and your Vercel URL for prod)
   - Redirect URLs: add `http://localhost:3000/auth/callback` and `https://<your-vercel-domain>/auth/callback`

### E. Seed the workspace data
```bash
npm run db:seed
```
Expected output: `clients: 5 · tag_groups: 7 · tags: 102 · projects: 13 · Seed complete ✓`.
Re-running is safe (idempotent upserts). Verify in the Table Editor:
**13 projects**, **7 tag groups**, tags present, and `tags.is_billable` correct
(non-billable count should be 76; billable 26 — only groups 1 & 2 have billable tags).

### F. First login + promote the first admin
1. `npm run dev` → open `http://localhost:3000` → sign in with your `@decisionfoundry.com` Google account.
   (A non-DF account is rejected by the `handle_new_user` trigger — login fails, no row created.)
2. Promote yourself to admin (run once in the Supabase SQL editor):
   ```sql
   update public.users set role = 'admin'
   where email = 'pavitra.p@decisionfoundry.com';
   ```

### G. (Optional) Install gitleaks to enforce the secret scan
The pre-commit hook warns if gitleaks is missing. To enforce: `winget install gitleaks`
(or see <https://github.com/gitleaks/gitleaks>).

### H. Deploy to Vercel
1. Push the repo to GitHub, import it in Vercel.
2. Add **all** env vars from `.env.local` to the Vercel project (Settings → Environment Variables).
3. Add your Vercel domain to Supabase Auth URL configuration (step D.3).
4. Push to `main` → preview/production deploy. Hit `/api/health` to confirm `database: "ok"`.

---

## 3. Phase 0 acceptance criteria — how to verify

| Criterion | How to check |
|---|---|
| `npm run dev` starts on :3000 | run it; shell with six tabs loads after login |
| Google OAuth (DF) works; non-DF rejected | sign in with DF acct ✓; non-DF → `/login?error=domain` |
| Profile row auto-created, role `employee` | check `public.users` after first login |
| 13 projects, 7 groups, tags + is_billable | Table Editor after `npm run db:seed` |
| `pg_cron` job scheduled | `select * from cron.job;` → `missing-hours-hourly` |
| Push → Vercel preview builds green | Vercel dashboard |
| RLS positive/negative | sign in as two users; user B cannot read user A's `time_entries` (Phase 1 has data to test) |
| No secret in client bundle | DevTools → Sources → search `sk-ant` → absent |
| lint + build + test clean | `npm run build` and `npm test` |

---

## 4. Notes / decisions carried forward
- **Timezone default** is `Asia/Kolkata` (confirmed). Users can change it in Account (Phase 5).
- **External IDs:** Dr. Reddy's Canada uses the known real ID `US-SFM-MCI-DRR-1291`; the other 12 are
  placeholders an admin can edit later.
- **Edge-runtime warning** at build (`process.version` from `@supabase/ssr` in middleware) is benign —
  this is the official Supabase middleware pattern and runs correctly on Vercel Edge.
- **Auth gating** in middleware passes through if Supabase env is absent (so a preview renders before
  secrets are set); once env is present, unauthenticated users are redirected to `/login`.
- Work is **not committed yet** — tell me when you want me to commit Phase 0 (I'll branch off `main` first).

---

## 5. Next: Phase 1 — Hours tab
Calendar (day/week/month), entry CRUD with project-members + tag-group validation, drag-and-drop,
welcome card, and the `/api/entries` routes. See `IMPLEMENTATION_PLAN.md → Phase 1`.
