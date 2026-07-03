# Security Review — Cadence v1.0.0

**Date:** 2026-07-03  
**Reviewer:** Claude Code (automated) + manual inspection  
**Scope:** Full codebase — all API routes, components, migrations, middleware, lib utilities  
**Build:** Phase 6 pre-release pass

---

## Checklist

| Item | Status | Notes |
|---|---|---|
| No `ANTHROPIC_API_KEY` in client bundle | ✅ Pass | Grep for `NEXT_PUBLIC_ANTHROPIC` → 0 results. Key used only in server-side route handlers. |
| No `SUPABASE_SERVICE_ROLE_KEY` in client bundle | ✅ Pass | Used only in `lib/seed.ts` (dev tool). Never in any route handler or component. |
| Google OAuth rejects non-`@decisionfoundry.com` | ✅ Pass | `handle_new_user()` trigger raises on non-DF email (DB-level, real boundary). Auth callback re-checks and signs out. |
| Employee cannot read another employee's entries | ✅ Pass | RLS policy on `time_entries`: `user_id = auth.uid()` for employees. Verified in migration 0002. |
| Submitted entries cannot be edited/deleted | ✅ Pass | API 403 on PATCH/DELETE if `status = 'submitted'`. RLS UPDATE/DELETE policy requires `status = 'draft'`. |
| `/api/cron/missing-hours` — 403 without correct `CRON_SECRET` | ✅ Pass | Header-only check after fix. Query-param fallback removed. |
| Admin-only routes 403 for employee/manager | ✅ Pass | All `/api/admin/*` routes: two-step auth (session + DB role check). |
| No `users`-policy recursion | ✅ Pass | All policies use `SECURITY DEFINER` helpers (`is_admin()`, `is_manager_of()`, `current_user_role()`). Never a self-subquery on `users`. |
| `runtime = 'nodejs'` on all AI routes | ✅ Pass | `/api/ai/narrative` and `/api/ai/digest` confirmed. |
| `maxDuration = 60` on all AI routes | ✅ Pass | Both streaming routes confirmed. |
| Supabase Realtime filtered to `user_id` | ✅ Pass | `NotificationBell.tsx` subscribes with `user_id=eq.<uid>`. RLS also restricts notification rows to owner. |
| gitleaks pre-commit hook active | ✅ Pass | `.husky/pre-commit` runs gitleaks. Active since Phase 0. |
| `.env.local` excluded from git | ✅ Pass | `.gitignore` contains `.env*.local`. Confirmed not in git history. |

---

## Issues Found and Resolved in This Pass

### H-1 — Open redirect in auth callback (FIXED)
**File:** `app/auth/callback/route.ts`  
**Risk:** Attacker crafts `?next=@evil.com` — URL parsers treat `evil.com` as the host.  
**Fix:** Validate `next` starts with `/`, does not start with `//`, and contains no `@`.

### M-1 — CRON_SECRET exposed via query param (FIXED)
**File:** `app/api/cron/missing-hours/route.ts`  
**Risk:** Secret appears in Vercel access logs and CDN logs if passed as `?secret=`.  
**Fix:** Accept `x-cron-secret` header only. Query-param branch removed.

### L-2 — Overly broad middleware PUBLIC_PREFIXES (FIXED)
**File:** `lib/supabase/middleware.ts`  
**Risk:** Any future `/api/cron/*` route would bypass session middleware automatically.  
**Fix:** Changed from `/api/cron` (prefix) to `/api/cron/missing-hours` (exact path).

### M-3 — Missing `runtime = "nodejs"` on 17 routes (FIXED)
**Files:** All routes except `/api/ai/narrative`, `/api/ai/digest`, `/api/health`, and existing entries/projects routes.  
**Risk:** Future Next.js/Vercel config enabling Edge runtime globally would silently break every route using `cookies()`.  
**Fix:** Added `export const runtime = "nodejs"` to all 17 affected routes.

---

## Outstanding Notes (Non-Code — Action Required by Developer)

### C-1 — Real production credentials in `.env.local`
**Status:** Informational — file is git-ignored and was never committed.  
**Action required:**
- If this machine is shared or has had remote access: **rotate all three secrets immediately**:
  - Anthropic API key: https://console.anthropic.com/settings/keys
  - Supabase service role key: Supabase dashboard → Settings → API → Regenerate
  - Google OAuth client secret: Google Cloud Console → Credentials → regenerate
- Use separate Supabase projects for dev and production

### C-2 — CRON_SECRET is placeholder value
**Status:** Not rotated.  
**Action required:** Replace `CRON_SECRET` in `.env.local` (and in Vercel environment variables if deployed) with a cryptographically random value:
```bash
openssl rand -base64 32
```

### M-2 — `/api/health` publicly accessible
**Status:** Acceptable for portfolio. Returns only boolean env-var presence flags, no values.  
**Production recommendation:** Move to authenticated endpoint or remove before go-live with 600 employees.

---

## RLS Verification (from migration 0002)

```sql
-- time_entries SELECT policy (employee)
using (user_id = auth.uid() or is_manager_of(user_id) or is_admin())

-- time_entries UPDATE/DELETE policy (draft only)
using (user_id = auth.uid() and status = 'draft')
with check (user_id = auth.uid() and status = 'draft')

-- notifications SELECT policy (owner only)
using (user_id = auth.uid())
```

All policies confirmed using `SECURITY DEFINER` helpers — no self-referential `users` subqueries.

---

## Test Coverage

| Layer | Tool | Count | Status |
|---|---|---|---|
| Unit — `hours.ts` | Vitest | 8 tests | ✅ Pass |
| Unit — `week.ts` | Vitest | 7 tests | ✅ Pass |
| Unit — `billable.ts` | Vitest | 6 tests | ✅ Pass |
| Unit — `month-lock.ts` | Vitest | 10 tests | ✅ Pass |
| Unit — `health.ts` (new) | Vitest | 12 tests | ✅ Pass |
| E2E — auth guards | Playwright | 8 tests | Requires running server |
| E2E — API security | Playwright | 8 tests | Requires running server |

---

## Sign-off

- Build: `next build` clean ✅  
- Type check: `tsc --noEmit` clean ✅  
- Vitest: all unit tests pass ✅  
- Playwright: auth + API security specs written; run against deployed URL for final verification  
- Security checklist: all items pass (two developer-side secret-rotation items outstanding)
