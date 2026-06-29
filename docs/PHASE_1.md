# Phase 1 — Hours tab: calendar + time entry CRUD + drag and drop

**Status:** code complete & verified locally (build green, 28 unit tests passing).
**Prerequisite:** Phase 0 external steps must be done (Supabase migrations 0001–0003 applied, seeded, first admin promoted, Google OAuth configured).

---

## 1. What was built

### shadcn/ui components installed
`button` · `input` · `textarea` · `select` · `dialog` · `badge` · `sonner` (toast) · `sheet`.
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
| `CalendarWeek.tsx` | Full-width bordered column grid, Mon–Fri (Sat/Sun appear only if entries exist). Day headers stack day name / date / hours. No gap between columns — separated by thin borders. |
| `CalendarDay.tsx` | Single-day view with drop zone |
| `CalendarMonth.tsx` | Monthly grid (Mon–Sun headers). Each cell shows date + hours; project chips per entry; hover reveals "+ New Entry". Search bar filters by project name or note. |
| `DraggableEntry.tsx` | Entry card wrapped in @dnd-kit `useDraggable` |
| `DroppableDay.tsx` | Day column drop target — minimal tint on drag-over, no colored ring |
| `EntryCard.tsx` | Project colour stripe, name, hours, lock icon / drag handle |
| `EntryModal.tsx` | Right-side **Sheet** panel (not a dialog) — slides in from the right, calendar stays visible. Project shown as a flat selectable list with colour dots. Hours, notes, tags, copy/move/delete inside the panel. |
| `HoursInput.tsx` | Hours field + quick buttons (15m / 30m / 1h / 2h) |
| `TagSelector.tsx` | Tag pills, multi-select, amber warning for required tags |
| `WelcomeCard.tsx` | First-run card (shown when no entries + dismissed_welcome=false) |
| `MonthLockedBanner.tsx` | Amber banner for locked months |

### Hours page
- [app/(app)/hours/page.tsx](../app/(app)/hours/page.tsx) — Server component. Parallel-fetches user profile, project memberships (with tags), month locks, and current week's entries. Passes to `HoursShell` as props (no loading flash on first paint).

### Entry panel design decisions
- **Sheet not Dialog** — the entry form slides in from the right so the calendar remains visible and in context. There is no backdrop overlay covering the calendar.
- **Project as a list** — projects are displayed as flat tappable rows (colour dot + name + checkmark when selected) rather than a `<select>` dropdown. This matches Timely's UX and is faster to use on both desktop and mobile.
- **No coloured hover backgrounds** — the droppable day highlight during drag is a barely-visible tint (`bg-primary/[0.04]`). Day columns have no background change on hover.

### Month-lock enforcement in UI
- On page load, `buildLockedSet(lockRows)` creates a `Set<"YYYY-MM">`.
- `isMonthLocked(date, lockedMonths)` gates every create/drag/edit action.
- Drag to a locked month → toast error, no request sent.
- Entry in a locked month → read-only Sheet opens (no edit/delete controls, lock badge in header).
- Month banner appears above the calendar in week/month views.

### "Polish with AI" placeholder
The button is present in the entry panel but is `disabled` with tooltip "AI polish coming in Phase 2". No network call is made.

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
| Entry panel slides in from right | Click "+ New" on any day — Sheet slides in, calendar stays visible |
| Project list shows only assigned projects | Only projects from `project_members` appear in the list |
| Selecting a project highlights it (checkmark) | Click a project row — row gets accent background + ✓ |
| Tags load for the selected project | Change project — tag pills update, previous selection cleared |
| Required tag (All Hands on Org Activity) shows amber warning | Select that project, do not select All Hands — warning appears, Save not blocked |
| Create entry → persists after reload | Log an entry, reload — it's there |
| Edit entry → changes saved | Click existing entry card, edit hours/notes, save — updated |
| Delete entry | Open entry panel → Delete — entry gone |
| Copy to date → two entries on different days | Copy to… → pick another date — original + copy both exist |
| Move to date → entry on new day only | Move to… → original gone, appears on target date |
| Drag entry Mon→Thu | Drag card between columns — persists on reload |
| Drag to locked month → toast, no move | Drag to a locked day — toast fires, entry stays |
| Locked month: no "+ New", read-only panel | Navigate to a previous month — lock icon on cards, panel opens read-only |
| Week column grid: no background on hover | Hover over an empty column — no colour change |
| Day headers: day / date / hours stacked | Week view shows e.g. MON / 22 / 0h in each column header |
| Week navigation Monday start | `<` / `>` — week always starts Monday |
| Today button returns to current week | Navigate away, click Today |
| Month view search | Type a project name → only matching entries shown |
| Month cells show "+ New Entry" on hover | Hover over an empty cell in month view |
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
- "Polish with AI" wired into entry panel with Accept / Edit / Regenerate.
- `SubmitWeekButton` + `MissingDaysModal` + `SubmittedBadge`.
- `submit_week()` RPC called from a new `/api/timesheets/submit` route.
- In-app `timesheet_submitted` notification appears in the bell.
