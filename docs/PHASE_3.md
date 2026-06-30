# Phase 3 — Projects tab

> **Status:** Complete  
> **Branch:** `main`  
> **Commit:** `892a8bb`  
> **Depends on:** Phase 0 (schema, auth, seed) + Phase 1 (entry CRUD) + Phase 2 (submission, notifications)

---

## What Phase 3 delivers

Three interconnected surfaces that give every role a clear picture of their project portfolio:

1. **Projects list page** — role-scoped card grid with search, filter, and admin management
2. **Project detail page** — stat widgets + billable/NB donut + weekly bar chart + tag usage bars
3. **Admin create/edit modal** — full project form including live member assignment

---

## 1. Projects list page

### Server component: `app/(app)/projects/page.tsx`

Fetches all relevant projects server-side, so there is no loading flash on first paint. Role-based query logic:

| Role | Query |
|---|---|
| Admin | All projects (no filter) |
| Employee / Manager | Projects where a `project_members` row exists for the current user |

Joins `clients` and `tag_groups` in the select so the list page and modal have full data without a second round-trip. Renders `<ProjectsShell>` (client component) with pre-fetched data.

### Client component: `components/projects/ProjectsShell.tsx`

Owns all interactivity on the list page.

**Hero banner** — same gradient pattern as the Hours tab (`from-indigo-50/70 via-emerald-50/40 to-[#F8FAFB]`) with decorative accent dots and an active-project count.

**Toolbar:**
- Full-width search box (filters by project name, client name, or external ID)
- Segmented filter pill: `Active | All | Archived` (default: Active)
- Admin-only "New project" green button — opens `ProjectCreateEditModal`

**Card grid:** responsive CSS grid (`sm:grid-cols-2 lg:grid-cols-3`), each slot a `ProjectCard`.

**Empty states:**
- No results from search → "No projects match your search"
- No projects at all (admin) → "No projects found" + "Create your first project" link

**Archive toggle:** calls `PATCH /api/projects/[id]` with `{ isActive: false/true }`, optimistically updates local state, and shows a sonner toast.

---

## 2. Project card: `components/projects/ProjectCard.tsx`

Each card is a `Link` to `/projects/[id]`.

| Element | Detail |
|---|---|
| Left stripe | 6 px solid border in the project's colour (`absolute inset-y-0 left-0 w-1.5`) |
| Project name | Bold, truncated, turns primary green on hover |
| Client name | Muted sub-label below the name |
| External ID | Monospace `font-mono text-[10px]` grey label |
| Active badge | `emerald-50/emerald-700` when active · `gray-100/gray-500` when archived |
| Admin three-dot menu | `Pencil` → opens edit modal · `Archive/ArchiveRestore` → toggles `is_active` |

The three-dot menu uses a custom inline dropdown (not shadcn `DropdownMenu`) with a `fixed inset-0` click-outside overlay so it closes cleanly without needing a portal.

---

## 3. Project detail page

### Server component: `app/(app)/projects/[id]/page.tsx`

All stats are **computed server-side** — no loading spinners on the detail page. Sequence:

1. Parallel-fetch user profile (role) + project row
2. `notFound()` if project doesn't exist or query errors
3. Parallel-fetch tags (for the project's `tag_group_id`) + time entries (RLS-scoped)
4. Compute all five stat groups in the server component (see below)
5. Render `<ProjectDetail>` with `project`, `stats`, `isAdmin`

**Stats computation (pure JS, server-side):**

| Stat | Logic |
|---|---|
| `totalHours` | Sum of all RLS-visible entries for this project |
| `thisWeekHours` | Entries where `date >= thisWeekISO && date < nextWeekISO` |
| `thisMonthHours` | Entries where `date` is in the current calendar month/year |
| `billableHours` | `splitHoursByBillable()` from `lib/billable.ts` — entry is billable iff ≥1 tag has `is_billable=true` |
| `nonBillableHours` | Complement: `total - billable` |
| `lastFiveWeeks` | 5-element array `{ weekStart: string, hours: number }`, oldest → newest, for the bar chart |
| `tagUsage` | For each tag ID appearing in entries, sum hours; join to tag name; sort desc; top 10 |

`billable + nonBillable === total` exactly, because sums use decimal `numeric(5,2)` values via `round2()`.

**RLS note:** employees see only their own entries (their personal contribution to the project); managers see team entries; admins see all. The stats page reflects whatever the calling user's RLS policy allows.

### Client component: `components/projects/ProjectDetail.tsx`

**Header row:**
- `← Projects` back link to `/projects`
- Project colour dot + name + client + external ID + description
- Active/Archived badge
- Admin: "Edit" button → opens `ProjectCreateEditModal`

**Stat widgets (3-column grid):**
```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Total logged│ │  This week  │ │  This month │
│  234h 30m   │ │    8h       │ │   42h       │
└─────────────┘ └─────────────┘ └─────────────┘
```
Each is a white `rounded-2xl` card (`StatCard` sub-component).

**Charts row (md:grid-cols-2):**
- Left card: `DonutChart` — billable vs non-billable
- Right card: `WeeklyBarChart` — last 5 weeks

**Empty state** (when `totalHours === 0`): full-width dashed card — "No hours logged yet. Start tracking time on this project to see charts here."

**Tag breakdown:** `TagUsageBars` card, shown only when `tagUsage.length > 0`.

**Admin archive panel:** "Archive project" / "Restore project" section at the bottom — inline `PATCH` on click, toast feedback.

---

## 4. Charts

### `components/projects/DonutChart.tsx`

Recharts `PieChart` + `Pie` with `innerRadius=44 outerRadius=64`.

| Feature | Detail |
|---|---|
| Billable colour | `#1B6B3A` (brand forest green) |
| Non-billable colour | `#D1FAE5` (light emerald) |
| Padding angle | 2° when both slices present; 0° when only one |
| Centre label | Billable % + "billable" sub-label (pointer-events-none `absolute` overlay) |
| Tooltip | `formatHours(value)` |
| Legend | Two rows (Billable · Non-billable) + total; lives beside the donut |
| Empty state | "No hours logged yet" text (rendered instead of chart) |

### `components/projects/WeeklyBarChart.tsx`

Recharts `BarChart` + `Bar` (`radius={[4,4,0,0]}`, `maxBarSize=40`).

| Feature | Detail |
|---|---|
| X axis | Week label: `MMM d` of the week-start Monday |
| Y axis | `${n}h` tick format; `axisLine=false tickLine=false` |
| Grid | Horizontal dashes only (`vertical={false}`) |
| Bar colour | `#1B6B3A` |
| Tooltip | `formatHours(value)` |
| Empty state | "No hours in the last 5 weeks" text |

### `components/projects/TagUsageBars.tsx`

Custom HTML bars — no recharts (keeps the component lightweight for a simple ranking display).

- Each row: tag name (160px truncated) · filled bar (relative to the highest-hours tag) · `formatHours` right-aligned
- Bar fill uses the project's own colour (`projectColour` prop)
- Bar width animates on mount via `transition-all duration-500`
- Empty state: "No tag data yet — add tags when logging entries."

---

## 5. Admin create/edit modal: `components/projects/ProjectCreateEditModal.tsx`

Centered `fixed inset-0 bg-black/60` overlay (same pattern as `EntryModal`). Lazy-loads its dropdown data when it mounts.

**Form fields:**

| Field | Input type | Notes |
|---|---|---|
| Name | Text | Required — blocks submit if empty |
| Client | `<select>` | Fetched from `GET /api/admin/clients` |
| External ID | Text (monospace) | Optional |
| Tag group | `<select>` | Fetched from `GET /api/admin/tag-groups` |
| Budget hours | Number | Optional; stored as `numeric` |
| Description | Textarea | Optional |
| Colour | Preset swatches (12 colours) | Active swatch has a scale+border highlight |

**Colour presets:**
```
#1B6B3A  #2D9A5A  #0891B2  #0E7490
#6366F1  #8B5CF6  #EC4899  #F97316
#EAB308  #DC2626  #1D4ED8  #92400E
```

**Member management (edit mode only):**
- Current members listed as rows with name + email + `Trash2` remove button
- `POST /api/projects/[id]/members { userId }` on add; `DELETE` on remove
- Instant optimistic update — no reload needed
- Search box filters `allUsers` (from `GET /api/admin/users`) by name or email, excluding existing members
- User rows show `full_name ?? email` + role badge

**On mount:** fetches clients, tag groups, users in parallel (`Promise.all`). In edit mode, additionally fetches current members from `GET /api/projects/[id]/members`.

**Submit:**
- Create → `POST /api/projects`
- Edit → `PATCH /api/projects/[id]`
- On success: `onSaved(project)` callback → `ProjectsShell` updates local state; toast confirms

---

## 6. API routes

### `GET /api/projects`

Returns projects visible to the caller. Role-scoped in code (RLS is also in effect):
- Admin: all projects, no filter
- Others: only projects with a matching `project_members` row

Supabase query chains `.in("id", projectIds)` by reassigning the query variable (`let query = ...; if (ids) query = query.in(...)`) — note: mutating without reassignment is a silent bug in Supabase JS (the filter is dropped).

Response shape: `ProjectFull[]` with nested `client` and `tag_group`.

### `POST /api/projects`

Admin-only. Creates a project row and returns the full `ProjectFull` shape. Returns 201 on success.

### `GET /api/projects/[id]`

Returns `{ project: ProjectFull, stats: ProjectStats }`. Computes the same five stat groups as the server component (used by client-side callers; the detail page uses the server component path instead).

### `PATCH /api/projects/[id]`

Admin-only. Accepts any subset of `{ name, clientId, externalId, description, colour, tagGroupId, budgetHours, isActive }`. Only provided keys are applied (no accidental nulling of fields).

### `GET/POST/DELETE /api/projects/[id]/members`

All admin-only. Shared `requireAdmin()` helper function avoids repeating the role check.

- `GET` — returns member rows joined from `users` via `users:user_id(id, email, full_name)`
- `POST { userId }` — inserts into `project_members`
- `DELETE { userId }` — removes the specific row

### `GET /api/admin/users`

Admin-only. Returns `{ id, email, full_name, role }` for all active users, ordered by email. Used by the member picker in the modal.

### `GET /api/admin/clients`

Admin-only. Returns all active clients ordered by name.

### `GET /api/admin/tag-groups`

Admin-only. Returns all tag groups ordered by name.

---

## 7. Types added to `lib/types.ts`

| Type | Fields | Used by |
|---|---|---|
| `Client` | `id, name, is_active` | `ProjectFull`, modal |
| `ProjectFull` | All project DB fields + nested `client` + `tag_group` | List page, detail page, modal |
| `ProjectStats` | `totalHours, thisWeekHours, thisMonthHours, billableHours, nonBillableHours, lastFiveWeeks[], tagUsage[]` | Detail page, API route |
| `UserBasic` | `id, email, full_name, role` | Member picker, admin users route |

---

## 8. Files added / changed

| File | Type | Notes |
|---|---|---|
| `lib/types.ts` | MODIFIED | Added `Client`, `ProjectFull`, `ProjectStats`, `UserBasic` |
| `app/(app)/projects/page.tsx` | MODIFIED | Replaced placeholder with server-fetched `ProjectsShell` |
| `app/(app)/projects/[id]/page.tsx` | NEW | Server-computed stats + `ProjectDetail` |
| `app/api/projects/route.ts` | NEW | GET list + POST create |
| `app/api/projects/[id]/route.ts` | NEW | GET detail+stats + PATCH update |
| `app/api/projects/[id]/members/route.ts` | NEW | GET/POST/DELETE members |
| `app/api/admin/users/route.ts` | NEW | GET all active users (admin) |
| `app/api/admin/clients/route.ts` | NEW → MODIFIED | GET + POST create (admin) |
| `app/api/admin/tag-groups/route.ts` | NEW → MODIFIED | GET + POST create (admin) |
| `app/api/admin/tags/route.ts` | NEW | GET by tagGroupId + POST create (admin) |
| `components/projects/ProjectCard.tsx` | NEW | Colour stripe card with admin menu |
| `components/projects/ProjectsShell.tsx` | NEW | Search, filter, grid, admin controls |
| `components/projects/ProjectDetail.tsx` | NEW | Header, stats, charts, archive toggle |
| `components/projects/DonutChart.tsx` | NEW → MODIFIED | Hover centre-swap instead of tooltip |
| `components/projects/WeeklyBarChart.tsx` | NEW | Recharts last-5-weeks bar |
| `components/projects/TagUsageBars.tsx` | NEW | Custom HTML tag ranking bars |
| `components/projects/TagsManager.tsx` | NEW | Inline tag list + add-tag form (admin) |
| `components/projects/ProjectCreateEditModal.tsx` | NEW → MODIFIED | Inline create for client, tag group, tags |

---

## 9. Design decisions

**Stats are server-computed** — there is no client-side loading spinner on the detail page. The page renders fully on the first paint with real data. Charts appear immediately or show their empty state.

**RLS shapes the stats** — the detail page doesn't filter entries by user manually. RLS does it automatically. Employees see their personal contribution; managers see their team; admins see all. This is consistent with the rest of Cadence's data model.

**`ProjectFull` vs `Project`** — the entry modal still uses the leaner `Project` type (no `client`, `description`, `is_active`). `ProjectFull` is used only where those extra fields are needed, avoiding a breaking change to `mine/route.ts` and `EntryModal`.

**Supabase query mutation** — Supabase JS query methods return a new modified query object (they do not mutate in place). The projects list route uses `let query = ...; query = query.in(...)` to correctly apply the member ID filter for non-admin users. The silent bug (calling `.in()` without reassignment) was caught in code review before commit.

**Donut chart — no tooltip** — Recharts renders its `Tooltip` inside the SVG at the cursor position. When hovering the donut ring, the tooltip lands over the absolutely-positioned centre label, obscuring it. The fix: no `<Tooltip>` at all. Instead, hovering a slice dims the other slice and swaps the centre text to show that slice's hours + name. Hovering a legend row does the same. The legend is the "outside label" — it already shows exact values for both slices with full text; no label-line geometry needed.

**Inline entity creation in the modal** — admins can create new clients and tag groups without leaving the project form. A `+ New` button beside each select toggles an inline input row (name → Save/Cancel). On save the new entity is POSTed, added to the dropdown, and auto-selected. A `TagsManager` component appears below the tag group selector whenever a group is selected, showing existing tags and an add-tag row (name + Billable/Non-billable toggle). All three creation flows go through admin-only API routes that require `role === 'admin'` — the same guard as all other admin routes.

---

## 10. Testing checklist

### Projects list
- [ ] Employee sees only assigned projects, not all 13
- [ ] Admin sees all 13 projects
- [ ] "Active" filter hides archived projects; "Archived" shows only archived; "All" shows both
- [ ] Search by project name → only matching cards shown
- [ ] Search by client name → matching cards shown
- [ ] Search by external ID → matching card shown
- [ ] "New project" button not visible for non-admin
- [ ] Click project card → navigates to `/projects/[id]`

### Project cards
- [ ] Left stripe matches the project's colour exactly
- [ ] Client name shown below project name
- [ ] External ID shown in monospace
- [ ] Active badge is green; archived badge is grey
- [ ] Admin three-dot opens menu with Edit + Archive/Restore
- [ ] Archive → card opacity 60% + badge changes; Restore → card back to full opacity

### Project detail
- [ ] Back arrow navigates to `/projects`
- [ ] Header shows colour dot, name, client, external ID, active badge
- [ ] Total, this week, this month stats are correct (manually cross-check against entries)
- [ ] Donut: billable + non-billable = total (no rounding gap)
- [ ] Donut: centre shows correct billable % at rest
- [ ] Donut: hovering a slice dims the other and swaps centre to show that slice's hours + name
- [ ] Hovering a legend row triggers the same centre swap on the donut
- [ ] No tooltip appears inside or over the donut centre label
- [ ] Weekly bar chart: 5 bars; current week reflects recent entries
- [ ] Tag breakdown bars: widest bar = tag with most hours
- [ ] Empty state shown when project has no entries
- [ ] Admin "Edit" button opens modal pre-filled with current values
- [ ] Admin archive/restore panel visible only to admin

### Create / edit modal (admin)
- [ ] Opens with empty form for create; pre-filled for edit
- [ ] Clients dropdown populated from DB
- [ ] Tag groups dropdown populated from DB
- [ ] Colour swatch highlights the currently selected colour
- [ ] Name field required — Save disabled without it
- [ ] Create → new card appears in projects list
- [ ] Edit → updated values reflected on card and detail page
- [ ] Budget hours and description are optional and save correctly

### Inline client creation
- [ ] "+ New" button beside Client select swaps to an inline input
- [ ] Save creates the client, adds it to the dropdown, and auto-selects it
- [ ] Cancel returns to the dropdown with no change
- [ ] New client persists: re-opening the modal shows it in the dropdown

### Inline tag group creation
- [ ] "+ New" button beside Tag group select works the same as client
- [ ] After creating a tag group, the TagsManager section appears immediately
- [ ] New tag group persists in the dropdown

### Tags manager
- [ ] Selecting an existing tag group shows its tags with Billable/Non-billable badges
- [ ] "Add tag" row: typing a name and pressing Enter or clicking + creates the tag
- [ ] Billable/Non-billable toggle correctly sets `is_billable` on the new tag
- [ ] Newly created tags appear in the list immediately
- [ ] Tags manager is hidden when no tag group is selected
- [ ] Non-admin cannot access `/api/admin/tags` (403)

### Member management (edit modal)
- [ ] Current members listed with name + email
- [ ] Remove member → row disappears immediately
- [ ] Search users → list filters by name or email
- [ ] Add user → appears in members list; user can now see project in entry modal
- [ ] Already-member users do not appear in the "add" list

### RLS
- [ ] Employee cannot POST to `/api/projects` (403)
- [ ] Employee cannot PATCH `/api/projects/[id]` (403)
- [ ] Employee cannot access `/api/admin/*` routes (403)
- [ ] Employee's detail page shows only their own entry stats (not team total)
