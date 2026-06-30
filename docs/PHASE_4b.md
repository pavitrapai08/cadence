# Phase 4b — Reports Dashboard · Donut Charts · Filters · Week Navigation

> **Status:** Complete  
> **Branch:** `main`  
> **Commit:** `fa0cf95`  
> **Depends on:** Phase 4 (People tab, Reports tab, CSV/PDF export)

---

## What Phase 4b delivers

A major upgrade to the Reports tab that transforms it from a static table into a Timely-style interactive dashboard:

1. **Reports overview dashboard** (`/reports`) — modular chart cards, filter bar, month navigation, and quick links to the detailed sub-pages.
2. **Donut chart cards** — recharts `PieChart` donut for "Clients by Hours" and "Projects by Hours", each draggable and removable.
3. **Filter bar** — month navigation, State/Person/Project/Tag filter pills that re-fetch on change.
4. **Week-window navigation** on the Clients & Projects table — view 8 weeks at a time and slide the window prev/next instead of seeing all 12 at once.
5. **Shared sub-navigation** across all three report pages: Overview | Clients & Projects | Timesheets.

---

## 1. Reports dashboard page: `app/(app)/reports/page.tsx`

New server component (previously this route didn't exist — the sidebar linked directly to `/reports/clients`). Reads the user's role from Supabase and passes it to `ReportsDashboard` so the "Anyone" person filter is only shown to managers and admins.

---

## 2. ReportsDashboard: `components/reports/ReportsDashboard.tsx`

Client component that owns all dashboard state and interaction.

**Filter bar:**

| Control | Type | Behaviour |
|---|---|---|
| Month navigation | `< June 2025 >` prev/next buttons | Updates `dateFrom`/`dateTo`; triggers refetch |
| State | Pill `<select>` | All / Draft / Submitted; sent to API |
| Anyone | Pill `<select>` — **manager/admin only** | Lists the caller's accessible users; filters the summary to one person |
| Any project | Pill `<select>` | Populated from the projects present in the API result set |
| Any tag | Pill `<select>` | Populated from the tags present in the API result set |

All five filter controls derive their available options from the current summary response, so only relevant values are ever shown.

**"Add charts and tables" dropdown:**

Green pill button centred below the filter bar. Opens a 52px-wide panel listing available chart types. Each entry shows a check dot when the chart is currently visible. Clicking a type toggles it (add if absent, remove if present). Panel closes on outside click (controlled via `mousedown` on `document`).

Available types for V1:
- `clients` — Clients by Hours (donut)
- `projects` — Projects by Hours (donut)

**DnD card grid:**

```
DndContext (PointerSensor) + SortableContext (rectSortingStrategy)
  └─ grid: 1 col (mobile) / 2 cols (md+)
       └─ DonutChartCard × N  (each card is a sortable item via useSortable)
```

`arrayMove` from `@dnd-kit/sortable` reorders `widgets[]` state on drag end. No persistence — order resets on navigation.

**Widget state:**

```ts
type WidgetType = "clients" | "projects";
interface Widget { id: string; type: WidgetType; }

// Default (matches Timely defaults)
[{ id: "clients", type: "clients" }, { id: "projects", type: "projects" }]
```

**Quick-link cards** at the bottom: two cards linking to `/reports/clients` and `/reports/timesheets` with an ArrowRight hover animation.

---

## 3. DonutChartCard: `components/reports/DonutChartCard.tsx`

Draggable chart card powered by `useSortable` (`@dnd-kit/sortable`). 

**Layout:** `[drag handle :: ] [title] [by] [Hours]  ————  [X remove]`

**Recharts donut:**

| Property | Value |
|---|---|
| `innerRadius` | 52px |
| `outerRadius` | 72px |
| `paddingAngle` | 2 |
| `strokeWidth` | 0 (no border between slices) |
| Colour source | `item.colour` — hex from API (project colours from DB; client colours from server-side `PALETTE[]`) |

Centre label overlaid via absolute positioned div: `formatHours(totalHours)` in bold + `"N clients"` / `"N projects"` in small grey text below.

**Legend** (right of donut): coloured dot · truncated name · hours (right-aligned) · percentage (fixed 36px column). Top 8 items shown; remainder bundled as "Other" (colour `#D1D5DB`).

**Tooltip:** uses recharts built-in Tooltip with custom `formatter` (value cast through `any` to satisfy recharts' `ValueType` union) — shows formatted hours on hover.

**Drag handle:** `GripVertical` icon; uses `useSortable`'s `attributes` + `listeners` spread on a button. `touch-none` prevents scroll conflict on mobile.

---

## 4. Summary API: `GET /api/reports/summary`

**Auth:** All authenticated users; Supabase RLS scopes entries automatically.

**Query params:**

| Param | Default | Notes |
|---|---|---|
| `dateFrom` | First of current month | |
| `dateTo` | First of next month (exclusive) | |
| `status` | — | `draft` / `submitted` |
| `projectId` | — | Filters to a single project |
| `tagId` | — | Client-side after DB fetch (array contains) |
| `userId` | — | Manager/admin only; employee param is ignored |

**Aggregation:**

```
entries
  → group by client  → byClient[]  (colour from PALETTE[idx % 10])
  → group by project → byProject[] (colour from projects.colour)
```

Percentages are `Math.round(hours / totalHours × 100)`. Totals use `round2()` throughout to avoid decimal drift.

**Filter option lists returned in the same response:**
- `availableProjects` — derived from the result set (not a separate DB query); only shows projects that have at least one entry in the current filter context
- `availableTags` — resolved from unique `tag_ids` across the result set via one batch `tags` query
- `availableUsers` — manager/admin only; employees get `[]`; managers get their direct reports; admins get all active users

**Colour palette for clients** (clients have no `colour` column in the DB — palette is assigned by insertion order):

```ts
const PALETTE = [
  "#4C9EEB", "#2D9A5A", "#F5A623", "#9B59B6", "#E74C3C",
  "#1ABC9C", "#F39C12", "#3498DB", "#E91E63", "#607D8B",
];
```

---

## 5. Week-window navigation: `components/reports/ClientReport.tsx`

The Clients & Projects table previously rendered all 12 fetched weeks simultaneously, requiring significant horizontal scroll on any screen. Now:

```
const VISIBLE_WEEKS = 8;
const [windowStart, setWindowStart] = useState(0);

// Initialised to the rightmost window on data load:
setWindowStart(Math.max(0, total - VISIBLE_WEEKS));

const visibleWeeks = weeks.slice(windowStart, windowStart + VISIBLE_WEEKS);
```

**Navigation bar** (rendered only when `weeks.length > VISIBLE_WEEKS`):

```
[← Older]   Apr 13 – Jun 1, 2025   [Newer →]
```

- Prev/Next slide the window by 1 week. Buttons disable at the boundaries.
- The week range label uses `format(parseISO(w), "MMM d")` from date-fns for the displayed dates.
- The `Total` column always reflects the full 12-week total (not the visible window) so users can compare across windows without confusion.
- Export still exports all weeks (not the current window) — the full `weeks` array is passed to `buildExportRows/Columns`.

---

## 6. ReportsSubNav: `components/reports/ReportsSubNav.tsx`

Shared `"use client"` tab bar rendered on all three report pages. Uses `usePathname()` to highlight the active tab.

```tsx
const TABS = [
  { label: "Overview",            href: "/reports" },
  { label: "Clients & Projects",  href: "/reports/clients" },
  { label: "Timesheets",          href: "/reports/timesheets" },
];
```

Active tab: DF green `bg-[#1B6B3A] text-white` pill. Inactive: `text-gray-500 hover:bg-gray-100`.

Exact-match for `/reports` (so it doesn't also activate on `/reports/clients`); prefix-match for the two sub-pages.

---

## 7. Sidebar nav change

`components/layout/nav-items.ts`: Reports `href` changed from `/reports/clients` → `/reports`. The `matchPrefix: "/reports"` already covered all sub-pages, so active-state highlighting is unchanged across the whole reports area.

---

## 8. Types added to `lib/types.ts`

| Type | Fields | Used by |
|---|---|---|
| `ReportChartItem` | `id, name, colour, hours, percentage` | DonutChartCard, ReportsDashboard, `/api/reports/summary` |
| `ReportsSummaryData` | `totalHours, byClient[], byProject[], availableProjects[], availableTags[], availableUsers[], role` | ReportsDashboard, `/api/reports/summary` |

---

## 9. Files added / changed

| File | Type | Notes |
|---|---|---|
| `lib/types.ts` | MODIFIED | Added `ReportChartItem`, `ReportsSummaryData` |
| `components/layout/nav-items.ts` | MODIFIED | Reports href `/reports/clients` → `/reports` |
| `app/(app)/reports/page.tsx` | NEW | Server component; passes role to `ReportsDashboard` |
| `app/api/reports/summary/route.ts` | NEW | GET summary — all authenticated (RLS-scoped) |
| `components/reports/ReportsDashboard.tsx` | NEW | Dashboard with filters, DnD card grid, quick links |
| `components/reports/DonutChartCard.tsx` | NEW | Draggable recharts donut + legend |
| `components/reports/ReportsSubNav.tsx` | NEW | Shared Overview / Clients / Timesheets tab bar |
| `components/reports/ClientReport.tsx` | MODIFIED | Week-window navigation + sub-nav |
| `components/reports/TimesheetReport.tsx` | MODIFIED | Sub-nav added |

---

## 10. Design decisions

**Dashboard-first navigation.** The Reports tab now lands on an overview rather than jumping straight into the table. This mirrors Timely's UX and gives users a quick summary before they drill down.

**Filter options derived from the result set, not DB lookup.** `availableProjects` and `availableTags` in the summary response come from scanning the returned entries rather than querying the projects/tags tables separately. This means the dropdowns show only items that are actually relevant to the current date range and other active filters, preventing "0 results" frustration.

**Client colours are server-assigned by insertion order.** Clients have no `colour` column in the schema. Rather than store colours or ask the user to pick them, the summary route assigns palette colours deterministically by the order clients first appear in the result set. Within a single page session this is stable; across sessions the same client may get a different colour if a different client appears first. This is intentional — report colours are for visual distinction, not brand identity.

**8-week window with full-period totals.** The `Total` column in the Clients & Projects table always sums all 12 fetched weeks (the full `totalHours` per project), not just the 8 visible ones. This avoids a confusing total that changes as you slide the window.

**`any` cast on Tooltip formatter.** Recharts' TypeScript definitions for `Formatter` use a complex union (`Formatter<ValueType, NameType>`) that doesn't accept `(value: number) => [string, string]` without a cast. Using `any` here is the established pattern across the recharts community for custom formatters — the runtime behaviour is correct regardless of the TS inference.

---

## 11. Testing checklist

### Dashboard page
- [ ] `/reports` loads; two donut cards visible by default (Clients + Projects)
- [ ] Month `<` / `>` buttons step the month; cards re-fetch and re-render
- [ ] State filter "Submitted" → charts show only submitted entries
- [ ] Project filter → charts scope to that project (donut shows 1 item)
- [ ] Tag filter → charts scope to entries with that tag
- [ ] "Anyone" filter visible only to manager/admin; hidden for employees
- [ ] "Anyone" filter scopes charts to that person's entries
- [ ] Total hours pill in the filter bar updates with each filter change

### Add / remove charts
- [ ] Click "+ Add charts and tables" → panel opens
- [ ] Both Clients and Projects show a green dot (both active by default)
- [ ] Click "Clients" → Clients chart removed; panel shows no dot for Clients
- [ ] Click "Clients" again → Clients chart re-added
- [ ] Removing both → empty state "Click Add charts…" appears
- [ ] Clicking outside the menu → panel closes without state change

### Donut chart
- [ ] Donut segments proportional to hours; colours match legend
- [ ] Centre shows total hours + item count label
- [ ] Hover on segment → tooltip shows item name + formatted hours
- [ ] Legend: name truncates on narrow cards; hours and % always visible
- [ ] Items beyond 8 are bundled as "Other" in grey
- [ ] Empty state "No data for this period" when no entries in range

### Drag-to-reorder
- [ ] Drag Clients card over Projects → order swaps
- [ ] Drag Projects card over Clients → order swaps back
- [ ] Order change has no side effects (no refetch, data unchanged)

### Clients & Projects table — week navigation
- [ ] Default view shows the most-recent 8 weeks (rightmost window)
- [ ] Prev/Next buttons appear only when there are more than 8 weeks total
- [ ] "← Older" disabled at the leftmost window
- [ ] "Newer →" disabled at the rightmost window
- [ ] Sliding the window changes visible columns but not the Total column
- [ ] Export (CSV / PDF) includes all weeks (not just the visible 8)

### Sub-navigation
- [ ] All three report pages render the Overview | Clients & Projects | Timesheets tab bar
- [ ] Active tab highlighted in DF green; inactive tabs grey
- [ ] Clicking a tab navigates to the correct sub-page
- [ ] Sidebar still highlights "Reports" on all three sub-pages

### Role scoping
- [ ] Employee on `/reports` → "Anyone" filter absent; chart shows own hours only
- [ ] Manager on `/reports` → "Anyone" filter present; default shows team totals
- [ ] Admin on `/reports` → "Anyone" filter present; default shows org-wide totals
