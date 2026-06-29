import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/entries?weekStart=YYYY-MM-DD
 * Returns all entries for the current user in the Mon–Sun week.
 */
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const weekStart = searchParams.get("weekStart");
  if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "weekStart (YYYY-MM-DD) required" } },
      { status: 400 }
    );
  }

  // weekStart is Monday; end is the following Monday (exclusive)
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("time_entries")
    .select("*")
    .eq("user_id", user.id)
    .gte("date", weekStart)
    .lt("date", weekEndStr)
    .order("date")
    .order("created_at");

  if (error) {
    return NextResponse.json(
      { error: { code: "db_error", message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}

/**
 * POST /api/entries
 * Body: { projectId, date, hours, rawNotes?, tagIds?, aiDescription? }
 * Validates project membership and tag ownership before insert.
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const body = await req.json();
  const { projectId, date, hours, rawNotes, tagIds = [], aiDescription } = body as {
    projectId: string;
    date: string;
    hours: number;
    rawNotes?: string;
    tagIds?: string[];
    aiDescription?: string;
  };

  if (!projectId || !date || typeof hours !== "number" || hours <= 0) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "projectId, date, hours (>0) required" } },
      { status: 400 }
    );
  }

  // Validate project membership (RLS also enforces this, but explicit is clearer)
  const { data: membership } = await supabase
    .from("project_members")
    .select("project_id")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Not a member of this project" } },
      { status: 403 }
    );
  }

  // Validate every tagId belongs to this project's tag_group
  if (tagIds.length > 0) {
    const { data: project } = await supabase
      .from("projects")
      .select("tag_group_id")
      .eq("id", projectId)
      .single();

    if (project?.tag_group_id) {
      const { data: validTags } = await supabase
        .from("tags")
        .select("id")
        .eq("tag_group_id", project.tag_group_id)
        .in("id", tagIds);

      if (!validTags || validTags.length !== tagIds.length) {
        return NextResponse.json(
          { error: { code: "bad_request", message: "One or more tags do not belong to this project" } },
          { status: 400 }
        );
      }
    }
  }

  const { data, error } = await supabase
    .from("time_entries")
    .insert({
      user_id: user.id,
      project_id: projectId,
      date,
      hours,
      raw_notes: rawNotes ?? null,
      ai_description: aiDescription ?? null,
      tag_ids: tagIds,
      status: "draft",
    })
    .select()
    .single();

  if (error) {
    const code = error.message.includes("month_locked") ? "month_locked" : "db_error";
    const status = code === "month_locked" ? 409 : 500;
    return NextResponse.json({ error: { code, message: error.message } }, { status });
  }

  return NextResponse.json({ data }, { status: 201 });
}
