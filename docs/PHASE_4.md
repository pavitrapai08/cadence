# Phase 4 — People tab · Reports tab · CSV/PDF Export

> **Status:** Complete  
> **Branch:** `main`  
> **Commit:** `9a70db6`  
> **Depends on:** Phase 0 (schema, auth, seed) + Phase 1 (entry CRUD) + Phase 2 (submission) + Phase 3 (projects)

---

## What Phase 4 delivers

Three role-aware surfaces that turn raw time-entry data into actionable visibility:

1. **People tab** — team utilisation dashboard with a stacked bar chart and per-person mini weekly bars. Manager/admin only; employees see an access-restricted message.
2. **Clients & Projects report** — expandable client → project → week column table, capped at 12 weeks by default, with CSV and PDF export.
3. **Timesheets report** — flat entry list with date/status filters, a role-aware User column, a summary bar, and CSV/PDF export.

---

## 1. People tab

### Server component: `app/(app)/people/page.tsx`

Checks the user's role server-side. Employees receive a simple "Access restricted" message rather than the shell — this avoids loading spinner flash and prevents any accidental data exposure if the API call somehow succeeded. Managers and admins receive `<PeopleShell role={role} />`.

### Client component: `components/people/PeopleShell.tsx`

Owns all interactivity on the People tab.

**Hero banner** — gradient from `blue-50/70 via-emerald-50/40 to-[#F8FAFB]`, with active team member count and a "N submitted this week" sub-label computed from the latest fetch result.

**Toolbar:**
- Left pills: `All | Missing hours | Overtime`
- Right pills: `4 weeks | 8 weeks | 12 weeks` — changes the date range sent to the API

**Fetch pattern:** `useCallback` + `useEffect` — refetches whenever `rangePreset` changes. Loading/error/empty states all handled inline.

**Filtering (client-side on fetched data):**

| Filter | Logic |
|---|---|
| All | No filter |
| Missing hours | `!hasLoggedToday` OR `totalLogged < capacityHours × weeks.length × 0.5` |
| Overtime | `totalLogged > capacityHours × weeks.length` |

`hasLoggedToday` is computed server-side (entry date === today's ISO string) and returned per-user in the API response so the client doesn't need to re-derive it.

**Team chart:** `UtilisationChart` appears above the person list when data is loaded and at least one entry exists.

**Person list:** one `PersonRow` per user in `displayed` (filtered) set.

**Empty states:**
- Loading → spinner
- Fetch error → red card with Retry link
- Filter yields zero → contextual message ("No team members with missing hours", etc.)
- Manager with no direct reports → "No team members assigned to you yet"

---

## 2. UtilisationChart: `components/people/UtilisationChart.tsx`

Recharts `BarChart` + two stacked `Bar` segments + `ReferenceLine`.

| Element | Detail |
|---|---|
| X axis | `MMM d` label of each week's Monday (`format(parseISO(w), "MMM d")`) |
| Y axis | `${n}h` tick format; `axisLine=false tickLine=false` |
| Bar segments | Bottom: Billable (`#1B6B3A`); Top: Non-billable (`#D1FAE5 radius={[3,3,0,0]}`) |
| Reference line | Dashed grey (`#d1d5db`, `strokeDasharray="4 4"`) at `totalCapacity` = sum of all users' `capacityHours` |
| Tooltip | Custom: Capacity · Logged · Billable % · Non-billable hours · Free capacity |
| Legend | Three inline chips below the chart: ■ Billable · ■ Non-billable · ⊣ Capacity |
| Empty state | "No hours logged in this period" text at chart height |

**Data computation** (in `PeopleShell`): for each week, sum `hours` and `billable` across all users' `weeklyData`, compute `nonBillable = max(0, hours − billable)`.

---

## 3. PersonRow: `components/people/PersonRow.tsx`

Each row is a white `rounded-xl` card with four zones:

**Avatar + name (left, 160px fixed):**
- Green gradient avatar circle showing the first two letters of `fullName ?? email.split('@')[0]`
- Name truncated; role label below in `text-[11px] text-gray-400 capitalize`

**Weekly mini-bars (centre, flex-fill):**
- One `MiniBar` per week — a `h-9 w-4` rounded column
- Bar fill height = `min(hours / capacityHours × 100, 100)%`
- Colour: `bg-emerald-400` (≤75% full), `bg-emerald-500` (≥75%), `bg-amber-400` (over capacity)
- Each bar has a tooltip via the `title` attribute: `"Week N: Xh Ym / 40h capacity"`

**Numeric stats (right, hidden on mobile):**

| Column | Logic |
|---|---|
| Logged | Sum over selected weeks; amber colour if over total capacity |
| Capacity | `capacityHours × weeks.length` (uses per-user value, never hardcoded 40) |
| Billable % | `Math.round(totalBillable / totalLogged × 100)` |

**Submission badge (far right):**
- `CheckCircle2 · Submitted` in `emerald-50/emerald-700`
- `Clock · Pending` in `amber-50/amber-600`

---

## 4. API route: `GET /api/reports/people`

**Auth:** Manager or admin only — returns 403 for employees.

**Query params:**

| Param | Default | Notes |
|---|---|---|
| `dateFrom` | 4 weeks ago (Monday) | ISO date string |
| `dateTo` | Next Monday (exclusive) | Exclusive upper bound |

**Logic:**
1. Role check — 403 if employee
2. Query users: `is_active = true`; managers add `.eq("manager_id", user.id)` filter (uses per-user manager assignment, never a hardcoded list)
3. Parallel fetch: all `tags` (for billability set), all `time_entries` for those users in range, `timesheets` for the current week (for submission status)
4. Build ordered weeks list using `lib/week.ts` helpers (ISO Monday start)
5. Per-user: bucket entries into weeks, compute `hours` and `billable` per week; compute `hasLoggedToday` from entry dates vs today's ISO string
6. Return `{ data: { users: PersonUtilisation[], weeks: string[] } }`

**Billability computation** (mirrors `entry_is_billable` SQL helper):
- Build `Set<string>` of tag IDs where `is_billable = true`
- For each entry: billable iff `tag_ids.some(tid => billableTagIds.has(tid))`
- All decimal sums use `round2()` (`Math.round(n × 100) / 100`) — never `toFixed()`

---

## 5. Clients & Projects report

### Client component: `components/reports/ClientReport.tsx`

**Hero banner** — violet/emerald gradient matching the reports design language.

**Summary bar** (above table, shown when data is loaded):
- Client count · Project count · Total hours
- `ExportButton` on the right

**Table structure:**

```
Client name          | Jun 2 | Jun 9 | Jun 16 | … | Total
  ↕ (toggle row)    |       |       |        |   |
  ⬤ Project name   |  —    |  8h   |  3h    | … |  11h
  ⬤ Project name   | 12h   |  5h   |  —     | … |  17h
```

- **Client rows** — `bg-gray-50`, bold name with a `ChevronDown/Right` icon; clicking toggles project rows. Week cells show the client's sum for that week. Total is the overall sum.
- **Project rows** — `pl-10` indent, project colour dot, per-week hours. A dash (`—`) appears for weeks with no hours (lighter grey to reduce visual noise).
- Both row types are sticky-left for the name column on horizontal scroll (`sticky left-0`).

**Horizontal scroll:** the entire table is wrapped in `overflow-x-auto` — at 375px the table scrolls within its container; the page body never scrolls horizontally.

**12-week cap:** the route returns at most 12 weeks of columns by default. If the requested range exceeds 12 weeks, the API returns a `cappedNote` string (e.g. "Showing last 12 of 20 weeks"). The component renders this as an amber info line above the table.

### Client component: `app/(app)/reports/clients/page.tsx`

Trivially thin — `export default function ClientsReportPage() { return <ClientReport />; }`. All data fetching and state lives in `ClientReport`.

---

## 6. API route: `GET /api/reports/clients`

**Auth:** All authenticated users; Supabase RLS automatically scopes time entries by role (employees see only their own entries, managers see team, admins see all).

**Query params:**

| Param | Default | Notes |
|---|---|---|
| `dateFrom` | 12 weeks ago (Monday) | ISO date string |
| `dateTo` | Next Monday (exclusive) | |
| `clientId` | — | Optional client filter |

**Logic:**
1. Fetch entries with joined `project(id, name, colour, external_id, client(id, name))`
2. Filter by `clientId` if provided (client-side on the already-fetched result set)
3. Build weeks list; bucket each entry into its week by scanning weeks in reverse (most-recent first break)
4. Aggregate: `clientMap` → `Map<clientId, { projects: Map<projectId, { weeklyHours: Map<weekStart, number> }> }>`
5. Serialise: cap displayed weeks to `slice(-12)`, compute `totalHours` per project and client, sort by total descending
6. Return `{ data: { clients: ClientReportRow[], weeks: string[], cappedNote: string | null } }`

Entries whose project has no client are bucketed under `clientId = "__none__"` / `clientName = "No client"` — no entries are silently dropped.

---

## 7. Timesheets report

### Client component: `components/reports/TimesheetReport.tsx`

**Hero banner** — slate/emerald gradient.

**Role-context banner:** blue `bg-blue-50` info bar shown to managers and admins only:
> "Showing entries for your entire organisation / team. Employees see only their own entries without the User column."

**Filters (top row):**
- `dateFrom` / `dateTo` date inputs (defaults to the current calendar month)
- Status `<select>`: All statuses · Draft · Submitted
- Sent as query params to `GET /api/reports/timesheets` on every change (via `useEffect` on `filters`)

**Summary bar** (shown when data loaded and entries > 0):

| Item | Value |
|---|---|
| Entries | `summary.entryCount` |
| People | `summary.peopleCount` (manager/admin only) |
| Projects | `summary.projectCount` |
| Total | `formatHours(summary.totalHours)` |
| Export | `ExportButton` |

**Table columns:**

| Column | Notes |
|---|---|
| Date | `MMM d, yyyy`; `whitespace-nowrap` |
| User | **Manager/admin only** — `userFullName ?? email.split('@')[0]`; truncated to 140px |
| Project | Colour dot + truncated name (max 180px) |
| Hours | Right-aligned, `formatHours` |
| Note | `ai_description` preferred; falls back to `raw_notes`; italic "no note" in grey |
| Tags | Comma-joined tag names; hidden at `< lg` breakpoint |
| Status | `Submitted` emerald pill · `Draft` amber pill |

Note and Tags columns are hidden at smaller breakpoints (`hidden md:table-cell` / `hidden lg:table-cell`) so the table is readable on mobile without requiring horizontal scroll.

**500-row cap:** the API applies `.limit(500)`. No silent truncation — if data is capped, the user can narrow the date range.

### Client component: `app/(app)/reports/timesheets/page.tsx`

Trivially thin — delegates all logic to `TimesheetReport`.

---

## 8. API route: `GET /api/reports/timesheets`

**Auth:** All authenticated users; RLS scopes rows automatically.

**Query params:**

| Param | Default | Notes |
|---|---|---|
| `dateFrom` | First of current month | |
| `dateTo` | First of next month (exclusive) | |
| `status` | — | `draft` or `submitted` |
| `projectId` | — | Filters to a single project |
| `tagId` | — | Client-side filter after DB fetch (array contains) |

**Logic:**
1. Select entries with `user:users(id, email, full_name)` + `project:projects(id, name, colour)` joins, ordered `date DESC`, limit 500
2. Apply `status` and `projectId` filters in the Supabase query (pushed to DB)
3. Apply `tagId` filter client-side (Postgres array-contains isn't directly available via Supabase JS `filter`)
4. Collect all unique tag IDs from the result set; batch-fetch tag names in one query; build `tagNameMap`
5. Resolve `note = ai_description || raw_notes` (polish-first, then raw)
6. Compute `summary` from the result array (no second DB round-trip)
7. Return `{ data: { entries: TimesheetEntryRow[], summary, role } }` — `role` tells the client whether to show the User column

---

## 9. ExportButton: `components/reports/ExportButton.tsx`

Both CSV and PDF are generated entirely in the browser (no server round-trip). Libraries are **dynamically imported** (`await import("papaparse")`, `await import("jspdf")`) so they don't appear in the initial page bundle.

**CSV** — `Papa.unparse(data, { header: true, quotes: true })` where `data` is the rows mapped through the `columns` array (using `col.label` as the header, `col.key` to look up the value). Downloaded via `URL.createObjectURL(blob)`.

**PDF** — `new jsPDF({ orientation: "landscape" })` + `(doc as any).autoTable(...)`:
- Header row: DF brand green (`fillColor: [27, 107, 58]`) with white bold text
- Body: 7.5pt font, alternating `[248, 250, 251]` row tint
- File title + export date printed above the table
- Saved via `doc.save(filename + ".pdf")`

**Props interface (`ExportButtonProps`):**

```ts
interface ExportButtonProps {
  rows: Record<string, unknown>[];   // pre-formatted data rows
  columns: ExportColumn[];           // { key: string; label: string }[]
  filename: string;                  // base filename, no extension
  disabled?: boolean;
}
```

Callers (ClientReport, TimesheetReport) build `exportRows` and `exportColumns` from their own data — the button has no knowledge of the domain shape. This makes it fully reusable for Phase 5 and beyond.

---

## 10. Types added to `lib/types.ts`

| Type | Fields | Used by |
|---|---|---|
| `PersonWeeklyData` | `weekStart, hours, billable` | `PersonUtilisation` |
| `PersonUtilisation` | `userId, fullName, email, role, capacityHours, weeklyData[], totalLogged, totalBillable, submittedThisWeek, hasLoggedToday` | PeopleShell, PersonRow, UtilisationChart, `/api/reports/people` |
| `ProjectWeeklyHours` | `projectId, projectName, colour, externalId, totalHours, weeklyHours: Record<string, number>` | `ClientReportRow`, ClientReport |
| `ClientReportRow` | `clientId, clientName, totalHours, projects: ProjectWeeklyHours[]` | ClientReport, `/api/reports/clients` |
| `TimesheetEntryRow` | `id, date, userId, userFullName, userEmail, projectId, projectName, projectColour, hours, note, tagNames[], status` | TimesheetReport, `/api/reports/timesheets` |
| `TimesheetReportSummary` | `entryCount, peopleCount, projectCount, totalHours` | TimesheetReport |

---

## 11. Files added / changed

| File | Type | Notes |
|---|---|---|
| `lib/types.ts` | MODIFIED | Added 6 Phase 4 types |
| `app/(app)/people/page.tsx` | MODIFIED | Replaced placeholder; role check + `PeopleShell` |
| `app/(app)/reports/clients/page.tsx` | MODIFIED | Replaced placeholder; renders `ClientReport` |
| `app/(app)/reports/timesheets/page.tsx` | MODIFIED | Replaced placeholder; renders `TimesheetReport` |
| `app/api/reports/people/route.ts` | NEW | GET utilisation — manager/admin only |
| `app/api/reports/clients/route.ts` | NEW | GET client/project/week aggregation — all authenticated |
| `app/api/reports/timesheets/route.ts` | NEW | GET flat entry list — all authenticated (RLS-scoped) |
| `components/people/UtilisationChart.tsx` | NEW | Recharts stacked bar + capacity reference line |
| `components/people/PersonRow.tsx` | NEW | Mini weekly bars, stats, submission badge |
| `components/people/PeopleShell.tsx` | NEW | Data fetching, range/filter controls, person list |
| `components/reports/ExportButton.tsx` | NEW | Dynamic import CSV + PDF, reusable columns interface |
| `components/reports/ClientReport.tsx` | NEW | Expandable client/project table + summary + export |
| `components/reports/TimesheetReport.tsx` | NEW | Role-aware entry table + filters + summary + export |

---

## 12. Design decisions

**People tab is manager/admin only at the server level.** The access check happens in the server component before `PeopleShell` is rendered, so there is no flash of restricted content, no client-side guard, and no risk of the API being called by an employee — the People API route additionally enforces the 403 server-side in case someone calls it directly.

**Capacity is per-user, never hardcoded.** Every utilisation calculation uses `users.capacity_hours` (default 40, configurable per user by an admin). The "Overtime" filter compares `totalLogged > capacityHours × weeks.length` — if a user has a 20h/week contract, their threshold is 80h over a 4-week range, not 160h.

**UtilisationChart: team aggregate, not per-person.** The chart at the top of the People tab shows the whole team's billable/non-billable split per week and the total team capacity reference line. Per-person detail is in the `PersonRow` mini-bars, keeping the main chart readable regardless of team size.

**Clients report: server aggregation, not client-side grouping.** The `Map<clientId, Map<projectId, Map<weekStart, number>>>` structure is built in the API route, not in the client component. The component receives a serialised `ClientReportRow[]` — it only handles display and state. This keeps `ClientReport.tsx` free of business logic and makes the export rows easy to construct (a flat nested loop over the already-aggregated structure).

**Timesheets report: `role` returned in the API response.** Rather than the client fetching its own role separately, the timesheets route returns the caller's `role` alongside the entries. This means the client can decide whether to render the User column in a single render pass, with no extra round-trip or loading flicker.

**Export via dynamic import.** `papaparse` (20 kB) and `jspdf` + `jspdf-autotable` (~300 kB combined) are loaded only when the user clicks Export. This keeps the initial page bundle for the two report pages under 120 kB (first load JS).

**ExportButton is data-agnostic.** Callers construct `rows` and `columns` in their own domain — the button has no knowledge of clients or timesheets. The same component will be used in Phase 5 without modification.

---

## 13. Testing checklist

### People tab — access control
- [ ] Employee navigating to `/people` → "Access restricted" message, no data loaded
- [ ] Manager navigating to `/people` → sees only direct reports (those with `manager_id = current user`)
- [ ] Admin navigating to `/people` → sees all active users
- [ ] `GET /api/reports/people` with an employee session → 403

### People tab — utilisation chart
- [ ] Chart renders stacked bars when hours exist
- [ ] Billable segment is dark green, non-billable is light green
- [ ] Dashed reference line appears at the correct total capacity level
- [ ] Tooltip on hover shows Capacity · Logged · Billable % · Non-billable · Free capacity
- [ ] "No hours logged in this period" empty state when no entries in range

### People tab — person rows
- [ ] One row per team member
- [ ] Mini-bars count matches the selected week range (4/8/12)
- [ ] Bars proportional to each user's individual `capacity_hours` (not a hardcoded 40)
- [ ] Amber bar colour when a user's weekly hours exceed their capacity
- [ ] Submitted badge shown for users who submitted this week; Pending for those who haven't
- [ ] Logged/capacity/billable% stats correct (cross-check against DB entries)

### People tab — filters
- [ ] "4 weeks" → 4 mini-bars per row; "12 weeks" → 12 mini-bars per row
- [ ] "Missing hours" → hides users who have logged today and are not under-capacity
- [ ] "Overtime" → shows only users over capacity for the selected range; hides others
- [ ] Switching filters does not trigger a refetch (client-side only)

### Clients & Projects report
- [ ] Table renders with client rows and collapsed/expanded project sub-rows
- [ ] Click client row → toggles project rows open/closed
- [ ] Week column count is 12 or fewer (even for wider date ranges)
- [ ] Capped-note banner shows when the range exceeds 12 weeks
- [ ] Dash (—) shown in weeks with no hours for that project
- [ ] Total column sums match the per-week values
- [ ] Horizontal scroll works at 375px; sticky left column stays visible
- [ ] Summary bar: correct client count, project count, total hours
- [ ] CSV export: downloads `cadence-clients-report.csv`; opens cleanly in Excel
- [ ] PDF export: downloads `cadence-clients-report.pdf`; autotable renders correctly with green header row
- [ ] Export disabled when no data

### Clients & Projects report — role scoping
- [ ] Employee sees only their own hours aggregated (not team totals)
- [ ] Manager sees team hours
- [ ] Admin sees all hours

### Timesheets report
- [ ] Employee: no User column visible; heading confirms "Your time entries"
- [ ] Manager/admin: User column visible; role-context banner shown
- [ ] Date range defaults to current calendar month
- [ ] "Submitted" filter → shows only `status = 'submitted'` entries
- [ ] "Draft" filter → shows only `status = 'draft'` entries
- [ ] Summary bar: correct entry count, project count, total hours
- [ ] "People" count appears in summary only for manager/admin
- [ ] Note column: shows `ai_description` when present; falls back to `raw_notes`; "no note" italic otherwise
- [ ] Tags column hidden on mobile; visible at lg+ breakpoint
- [ ] Horizontal scroll at mobile — page does not scroll horizontally
- [ ] CSV export: User column present/absent based on role
- [ ] PDF export: same role-awareness; renders autotable cleanly

### Export button
- [ ] CSV and PDF buttons disabled when no rows (filter yields empty)
- [ ] Spinner shown on the clicked format button while generating
- [ ] Toast "CSV downloaded." / "PDF downloaded." after success
- [ ] CSV opens without garbled characters (UTF-8 BOM)
- [ ] PDF: header row green, body rows alternate tint, filename matches page

### RLS
- [ ] Employee cannot read another employee's time entries via `/api/reports/timesheets`
- [ ] Manager cannot read entries of users not in their direct reports
- [ ] Admin can read all entries
