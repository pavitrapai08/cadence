import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/entries/:id
 * Partial update. Validates tag ownership if tagIds or projectId changed.
 * Returns 403 if entry is submitted. DB trigger blocks locked months.
 */
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
      { error: { code: "unauthorized", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  // Confirm ownership + draft status
  const { data: existing } = await supabase
    .from("time_entries")
    .select("id, user_id, status, project_id")
    .eq("id", params.id)
    .single();

  if (!existing || existing.user_id !== user.id) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Entry not found" } },
      { status: 404 }
    );
  }
  if (existing.status === "submitted") {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Cannot edit a submitted entry" } },
      { status: 403 }
    );
  }

  const body = await req.json() as {
    projectId?: string;
    date?: string;
    hours?: number;
    rawNotes?: string | null;
    aiDescription?: string | null;
    tagIds?: string[];
  };

  const effectiveProjectId = body.projectId ?? existing.project_id;

  // Validate tags if supplied
  if (body.tagIds && body.tagIds.length > 0) {
    const { data: project } = await supabase
      .from("projects")
      .select("tag_group_id")
      .eq("id", effectiveProjectId)
      .single();

    if (project?.tag_group_id) {
      const { data: validTags } = await supabase
        .from("tags")
        .select("id")
        .eq("tag_group_id", project.tag_group_id)
        .in("id", body.tagIds);

      if (!validTags || validTags.length !== body.tagIds.length) {
        return NextResponse.json(
          { error: { code: "bad_request", message: "One or more tags do not belong to this project" } },
          { status: 400 }
        );
      }
    }
  }

  const patch: Record<string, unknown> = {};
  if (body.projectId !== undefined) patch.project_id = body.projectId;
  if (body.date !== undefined) patch.date = body.date;
  if (body.hours !== undefined) patch.hours = body.hours;
  if ("rawNotes" in body) patch.raw_notes = body.rawNotes;
  if ("aiDescription" in body) patch.ai_description = body.aiDescription;
  if (body.tagIds !== undefined) patch.tag_ids = body.tagIds;

  const { data, error } = await supabase
    .from("time_entries")
    .update(patch)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    const code = error.message.includes("month_locked") ? "month_locked" : "db_error";
    const status = code === "month_locked" ? 409 : 500;
    return NextResponse.json({ error: { code, message: error.message } }, { status });
  }

  return NextResponse.json({ data });
}

/**
 * DELETE /api/entries/:id
 * Deletes a draft entry owned by the current user.
 * DB trigger blocks deletion in locked months.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const { data: existing } = await supabase
    .from("time_entries")
    .select("id, user_id, status")
    .eq("id", params.id)
    .single();

  if (!existing || existing.user_id !== user.id) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Entry not found" } },
      { status: 404 }
    );
  }
  if (existing.status === "submitted") {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Cannot delete a submitted entry" } },
      { status: 403 }
    );
  }

  const { error } = await supabase
    .from("time_entries")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) {
    const code = error.message.includes("month_locked") ? "month_locked" : "db_error";
    const status = code === "month_locked" ? 409 : 500;
    return NextResponse.json({ error: { code, message: error.message } }, { status });
  }

  return new NextResponse(null, { status: 204 });
}
