import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** PATCH /api/admin/users/[id] — admin updates a user's role, manager_id, or capacity. */
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
  const ALLOWED = ["role", "manager_id", "capacity_hours", "is_active"] as const;
  const update: Record<string, unknown> = {};
  for (const key of ALLOWED) {
    if (key in body) update[key] = body[key];
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "No valid fields to update." } },
      { status: 400 }
    );
  }

  const VALID_ROLES = ["employee", "manager", "admin"];
  if ("role" in update && !VALID_ROLES.includes(update.role as string)) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "Invalid role." } },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("users")
    .update(update)
    .eq("id", params.id)
    .select("id, email, full_name, role, manager_id, capacity_hours, is_active")
    .single();

  if (error) {
    return NextResponse.json(
      { error: { code: "db_error", message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}
