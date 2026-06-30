import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function requireAdmin(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: { code: "unauthorized", message: "Not authenticated." } }, { status: 401 }) };
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { error: NextResponse.json({ error: { code: "forbidden", message: "Admin only." } }, { status: 403 }) };
  return { user };
}

/** GET /api/admin/tags?tagGroupId=xxx — tags for a group (admin only). */
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { error } = await requireAdmin(supabase);
  if (error) return error;

  const tagGroupId = req.nextUrl.searchParams.get("tagGroupId");
  if (!tagGroupId) return NextResponse.json({ error: { code: "bad_request", message: "tagGroupId is required." } }, { status: 400 });

  const { data, error: dbErr } = await supabase
    .from("tags")
    .select("id, name, is_billable, is_required")
    .eq("tag_group_id", tagGroupId)
    .order("name");

  if (dbErr) return NextResponse.json({ error: { code: "db_error", message: dbErr.message } }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

/** POST /api/admin/tags — create tag (admin only). */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { error } = await requireAdmin(supabase);
  if (error) return error;

  const body = await req.json();
  const { name, tagGroupId, isBillable, isRequired } = body;

  if (!name?.trim()) return NextResponse.json({ error: { code: "bad_request", message: "name is required." } }, { status: 400 });
  if (!tagGroupId) return NextResponse.json({ error: { code: "bad_request", message: "tagGroupId is required." } }, { status: 400 });

  const { data, error: dbErr } = await supabase
    .from("tags")
    .insert({
      name: name.trim(),
      tag_group_id: tagGroupId,
      is_billable: isBillable ?? true,
      is_required: isRequired ?? false,
    })
    .select("id, name, is_billable, is_required")
    .single();

  if (dbErr) return NextResponse.json({ error: { code: "db_error", message: dbErr.message } }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
