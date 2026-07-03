import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function err(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

type RawEntry = {
  id: string;
  date: string;
  hours: number;
  raw_notes: string | null;
  ai_description: string | null;
  tag_ids: string[];
  status: "draft" | "submitted";
  user: { id: string; email: string; full_name: string | null } | null;
  project: { id: string; name: string; colour: string } | null;
};

/** GET /api/reports/timesheets?dateFrom=&dateTo=&status=&projectId=&tagId=
 *  All authenticated users; RLS scopes rows automatically.
 *  Returns role in response so the client can decide whether to show User column.
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
  const nextMonthDate = new Date(y, now.getMonth() + 1, 1);
  const defaultTo = nextMonthDate.toISOString().slice(0, 10);

  const dateFrom = url.searchParams.get("dateFrom") ?? defaultFrom;
  const dateTo = url.searchParams.get("dateTo") ?? defaultTo;
  const statusFilter = url.searchParams.get("status");
  const projectId = url.searchParams.get("projectId");
  const tagId = url.searchParams.get("tagId");

  // RLS automatically scopes: employee=own rows, manager=team rows, admin=all
  let query = supabase
    .from("time_entries")
    .select(
      `id, date, hours, raw_notes, ai_description, tag_ids, status,
       user:users(id, email, full_name),
       project:projects(id, name, colour)`
    )
    .gte("date", dateFrom)
    .lt("date", dateTo)
    .order("date", { ascending: false })
    .limit(500);

  if (statusFilter) query = query.eq("status", statusFilter);
  if (projectId) query = query.eq("project_id", projectId);

  const { data: rawEntries, error: dbErr } = await query;
  if (dbErr) return err(500, "db_error", dbErr.message);

  let entries = (rawEntries ?? []) as unknown as RawEntry[];

  // Tag filter: client-side after fetching (array contains check)
  if (tagId) {
    entries = entries.filter((e) => (e.tag_ids ?? []).includes(tagId));
  }

  // Resolve tag names for all tag_ids in the result set
  const tagIdSet = new Set<string>();
  entries.forEach((e) => (e.tag_ids ?? []).forEach((t) => tagIdSet.add(t)));
  const allTagIds = Array.from(tagIdSet);
  const tagNameMap = new Map<string, string>();
  if (allTagIds.length > 0) {
    const { data: tags } = await supabase
      .from("tags")
      .select("id, name")
      .in("id", allTagIds);
    for (const t of tags ?? []) tagNameMap.set(t.id, t.name);
  }

  const result = entries.map((e) => ({
    id: e.id,
    date: e.date,
    userId: e.user?.id ?? "",
    userFullName: e.user?.full_name ?? null,
    userEmail: e.user?.email ?? "",
    projectId: e.project?.id ?? "",
    projectName: e.project?.name ?? "",
    projectColour: e.project?.colour ?? "#1B6B3A",
    hours: e.hours,
    note: e.ai_description || e.raw_notes || null,
    tagNames: (e.tag_ids ?? [])
      .map((tid) => tagNameMap.get(tid) ?? "")
      .filter(Boolean),
    status: e.status,
  }));

  const summary = {
    entryCount: result.length,
    peopleCount: new Set(result.map((e) => e.userId)).size,
    projectCount: new Set(result.map((e) => e.projectId)).size,
    totalHours: round2(result.reduce((s, e) => s + e.hours, 0)),
  };

  return NextResponse.json({ data: { entries: result, summary, role } });
}
