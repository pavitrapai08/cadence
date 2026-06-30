import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function err(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

// Palette for items that have no colour of their own (clients)
const PALETTE = [
  "#4C9EEB", "#2D9A5A", "#F5A623", "#9B59B6", "#E74C3C",
  "#1ABC9C", "#F39C12", "#3498DB", "#E91E63", "#607D8B",
];

type RawEntry = {
  hours: number;
  tag_ids: string[];
  project: {
    id: string;
    name: string;
    colour: string;
    client: { id: string; name: string } | null;
  } | null;
};

/** GET /api/reports/summary?dateFrom=&dateTo=&status=&projectId=&tagId=&userId=
 *  Returns totals grouped by client and project for the dashboard donut charts.
 *  Also returns filter option lists so the dashboard can populate its dropdowns.
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

  // Fetch entries — RLS scopes to role automatically
  let query = supabase
    .from("time_entries")
    .select(
      "hours, tag_ids, project:projects(id, name, colour, client:clients(id, name))"
    )
    .gte("date", dateFrom)
    .lt("date", dateTo);

  if (statusFilter) query = query.eq("status", statusFilter);
  if (projectId) query = query.eq("project_id", projectId);
  if (userId && role !== "employee") query = query.eq("user_id", userId);

  const { data: rawEntries, error: dbErr } = await query;
  if (dbErr) return err(500, "db_error", dbErr.message);

  let entries = (rawEntries ?? []) as unknown as RawEntry[];

  // Tag filter is done client-side (array contains)
  if (tagId) {
    entries = entries.filter((e) => (e.tag_ids ?? []).includes(tagId));
  }

  const totalHours = round2(entries.reduce((s, e) => s + e.hours, 0));

  // Group by client
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
      id,
      name,
      colour: PALETTE[idx % PALETTE.length],
      hours,
      percentage: totalHours > 0 ? Math.round((hours / totalHours) * 100) : 0,
    }))
    .sort((a, b) => b.hours - a.hours);

  // Group by project (projects have their own colour)
  const projMap = new Map<string, { name: string; colour: string; hours: number }>();
  for (const e of entries) {
    const pid = e.project?.id ?? "__none__";
    if (!projMap.has(pid)) {
      projMap.set(pid, {
        name: e.project?.name ?? "Unknown",
        colour: e.project?.colour ?? "#888",
        hours: 0,
      });
    }
    const p = projMap.get(pid)!;
    p.hours = round2(p.hours + e.hours);
  }
  const byProject = Array.from(projMap.entries())
    .map(([id, { name, colour, hours }]) => ({
      id,
      name,
      colour,
      hours,
      percentage: totalHours > 0 ? Math.round((hours / totalHours) * 100) : 0,
    }))
    .sort((a, b) => b.hours - a.hours);

  // Available projects for filter dropdown (derived from result set)
  const projFilterMap = new Map<string, { id: string; name: string }>();
  entries
    .filter((e) => e.project)
    .forEach((e) =>
      projFilterMap.set(e.project!.id, { id: e.project!.id, name: e.project!.name })
    );
  const availableProjects = Array.from(projFilterMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  // Available tags for filter dropdown
  const tagIdSet = new Set<string>();
  entries.forEach((e) => (e.tag_ids ?? []).forEach((t) => tagIdSet.add(t)));
  const allTagIds = Array.from(tagIdSet);
  let availableTags: { id: string; name: string }[] = [];
  if (allTagIds.length > 0) {
    const { data: tags } = await supabase
      .from("tags")
      .select("id, name")
      .in("id", allTagIds);
    availableTags = (tags ?? []).sort((a, b) => a.name.localeCompare(b.name));
  }

  // Available users — manager/admin only, for "Anyone" filter
  let availableUsers: { id: string; email: string; full_name: string | null }[] = [];
  if (role !== "employee") {
    let uq = supabase
      .from("users")
      .select("id, email, full_name")
      .eq("is_active", true);
    if (role === "manager") uq = uq.eq("manager_id", user.id);
    const { data: users } = await uq;
    availableUsers = users ?? [];
  }

  return NextResponse.json({
    data: {
      totalHours,
      byClient,
      byProject,
      availableProjects,
      availableTags,
      availableUsers,
      role,
    },
  });
}
