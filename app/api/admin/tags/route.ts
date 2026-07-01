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

/** PATCH /api/admin/tags?tagId=xxx — update tag fields (admin only). */
export async function PATCH(req: NextRequest) {
  const supabase = createClient();
  const { error } = await requireAdmin(supabase);
  if (error) return error;

  const tagId = req.nextUrl.searchParams.get("tagId");
  if (!tagId) return NextResponse.json({ error: { code: "bad_request", message: "tagId is required." } }, { status: 400 });

  const body = await req.json();
  const update: Record<string, unknown> = {};
  if ("name" in body && body.name?.trim()) update.name = body.name.trim();
  if ("is_billable" in body) update.is_billable = Boolean(body.is_billable);
  if ("is_required" in body) update.is_required = Boolean(body.is_required);

  if (Object.keys(update).length === 0)
    return NextResponse.json({ error: { code: "bad_request", message: "No valid fields." } }, { status: 400 });

  const { data, error: dbErr } = await supabase
    .from("tags")
    .update(update)
    .eq("id", tagId)
    .select("id, name, is_billable, is_required")
    .single();

  if (dbErr) return NextResponse.json({ error: { code: "db_error", message: dbErr.message } }, { status: 500 });
  return NextResponse.json({ data });
}

/** DELETE /api/admin/tags?tagId=xxx — delete tag (admin only). */
export async function DELETE(req: NextRequest) {
  const supabase = createClient();
  const { error } = await requireAdmin(supabase);
  if (error) return error;

  const tagId = req.nextUrl.searchParams.get("tagId");
  if (!tagId) return NextResponse.json({ error: { code: "bad_request", message: "tagId is required." } }, { status: 400 });

  const { error: dbErr } = await supabase.from("tags").delete().eq("id", tagId);
  if (dbErr) return NextResponse.json({ error: { code: "db_error", message: dbErr.message } }, { status: 500 });
  return NextResponse.json({ data: { ok: true } });
}
