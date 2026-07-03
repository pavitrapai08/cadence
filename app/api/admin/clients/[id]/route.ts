import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PATCH /api/admin/clients/[id] — admin updates a client's name or active status. */
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
  const update: Record<string, unknown> = {};
  if ("name" in body && body.name?.trim()) update.name = body.name.trim();
  if ("is_active" in body) update.is_active = Boolean(body.is_active);

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "No valid fields to update." } },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("clients")
    .update(update)
    .eq("id", params.id)
    .select("id, name, is_active")
    .single();

  if (error) {
    return NextResponse.json(
      { error: { code: "db_error", message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}
