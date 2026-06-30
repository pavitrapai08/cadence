# Phase 2 — AI Narrative · Timesheet Submission · Live Notifications

> **Status:** Complete  
> **Branch:** `main`  
> **Depends on:** Phase 0 (schema, auth) + Phase 1 (calendar UI, entry CRUD)

---

## What Phase 2 delivers

Three interconnected features that make Cadence feel alive and professional:

1. **AI Narrative ("Polish with AI")** — streaming AI description generator inside the entry modal
2. **Timesheet Submission** — one-click week submission with missing-days guardrail
3. **Live Notification Bell** — Supabase Realtime-powered bell that updates without page refresh

---

## 1. AI Narrative — "Polish with AI"

### Route: `app/api/ai/narrative/route.ts`

| Property | Value |
|---|---|
| Runtime | `nodejs` (required by `@anthropic-ai/sdk`) |
| Max duration | 60 s |
| Model | `claude-sonnet-4-6` |
| Max tokens | 100 (one sentence cap) |
| Auth | Supabase session required — returns 401 otherwise |
| Response | `text/plain` streaming |

**System prompt** (from CLAUDE.md §8):
> "You are a professional timesheet assistant for DecisionFoundry, a data analytics consulting firm. Turn rough notes into ONE concise, professional timesheet sentence. Be specific and factual. No preamble. Maximum one sentence."

**Security:** `ANTHROPIC_API_KEY` is server-only — never `NEXT_PUBLIC_`. The route checks auth before touching the AI client.

### Component: `components/hours/AIPolishSection.tsx`

Replaces the Phase 1 disabled "Polish with AI" placeholder. States:

| State | UI |
|---|---|
| `idle` | "Polish with AI" text button (disabled if no notes) |
| `streaming` | Emerald card · Loader2 spinner · cursor-blink on growing text |
| `done` | Emerald card · Accept / Edit / Regenerate / Discard actions |

- **Accept** → calls `onAccept(suggestion)` → writes into `aiDescription` state in EntryModal → saved to DB on "Save entry"
- **Edit** → inline textarea with the suggestion pre-filled; Accept saves the edited text
- **Regenerate** → re-runs the stream, discards previous suggestion
- **Discard (×)** → returns to `idle`

**Error handling:** If the stream fails, a sonner toast shows "AI unavailable — try again later." The modal stays open and functional.

**Button is disabled while saving** — `disabled={saving}` prop prevents triggering AI during form save.

### EntryModal wiring

- `const [aiDescription] = useState` → `const [aiDescription, setAiDescription] = useState`
- `<AIPolishSection rawNotes={rawNotes} projectName={...} onAccept={setAiDescription} disabled={saving} />`
- Accepted description displays with a Sparkles icon in an `emerald-50` chip above the AI section

---

## 2. Timesheet Submission

### Route: `app/api/timesheets/route.ts`

- `POST { weekStart: "YYYY-MM-DD" }` → calls `supabase.rpc("submit_week", { p_week_start })`
- The DB function atomically: flips all week entries to `status='submitted'`, creates the `timesheets` row, inserts a `timesheet_submitted` notification for the user
- Returns `{ data: { submitted: true, weekStart } }` or `{ error: { code, message } }`

### Components

**`SubmittedBadge.tsx`** — Shown in the week toolbar after a successful submit:
- `CheckCircle2` icon + "Submitted ✓" text
- `emerald-50` background with `emerald-200` border

**`MissingDaysModal.tsx`** — Centered amber overlay when Mon–Fri has gaps:
- Amber `AlertTriangle` header
- Missing days as amber-100 pill chips (`format(day, "EEEE, MMM d")`)
- "Go back" and "Submit anyway" buttons
- Confirmed: `submit_week` RPC is called; declined: modal closes

**`SubmitWeekButton.tsx`** — Green "Submit week" button in week view toolbar:
1. Computes missing Mon–Fri days via `weekdaysMonFri(weekStart)` vs entry dates
2. If any missing → opens `MissingDaysModal`; else calls `doSubmit()` directly
3. `doSubmit()` → `POST /api/timesheets` → on success: `toast.success` + `onSubmitted()`

### HoursShell wiring

- `isWeekSubmitted` computed from entries: `entries.length > 0 && entries.every(e => e.status === 'submitted')`
- `handleSubmitted()` → optimistically flips all entries to `submitted` in local state
- Week toolbar: replaces the standalone `{formatHours(weekTotal)} this week` span with a flex row that includes both the total and either `<SubmittedBadge />` or `<SubmitWeekButton />`
- Navigating to another week re-fetches entries from DB — `isWeekSubmitted` resolves correctly from the fetched data

**Behaviour per CLAUDE.md §10 (and the submit-as-status-only decision from Phase 2):**
- Submission is a **status badge, not a lock** — `status: 'submitted'` is a tracking indicator only. Entries remain fully editable and draggable until the month auto-locks at month end.
- Submit button is replaced by the `SubmittedBadge` immediately after submit
- Notification is created server-side by `submit_week` RPC
- `openEntry()` in `HoursShell` gates `readonly` on month lock only — **never on `status === 'submitted'`**

---

## 3. Live Notification Bell

### `components/layout/NotificationBell.tsx`

**Init flow (async IIFE inside `useEffect`):**
1. Gets current user via `supabase.auth.getUser()`
2. Fetches last 10 notifications ordered by `created_at DESC`
3. Sets unread count from `data.filter(n => !n.read).length`
4. Opens Realtime channel `notifications:<uid>` filtered to `user_id=eq.<uid>`

**On INSERT event:**
- Prepends new notification to list (capped at 10)
- Increments unread badge

**"Mark all read":**
- Calls `supabase.from('notifications').update({ is_read: true }).eq('user_id', uid).eq('is_read', false)`
- Optimistically updates local state
- Button only shown when `unread > 0`

**Security (per CLAUDE.md §11):**
- Realtime filter: `user_id=eq.<uid>` — a user can never receive another user's events
- Notifications RLS (from TECH_SPEC §4) restricts SELECT to the row owner

**UI details:**
- Unread count badge, capped display at "9+"
- Unread notifications have `emerald-50/50` row tint and a solid `#1B6B3A` dot
- Read notifications have a `gray-200` dot
- Relative time labels (e.g. "2h ago", "Jun 24")
- Empty state: Bell icon + "No notifications yet."

---

## Files added / changed

| File | Type | Notes |
|---|---|---|
| `app/api/ai/narrative/route.ts` | NEW | Streaming narrative, `runtime='nodejs'`, `maxDuration=60` |
| `app/api/timesheets/route.ts` | NEW | Submit week via `submit_week` RPC |
| `components/hours/AIPolishSection.tsx` | NEW | Streaming AI polish UI |
| `components/hours/MissingDaysModal.tsx` | NEW | Missing-days warning overlay |
| `components/hours/SubmittedBadge.tsx` | NEW | Week submitted green badge |
| `components/hours/SubmitWeekButton.tsx` | NEW | Submit button with missing-days guard |
| `components/hours/EntryModal.tsx` | MODIFIED | Wired AIPolishSection; `setAiDescription` |
| `components/hours/HoursShell.tsx` | MODIFIED | `isWeekSubmitted`, `handleSubmitted`, toolbar |
| `components/layout/NotificationBell.tsx` | MODIFIED | Realtime sub, unread count, notification list |

---

## Testing checklist

- [ ] Entry modal: "Polish with AI" button disabled when notes are empty
- [ ] Entry modal: streaming text appears character-by-character in emerald card
- [ ] Entry modal: Accept → description appears in emerald chip above; saves to DB
- [ ] Entry modal: Edit → can modify suggestion before accepting
- [ ] Entry modal: Regenerate → new stream replaces old suggestion
- [ ] Entry modal: AI failure (no API key in preview) → toast, no crash
- [ ] Submit week: full week → no modal, submits directly
- [ ] Submit week: missing Mon–Fri days → amber modal with correct day pills
- [ ] Submit week: "Go back" → modal closes, entries unchanged
- [ ] Submit week: "Submit anyway" → submits, badge appears, entries read-only
- [ ] Submit week: navigate to next week + back → badge still shown (from DB)
- [ ] Notification bell: `timesheet_submitted` notification appears after submit
- [ ] Notification bell: unread badge increments in real time (Realtime INSERT)
- [ ] Notification bell: "Mark all read" clears badge and dot indicators
- [ ] RLS: user A cannot trigger user B's Realtime events
