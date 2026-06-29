import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/projects/mine
 * Returns only the projects the current user is a member of,
 * with their tag_group and tags (sorted by sort_order).
 * Used to populate the project dropdown in EntryModal.
 */
export async function GET() {
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

  // Get the project IDs the user belongs to
  const { data: memberships, error: memberErr } = await supabase
    .from("project_members")
    .select("project_id")
    .eq("user_id", user.id);

  if (memberErr) {
    return NextResponse.json(
      { error: { code: "db_error", message: memberErr.message } },
      { status: 500 }
    );
  }

  const projectIds = (memberships ?? []).map((m) => m.project_id);
  if (projectIds.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const { data, error } = await supabase
    .from("projects")
    .select(
      `id, name, colour, external_id, tag_group_id,
       tag_group:tag_groups(
         id, name,
         tags(id, name, is_billable, is_required, sort_order)
       )`
    )
    .in("id", projectIds)
    .eq("is_active", true)
    .order("name");

  if (error) {
    return NextResponse.json(
      { error: { code: "db_error", message: error.message } },
      { status: 500 }
    );
  }

  interface SortableTag { sort_order: number }
  interface RawTG { tags: SortableTag[] }

  // Sort tags by sort_order inside each project
  const sorted = (data ?? []).map((p) => {
    const tg = (p.tag_group as unknown) as RawTG | null;
    return {
      ...p,
      tag_group: tg
        ? { ...(tg as object), tags: [...(tg.tags ?? [])].sort((a, b) => a.sort_order - b.sort_order) }
        : null,
    };
  });

  return NextResponse.json({ data: sorted });
}
