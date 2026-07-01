import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function err(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

const PALETTE = [
  "#4C9EEB", "#2D9A5A", "#F5A623", "#9B59B6", "#E74C3C",
  "#1ABC9C", "#F39C12", "#3498DB", "#E91E63", "#607D8B",
];

// Returns the ISO date of the Monday on or before the given date string
function toWeekStart(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().slice(0, 10);
}

// All Monday-start weeks that overlap [from, to)
function weeksInRange(from: string, to: string): string[] {
  const weeks: string[] = [];
  const cur = new Date(toWeekStart(from));
  const end = new Date(to);
  while (cur < end) {
    weeks.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 7);
  }
  return weeks;
}

type RawEntry = {
  date: string;
  hours: number;
  tag_ids: string[];
  project: {
    id: string;
    name: string;
    colour: string;
    client: { id: string; name: string } | null;
  } | null;
};

/** GET /api/reports/summary
 *  Aggregates hours by client, project, tag, and week for the dashboard charts.
 *  Filter dropdowns (projects, tags) come from project assignments, not just
 *  the current result set — so they're always fully populated.
 */
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err(401, "unauthorized", "Not authenticated.");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = profile?.role ?? "employee";

  const url = req.nextUrl;
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const defaultFrom = `${y}-${m}-01`;
  const defaultTo = new Date(y, now.getMonth() + 1, 1).toISOString().slice(0, 10);

  const dateFrom = url.searchParams.get("dateFrom") ?? defaultFrom;
  const dateTo = url.searchParams.get("dateTo") ?? defaultTo;
  const statusFilter = url.searchParams.get("status");
  const projectId = url.searchParams.get("projectId");
  const tagId = url.searchParams.get("tagId");
  const userId = url.searchParams.get("userId");

  // ── 1. Fetch entries (RLS scopes automatically) ────────────────────────────
  let query = supabase
    .from("time_entries")
    .select(
      "date, hours, tag_ids, project:projects(id, name, colour, client:clients(id, name))"
    )
    .gte("date", dateFrom)
    .lt("date", dateTo);

  if (statusFilter) query = query.eq("status", statusFilter);
  if (projectId) query = query.eq("project_id", projectId);
  if (userId && role !== "employee") query = query.eq("user_id", userId);

  const { data: rawEntries, error: dbErr } = await query;
  if (dbErr) return err(500, "db_error", dbErr.message);

  let entries = (rawEntries ?? []) as unknown as RawEntry[];
  if (tagId) entries = entries.filter((e) => (e.tag_ids ?? []).includes(tagId));

  // ── 2. Collect tag IDs and fetch tag details ───────────────────────────────
  const tagIdSet = new Set<string>();
  entries.forEach((e) => (e.tag_ids ?? []).forEach((t) => tagIdSet.add(t)));
  const entryTagIds = Array.from(tagIdSet);

  // ── 3. Fetch available projects from assignments (not just entry result set) ──
  // eslint-disable-next-line prefer-const
  let [tagDetails, assignedProjects] = await Promise.all([
    entryTagIds.length > 0
      ? supabase
          .from("tags")
          .select("id, name, is_billable")
          .in("id", entryTagIds)
          .then((r) => r.data ?? [])
      : Promise.resolve([] as { id: string; name: string; is_billable: boolean }[]),

    role === "employee"
      ? supabase
          .from("project_members")
          .select("project:projects(id, name)")
          .eq("user_id", user.id)
          .then((r) =>
            (r.data ?? [])
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map((m: any) => m.project)
              .filter(Boolean) as { id: string; name: string }[]
          )
      : supabase
          .from("projects")
          .select("id, name")
          .eq("is_active", true)
          .then((r) => r.data ?? []),
  ]);

  const availableProjects = assignedProjects.sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  // ── 4. Fetch available tags grouped by tag group ──────────────────────────
  const projIdSet = new Set<string>(availableProjects.map((p) => p.id));
  const projIds = Array.from(projIdSet);
  let availableTagGroups: { id: string; name: string; tags: { id: string; name: string }[] }[] = [];
  if (projIds.length > 0) {
    const { data: tgRows } = await supabase
      .from("projects")
      .select("tag_group_id")
      .in("id", projIds)
      .not("tag_group_id", "is", null);
    const tgIdSet = new Set<string>();
    (tgRows ?? []).forEach((r) => r.tag_group_id && tgIdSet.add(r.tag_group_id));
    const tgIds = Array.from(tgIdSet);
    if (tgIds.length > 0) {
      const { data: tags } = await supabase
        .from("tags")
        .select("id, name, tag_group_id, tag_group:tag_groups(id, name)")
        .in("tag_group_id", tgIds)
        .order("sort_order");
      type TagWithGroup = { id: string; name: string; tag_group: { id: string; name: string } | null };
      const tgMap = new Map<string, { id: string; name: string; tags: { id: string; name: string }[] }>();
      ((tags ?? []) as unknown as TagWithGroup[]).forEach((t) => {
        const tg = t.tag_group;
        if (!tg) return;
        if (!tgMap.has(tg.id)) tgMap.set(tg.id, { id: tg.id, name: tg.name, tags: [] });
        tgMap.get(tg.id)!.tags.push({ id: t.id, name: t.name });
      });
      availableTagGroups = Array.from(tgMap.values());
    }
  }

  // ── 5. Build lookup maps ───────────────────────────────────────────────────
  const billableTagIds = new Set<string>(
    tagDetails.filter((t) => t.is_billable).map((t) => t.id)
  );
  const tagNameMap = new Map<string, string>(
    tagDetails.map((t) => [t.id, t.name])
  );

  const totalHours = round2(entries.reduce((s, e) => s + e.hours, 0));

  // ── 6. Aggregate by client ─────────────────────────────────────────────────
  const clientMap = new Map<string, { name: string; hours: number; idx: number }>();
  let ci = 0;
  for (const e of entries) {
    const cid = e.project?.client?.id ?? "__none__";
    const cname = e.project?.client?.name ?? "No client";
    if (!clientMap.has(cid)) clientMap.set(cid, { name: cname, hours: 0, idx: ci++ });
    const c = clientMap.get(cid)!;
    c.hours = round2(c.hours + e.hours);
  }
  const byClient = Array.from(clientMap.entries())
    .map(([id, { name, hours, idx }]) => ({
      id, name, colour: PALETTE[idx % PALETTE.length], hours,
      percentage: totalHours > 0 ? Math.round((hours / totalHours) * 100) : 0,
    }))
    .sort((a, b) => b.hours - a.hours);

  // ── 7. Aggregate by project ────────────────────────────────────────────────
  const projMap = new Map<string, { name: string; colour: string; hours: number }>();
  for (const e of entries) {
    const pid = e.project?.id ?? "__none__";
    if (!projMap.has(pid))
      projMap.set(pid, { name: e.project?.name ?? "Unknown", colour: e.project?.colour ?? "#888", hours: 0 });
    projMap.get(pid)!.hours = round2(projMap.get(pid)!.hours + e.hours);
  }
  const byProject = Array.from(projMap.entries())
    .map(([id, { name, colour, hours }]) => ({
      id, name, colour, hours,
      percentage: totalHours > 0 ? Math.round((hours / totalHours) * 100) : 0,
    }))
    .sort((a, b) => b.hours - a.hours);

  // ── 8. Aggregate by tag ────────────────────────────────────────────────────
  const tagHoursMap = new Map<string, { name: string; hours: number }>();
  for (const e of entries) {
    for (const tid of (e.tag_ids ?? [])) {
      const name = tagNameMap.get(tid);
      if (!name) continue;
      if (!tagHoursMap.has(tid)) tagHoursMap.set(tid, { name, hours: 0 });
      tagHoursMap.get(tid)!.hours = round2(tagHoursMap.get(tid)!.hours + e.hours);
    }
  }
  const byTag = Array.from(tagHoursMap.entries())
    .map(([id, { name, hours }], idx) => ({
      id, name, colour: PALETTE[idx % PALETTE.length], hours,
      percentage: totalHours > 0 ? Math.round((hours / totalHours) * 100) : 0,
    }))
    .sort((a, b) => b.hours - a.hours);

  // ── 9. Aggregate by week (with billable split) ─────────────────────────────
  const weeks = weeksInRange(dateFrom, dateTo);
  const weekMap = new Map<string, { hours: number; billable: number }>();
  weeks.forEach((w) => weekMap.set(w, { hours: 0, billable: 0 }));
  for (const e of entries) {
    const ws = toWeekStart(e.date);
    if (!weekMap.has(ws)) continue;
    const wk = weekMap.get(ws)!;
    const isBillable = (e.tag_ids ?? []).some((tid) => billableTagIds.has(tid));
    wk.hours = round2(wk.hours + e.hours);
    if (isBillable) wk.billable = round2(wk.billable + e.hours);
  }
  const byWeek = weeks.map((w) => ({
    weekStart: w,
    hours: weekMap.get(w)!.hours,
    billable: weekMap.get(w)!.billable,
  }));

  // ── 10. Available users (manager/admin only) ───────────────────────────────
  let availableUsers: { id: string; email: string; full_name: string | null }[] = [];
  if (role !== "employee") {
    let uq = supabase.from("users").select("id, email, full_name").eq("is_active", true);
    if (role === "manager") uq = uq.eq("manager_id", user.id);
    const { data: users } = await uq;
    availableUsers = users ?? [];
  }

  return NextResponse.json({
    data: { totalHours, byClient, byProject, byTag, byWeek, availableProjects, availableTagGroups, availableUsers, role },
  });
}
