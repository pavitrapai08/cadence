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
| `HoursShell.tsx` | Client orchestrator — segmented-pill view toggle, week nav, DnD context, entry state, fetch. Toolbar shows week total as a green badge. |
| `CalendarWeek.tsx` | Rounded-xl card with thin column separators (no outer spreadsheet border). Headers are white/transparent with a large bold date and a tiny day abbreviation — no gray background. Today column has a subtle green tint. Columns have 260px min-height. Empty columns show a dashed "+ New" button; filled columns show it on hover. Sat/Sun appear only when entries exist. |
| `CalendarDay.tsx` | Single-day view with drop zone |
| `CalendarMonth.tsx` | Monthly grid (Mon–Sun headers). Each cell shows date + hours; project chips per entry; hover reveals "+ New Entry". Search bar filters by project name or note. |
| `DraggableEntry.tsx` | Entry card wrapped in @dnd-kit `useDraggable` |
| `DroppableDay.tsx` | Day column drop target — minimal `bg-primary/[0.04]` tint on drag-over, no colored ring |
| `EntryCard.tsx` | 3px project-colour left stripe, project name, hours shown in project colour, lock icon / drag handle. Hover lifts with shadow. |
| `EntryModal.tsx` | Right-side **Sheet** panel — slides in from the right, calendar stays fully visible. Field order: Notes → Polish with AI → Project → Logged time → Tag. Project list is flat rows with colour dots + checkmark; search bar appears when >5 projects. |
| `HoursInput.tsx` | Controlled input displaying formatted time ("45m", "1h 30m") — not raw decimal. Syncs with quick buttons via useEffect + focus-ref guard. Quick buttons: 15m / 30m / 1h / 2h. |
| `TagSelector.tsx` | **Single-select** searchable dropdown. Trigger shows the selected tag name (or "Choose a tag…"). Dropdown has a search field and radio-button list. Clicking the selected tag deselects it. Required tags display a "Required" badge. |
| `WelcomeCard.tsx` | First-run card with gradient background and icon header (shown when no entries + dismissed_welcome=false) |
| `MonthLockedBanner.tsx` | Amber banner for locked months |

### Hours page
- [app/(app)/hours/page.tsx](../app/(app)/hours/page.tsx) — Server component. Parallel-fetches user profile, project memberships (with tags), month locks, and current week's entries. Passes to `HoursShell` as props (no loading flash on first paint).

### UI / visual design system
All changes shipped post-Phase-1-initial as a polish pass:

| Area | Decision |
|---|---|
| Primary colour | Brand forest green (`oklch(0.42 0.13 152)`) — replaces near-black. All buttons, focus rings, active states, today highlights are now green. |
| Accent / secondary | Subtle green tint (`oklch(0.97 0.01 152)`) so hover states feel brand-aligned rather than pure gray. |
| Sidebar | Dark slate-900 background, white nav text, green AI tab accent, "DecisionFoundry" footer label. Visually separates nav from content. |
| TopBar | User avatar circle with initials derived from email (e.g. `pavitra.p@…` → "PP"). |
| Mobile nav | Active tab uses primary green. |
| View toggle | Segmented pill (bg-muted container, bg-background active pill) — Notion/Linear pattern. |
| Week total | Green rounded badge (`45m this week`) instead of plain muted text. |

### Entry panel design decisions
- **Sheet not Dialog** — the Dialog approach (centered overlay with `bg-black/10` backdrop) let the calendar bleed through, making the UI look cluttered. Sheet slides in from the right; calendar stays fully visible and in context. This is how Timely works.
- **Field order** — Notes first (primary action), then Project, Logged time, Tag. Matches Timely's "what did you work on?" top-of-form pattern.
- **Single-select tags** — users select exactly one tag per entry. The dropdown uses radio-button styling to make this clear. The DB still stores `tag_ids text[]` (max one item); billability is evaluated as before.
- **Formatted time display** — input shows "45m" not "0.75". Parses on blur; accepts "45m", "1h 30m", "1.5", etc.
- **Project search** — appears automatically when the user has more than 5 projects assigned.

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
| Entry panel slides in from right | Click "+ New" on any day — Sheet slides in, calendar stays fully visible |
| No dark overlay behind the panel | Calendar is clearly visible to the left of the open panel |
| Project list shows only assigned projects | Only projects from `project_members` appear |
| Selecting a project highlights it (checkmark) | Click a project row — accent background + ✓ |
| Tags load for the selected project | Change project — dropdown updates, previous selection cleared |
| Tag is single-select (radio) | Select a tag — others deselect. Click again to deselect. |
| Required tag (All Hands on Org Activity) shows badge | Open that project in tag dropdown — "Required" label visible |
| Logged time shows formatted (not decimal) | Edit existing 0.75h entry — input shows "45m" |
| Quick buttons sync to display | Click "1h" — input shows "1h" |
| Create entry → persists after reload | Log an entry, reload — it's there |
| Edit entry → changes saved | Click existing entry card, edit hours/notes, save — updated |
| Delete entry | Open entry panel → Delete — entry gone |
| Copy to date → two entries on different days | Copy to… → pick another date — original + copy both exist |
| Move to date → entry on new day only | Move to… → original gone, appears on target date |
| Drag entry Mon→Thu | Drag card between columns — persists on reload |
| Drag to locked month → toast, no move | Drag to a locked day — toast fires, entry stays |
| Locked month: no "+ New", read-only panel | Navigate to a previous month — lock icon on cards, panel opens read-only |
| Calendar headers are white (not gray) | Week view column headers have no gray background tint |
| Empty column shows dashed "+ New" button | Empty day column shows bordered dashed button |
| Filled column shows "+ New" on hover | Column with entries — hover to reveal "+ New" at bottom |
| Week total shown as green badge | Log entries — "Xh Ym this week" appears as green pill in toolbar |
| Today column has subtle green tint | Current day column header has a faint green background |
| Sidebar is dark slate | Left nav is dark background with white text |
| User initials in top bar | Top-right shows avatar circle with your initials |
| Week navigation Monday start | `<` / `>` — week always starts Monday |
| Today button returns to current week | Navigate away, click Today |
| Month view search | Type a project name → only matching entries shown |
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
