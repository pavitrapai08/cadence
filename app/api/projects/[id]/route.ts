import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { splitHoursByBillable } from "@/lib/billable";
import { weekStart, weekStartISO, shiftWeek } from "@/lib/week";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** GET /api/projects/[id] — project detail + computed stats. */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Not authenticated." } },
      { status: 401 }
    );
  }

  const { data: project, error: projErr } = await supabase
    .from("projects")
    .select(
      "id, name, colour, external_id, description, budget_hours, is_active, client_id, tag_group_id, client:clients(id, name, is_active), tag_group:tag_groups(id, name)"
    )
    .eq("id", params.id)
    .single();

  if (projErr || !project) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Project not found." } },
      { status: 404 }
    );
  }

  // Fetch tags (for billable split + tag usage labels)
  const tagGroupId = (project as { tag_group_id: string | null }).tag_group_id;
  const { data: tags } = tagGroupId
    ? await supabase
        .from("tags")
        .select("id, name, is_billable")
        .eq("tag_group_id", tagGroupId)
    : { data: [] as { id: string; name: string; is_billable: boolean }[] };

  const billableTagIds = new Set(
    (tags ?? []).filter((t) => t.is_billable).map((t) => t.id)
  );

  // Fetch entries (RLS-scoped — employee sees own, admin sees all)
  const { data: entries } = await supabase
    .from("time_entries")
    .select("hours, tag_ids, date")
    .eq("project_id", params.id);

  const allEntries = (entries ?? []) as { hours: number; tag_ids: string[]; date: string }[];

  // Billable split
  const { billable, nonBillable, total } = splitHoursByBillable(
    allEntries.map((e) => ({ hours: e.hours, tagIds: e.tag_ids })),
    billableTagIds
  );

  // This week / this month
  const now = new Date();
  const thisWeekISO = weekStartISO(weekStart(now));
  const nextWeekISO = weekStartISO(shiftWeek(weekStart(now), 1));

  const thisWeekHours = round2(
    allEntries
      .filter((e) => e.date >= thisWeekISO && e.date < nextWeekISO)
      .reduce((s, e) => s + e.hours, 0)
  );

  const thisMonthHours = round2(
    allEntries
      .filter((e) => {
        const d = new Date(e.date + "T00:00:00");
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, e) => s + e.hours, 0)
  );

  // Last 5 weeks (oldest → newest for chart)
  const lastFiveWeeks = Array.from({ length: 5 }, (_, i) => {
    const ws = weekStartISO(shiftWeek(weekStart(now), i - 4));
    const we = weekStartISO(shiftWeek(weekStart(now), i - 3));
    return {
      weekStart: ws,
      hours: round2(
        allEntries
          .filter((e) => e.date >= ws && e.date < we)
          .reduce((s, e) => s + e.hours, 0)
      ),
    };
  });

  // Tag usage (top 10)
  const tagHours = new Map<string, number>();
  for (const entry of allEntries) {
    for (const tagId of entry.tag_ids) {
      tagHours.set(tagId, (tagHours.get(tagId) ?? 0) + entry.hours);
    }
  }
  const tagUsage = Array.from(tagHours.entries())
    .map(([tagId, hours]) => ({
      tagId,
      tagName: (tags ?? []).find((t) => t.id === tagId)?.name ?? "Unknown",
      hours: round2(hours),
    }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 10);

  return NextResponse.json({
    data: {
      project,
      stats: {
        totalHours: total,
        thisWeekHours,
        thisMonthHours,
        billableHours: billable,
        nonBillableHours: nonBillable,
        lastFiveWeeks,
        tagUsage,
      },
    },
  });
}

/** PATCH /api/projects/[id] — update project (admin only). */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Not authenticated." } },
      { status: 401 }
    );
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Admin only." } },
      { status: 403 }
    );
  }

  const body = await req.json();
  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.clientId !== undefined) patch.client_id = body.clientId;
  if (body.externalId !== undefined) patch.external_id = body.externalId?.trim() || null;
  if (body.description !== undefined) patch.description = body.description?.trim() || null;
  if (body.colour !== undefined) patch.colour = body.colour;
  if (body.tagGroupId !== undefined) patch.tag_group_id = body.tagGroupId;
  if (body.budgetHours !== undefined) patch.budget_hours = body.budgetHours;
  if (body.isActive !== undefined) patch.is_active = body.isActive;

  const { data, error } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", params.id)
    .select(
      "id, name, colour, external_id, description, budget_hours, is_active, client_id, tag_group_id, client:clients(id, name, is_active), tag_group:tag_groups(id, name)"
    )
    .single();

  if (error) {
    return NextResponse.json(
      { error: { code: "db_error", message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}
