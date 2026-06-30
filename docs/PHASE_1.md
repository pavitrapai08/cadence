# Phase 1 — Hours tab: calendar + time entry CRUD + drag and drop

**Status:** Complete (including all post-Phase-1 polish passes).  
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
| `/api/entries/[id]` | PATCH | Update entry — validates ownership, month-lock, tags |
| `/api/entries/[id]` | DELETE | Delete entry (blocked on month-locked months) |
| `/api/projects/mine` | GET | User's assigned projects with tag_group + sorted tags |
| `/api/users/me` | PATCH | Update own profile (currently: `dismissedWelcome`) |

All routes return `{ data: T }` on success, `{ error: { code, message } }` on failure.  
Month-locked errors surface as HTTP 409 with `code: "month_locked"`.

### Calendar + entry components (`components/hours/`)
| File | What it does |
|---|---|
| `HoursShell.tsx` | Client orchestrator — segmented-pill view toggle, week nav, DnD context, entry state, week fetch. Toolbar shows week total badge + Submit button/Submitted badge (Phase 2). |
| `CalendarWeek.tsx` | Seven floating day cards in a CSS grid with `gap`. Rounded-2xl cards; no outer spreadsheet border. Large bold date + tiny day abbreviation in the header. Today column has a subtle green tint. Cards have 260px min-height. Empty columns show a dashed "+ New" button; filled columns show it on hover. Month-locked days show a lock icon; no "+ New". |
| `CalendarDay.tsx` | Single-day view with drop zone. |
| `CalendarMonth.tsx` | Monthly grid (Mon–Sun headers). Each cell shows date + hours; project chips per entry; hover reveals "+ New Entry". Search bar filters by project name or note. |
| `EntryModal.tsx` | Centered modal overlay — `fixed inset-0 bg-black/60` backdrop, `w-[520px]` rounded-2xl card. Field order: Notes → Polish with AI → Project → Logged time → Tag. Project list is flat rows with colour dots + checkmark; search bar appears when >5 projects. Copy/Move/Delete in the footer action row. |
| `DraggableEntry.tsx` | Entry card wrapped in @dnd-kit `useDraggable`. Drag disabled only when the month is locked (not on submitted entries). |
| `DroppableDay.tsx` | Day column drop target — minimal `bg-primary/[0.04]` tint on drag-over, no coloured ring. |
| `EntryCard.tsx` | 3px project-colour left stripe, project colour tint background, project name, hours in project colour, lock icon / drag handle. Hover lifts with shadow. |
| `HoursInput.tsx` | Controlled input displaying formatted time ("45m", "1h 30m") — not raw decimal. Syncs with quick buttons via useEffect + focus-ref guard. Quick buttons: 15m / 30m / 1h / 2h. |
| `TagSelector.tsx` | Single-select searchable dropdown. Trigger shows the selected tag name (or "Choose a tag…"). Dropdown has a search field and radio-button list. Clicking the selected tag deselects it. Required tags display a "Required" badge. |
| `WelcomeCard.tsx` | First-run card with gradient background and icon header (shown when no entries + dismissed_welcome=false). |
| `MonthLockedBanner.tsx` | Amber banner shown above locked-month calendar views. |
| `AIPolishSection.tsx` | Streaming AI polish UI — idle / streaming / done states, Accept / Edit / Regenerate (Phase 2). |
| `MissingDaysModal.tsx` | Centered amber overlay listing missing Mon–Fri days before submission (Phase 2). |
| `SubmitWeekButton.tsx` | "Submit week" button with missing-days guard (Phase 2). |
| `SubmittedBadge.tsx` | "Submitted ✓" green badge shown after submission (Phase 2). |

### Hours page
- [app/(app)/hours/page.tsx](../app/(app)/hours/page.tsx) — Server component. Parallel-fetches user profile, project memberships (with tags), month locks, and current week's entries. Passes to `HoursShell` as props (no loading flash on first paint).

---

## 2. Visual design system

All design decisions were applied across an initial implementation pass and two subsequent polish commits.

### Colour + brand
| Area | Decision |
|---|---|
| Primary colour | Brand forest green (`oklch(0.42 0.13 152)`) — buttons, focus rings, active states, today highlights. |
| Accent / secondary | Subtle green tint (`oklch(0.97 0.01 152)`) for hover states. |
| Main content background | Sage green `#E8F0E9` — makes white cards pop without using pure white everywhere. |
| Entry card tint | Each card has a per-project colour tint at `opacity-[0.07]` — gives visual identity without clashing with the text. |

### Layout
| Area | Decision |
|---|---|
| Sidebar | Dark `#0F1923` background, white nav, green AI tab accent. Collapsed default (52px, icon + tooltip). Expanded on click (220px, icon + label). Toggle persists to `localStorage("cadence_sidebar")`. |
| TopBar | Avatar circle (initials from email, `linear-gradient(135deg, #1B6B3A, #2D9A5A)`) with dropdown: My Profile, Account Settings, Help & Guide, Sign out. |
| Mobile nav | Bottom bar; active tab uses primary green. |
| Week calendar | Seven **floating** `rounded-2xl` cards in a CSS grid with `gap-2.5`, not a single connected table. The gap eliminates the spreadsheet feel. |
| Hero greeting | Gradient banner (`from-indigo-50/70 via-emerald-50/40`) with the user's first name in green and the week range below. Decorative accent dots. |
| View toggle | Segmented pill (bg-muted container, bg-background active pill) — Notion/Linear style. |

### Entry modal
- **Centered modal, not Sheet** — Started as a Sheet sliding from the right, then switched to a centered `fixed inset-0 bg-black/60` overlay. The centered pattern is more conventional for form entry, keeps the modal width constrained on wide screens, and gives the fields more vertical breathing room.
- **Field order** — Notes first (primary action), then Polish with AI, then Project, Logged time, Tag. Matches the "what did you work on?" top-of-form pattern.
- **Single-select tags** — users select exactly one tag per entry. The dropdown uses radio-button styling to make this clear. The DB still stores `tag_ids uuid[]` (max one item); billability is evaluated via `tags.is_billable`.
- **Formatted time display** — input shows "45m" not "0.75". Parses on blur; accepts "45m", "1h 30m", "1.5", etc.
- **Project search** — appears automatically when the user has more than 5 projects assigned.

---

## 3. Month-lock enforcement in UI

- On page load, `buildLockedSet(lockRows)` creates a `Set<"YYYY-MM">`.
- `isMonthLocked(date, lockedMonths)` gates every create/drag/edit action.
- Drag to a locked month → toast error, no request sent.
- Entry in a locked month → modal opens read-only (lock badge in header, no edit/delete/AI controls).
- Month banner appears above the calendar in locked months.
- **Submission is not a lock** — `status: 'submitted'` is a tracking badge only. Entries remain fully editable, draggable, and deletable until the month auto-locks at month end. See Phase 2 doc for submission flow.

---

## 4. How to verify (once Supabase is live)

### Setup
1. Confirm migrations 0001–0003 are applied.
2. Run `npm run db:seed` if not done yet.
3. As admin → `project_members`: add yourself to at least one project.
4. `npm run dev` → open `http://localhost:3000`.

### Functional checklist
| Check | How |
|---|---|
| Entry modal is centered overlay | Click "+ New" — centered card over dark backdrop |
| Project list shows only assigned projects | Only projects from `project_members` appear |
| Selecting a project highlights it | Click a project row — accent background + ✓ |
| Tags load per project | Change project — dropdown updates, selection cleared |
| Tag is single-select | Select a tag — others deselect; click again to deselect |
| Required tag shows badge | Org Activity project — "Required" label on All Hands |
| Logged time shows formatted | Edit a 0.75h entry — input shows "45m" |
| Quick buttons sync | Click "1h" — input shows "1h" |
| Create entry → persists after reload | Log, reload — entry there |
| Edit entry → changes saved | Click card, edit, save — updated |
| Delete entry | Open entry modal → Delete — entry gone |
| Copy to date → two entries | Copy to… → pick another date — both exist |
| Move to date → original gone | Move to… → original gone, appears on target |
| Drag Mon→Thu | Drag card between columns — persists on reload |
| Drag to locked month → toast, no move | Drag to a locked day — toast, entry stays |
| Submitted entry remains editable | Submit a week, then click an entry — edits normally |
| Submitted entry can be dragged | Drag a submitted entry — works |
| Locked month: no "+ New", read-only modal | Previous locked month — lock icon, modal read-only |
| Month banner | Navigate to locked month — amber banner shown |
| Floating day cards with gap | Week view — cards have visible gaps between them, no table lines |
| Today column has green tint | Current day column header has faint green tint |
| Entry cards have colour tint | Each entry card has a subtle project-colour background |
| Sidebar collapses to icon-only | Default 52px, icons + tooltips; click chevron to expand |
| Sidebar state persists | Expand, reload — stays expanded |
| Hero greeting shows first name | Hours page top — "Good morning, Pavitra! 👋" |
| Week total shown as green badge | Log entries — "Xh Ym this week" green pill in toolbar |
| Avatar initials in top bar | Top-right: gradient circle with initials e.g. "PP" |
| Avatar dropdown | Click avatar — My Profile / Account / Help / Sign out |
| Sage green content background | Main area is soft sage green `#E8F0E9` |
| Week navigation Monday start | `<` / `>` — week always starts Monday |
| Today button returns to current week | Navigate away, click Today |
| Month view search | Type a project name → only matching entries shown |
| Welcome card shown first time | New account (zero entries, dismissed_welcome=false) → card shown; dismiss → gone on reload |

---

## 5. Phase 2 features added to Hours tab

These live in the Hours tab but were delivered in Phase 2:

| Feature | Description |
|---|---|
| "Polish with AI" | Streams a one-sentence professional description from Claude (`claude-sonnet-4-6`). Accept / Edit / Regenerate / Discard. Accepted text saves with the entry. |
| Submit week | "Submit week" button in week view toolbar. Missing Mon–Fri days trigger a confirmation modal. On confirm: `submit_week()` RPC marks the week atomically; "Submitted ✓" badge replaces the button. |
| Submitted = status only | Submission is a tracking badge, not a lock. Entries remain editable until month-end auto-lock. |
| Notification bell | Live Supabase Realtime bell — `timesheet_submitted` notification appears immediately after submit. |

See [PHASE_2.md](./PHASE_2.md) for full implementation details.
