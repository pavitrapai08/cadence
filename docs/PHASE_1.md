# Phase 1 — Hours tab: calendar + time entry CRUD + drag and drop

**Status:** code complete & verified locally (build green, 28 unit tests passing).
**Prerequisite:** Phase 0 external steps must be done (Supabase migrations 0001–0003 applied, seeded, first admin promoted, Google OAuth configured).

---

## 1. What was built

### shadcn/ui components installed
`button` · `input` · `textarea` · `select` · `dialog` · `badge` · `sonner` (toast).
Toaster wired into `app/layout.tsx` (top-right, richColors).

### Shared types
- [lib/types.ts](../lib/types.ts) — `TimeEntry`, `Project`, `Tag`, `TagGroup`, `UserProfile`, `MonthLockRow`, `ApiResponse<T>`.

### API routes
| Route | Method | Description |
|---|---|---|
| `/api/entries` | GET | Entries for a week (`?weekStart=YYYY-MM-DD`) |
| `/api/entries` | POST | Create entry — validates project membership + tag ownership |
| `/api/entries/[id]` | PATCH | Update entry — validates ownership, draft status, tags |
| `/api/entries/[id]` | DELETE | Delete draft entry |
| `/api/projects/mine` | GET | User's assigned projects with tag_group + sorted tags |
| `/api/users/me` | PATCH | Update own profile (currently: `dismissedWelcome`) |

All routes return `{ data: T }` on success, `{ error: { code, message } }` on failure.
Month-locked errors surface as HTTP 409 with `code: "month_locked"`.

### Calendar + entry components (`components/hours/`)
| File | What it does |
|---|---|
| `HoursShell.tsx` | Client orchestrator — view toggle, week nav, DnD context, entry state, fetch |
| `CalendarWeek.tsx` | Mon–Fri grid (Sat/Sun added only if entries exist); locked-month banner |
| `CalendarDay.tsx` | Single-day view with drop zone |
| `CalendarMonth.tsx` | Monthly grid with search (project name or note text) |
| `DraggableEntry.tsx` | Entry card wrapped in @dnd-kit `useDraggable` |
| `DroppableDay.tsx` | Day column wrapped in @dnd-kit `useDroppable` |
| `EntryCard.tsx` | Project colour stripe, name, hours, lock icon / drag handle |
| `EntryModal.tsx` | Create / edit / read-only dialog — project, hours, notes, tags, copy/move/delete |
| `HoursInput.tsx` | Hours field + quick buttons (15m / 30m / 1h / 2h) |
| `TagSelector.tsx` | Tag pills, multi-select, amber warning for required tags |
| `WelcomeCard.tsx` | First-run card (shown when no entries + dismissed_welcome=false) |
| `MonthLockedBanner.tsx` | Amber banner for locked months |

### Hours page
- [app/(app)/hours/page.tsx](../app/(app)/hours/page.tsx) — Server component. Parallel-fetches user profile, project memberships (with tags), month locks, and current week's entries. Passes to `HoursShell` as props (no loading flash on first paint).

### Month-lock enforcement in UI
- On page load, `buildLockedSet(lockRows)` creates a `Set<"YYYY-MM">`.
- `isMonthLocked(date, lockedMonths)` gates every create/drag/edit action.
- Drag to a locked month → toast error, no request sent.
- Entry in a locked month → read-only modal opens (no edit/delete controls).
- Month banner appears above the day columns in week view.

### "Polish with AI" placeholder
The button is present in `EntryModal` but is `disabled` with tooltip "AI polish coming in Phase 2". No network call is made. Phase 2 will wire the streaming narrative route.

---

## 2. How to verify (once Supabase is live)

### Setup
1. Confirm migrations 0001–0003 are applied (see Phase 0 docs).
2. Run `npm run db:seed` if not done yet.
3. As admin in Supabase Table Editor → `project_members`: add yourself to at least one project.
4. `npm run dev` → open `http://localhost:3000`

### Functional checklist
| Check | How |
|---|---|
| Project dropdown shows only your assigned projects | Open entry modal — only projects from `project_members` appear |
| Tags load for the selected project | Change project — tag list updates, previous selection cleared |
| Required tag (All Hands on Org Activity) shows amber warning | Select that project, do not select All Hands — warning appears but Save is not blocked |
| Create entry → persists after reload | Log an entry, reload — it's there |
| Edit entry → changes saved | Click existing entry, edit hours/notes, save — updated |
| Delete entry → gone after reload | Three-dot → Delete — gone |
| Copy to date → two entries on different days | Copy → pick another date — original + copy both exist |
| Move to date → entry on new day only | Move → original gone, appears on target date |
| Drag entry Mon→Thu | Drag card between columns — persists on reload |
| Drag to locked month → toast, no move | Drag to a column in a locked month — toast fires, entry stays |
| Locked month: no "+ New", lock icon on cards | Navigate to a previous month |
| Week navigation Mon start | `<` / `>` — week always Monday–Sunday |
| Today button returns to current week | Navigate away, click Today |
| Month view search | Type a project name → filters entries |
| Welcome card shown first time | New account (zero entries, dismissed_welcome=false) → card shown; dismiss → gone on reload |

### API smoke tests (curl / Postman)
```bash
# Get entries for current week
GET /api/entries?weekStart=2026-06-23

# Create entry
POST /api/entries   { "projectId":"<id>", "date":"2026-06-27", "hours":2, "rawNotes":"Test" }

# Create in locked month → 409 month_locked
POST /api/entries   { "projectId":"<id>", "date":"2026-05-15", "hours":1 }

# List locked months
GET /api/admin/month-locks

# Unlock May 2026 (admin only)
PATCH /api/admin/month-locks   { "year":2026, "month":5, "is_locked":false }
```

---

## 3. Known limitations carried to Phase 2

- **"Polish with AI"** button is disabled — wired in Phase 2.
- **Submit week** button not yet built — Phase 2.
- **Day view** shows today's column only; proper date navigation (← →) is Phase 2 polish.
- **Notification bell** still static — Phase 4.

---

## 4. Next: Phase 2 — AI narrative + timesheet submission

- `POST /api/ai/narrative` — streaming one-sentence description.
- "Polish with AI" wired into `EntryModal` with Accept / Edit / Regenerate.
- `SubmitWeekButton` + `MissingDaysModal` + `SubmittedBadge`.
- `submit_week()` RPC called from a new `/api/timesheets/submit` route.
- In-app `timesheet_submitted` notification appears in the bell.
