import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, error: "unauthorized" };
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { user, error: "forbidden" };
  return { user, error: null };
}

/** GET /api/projects/[id]/members — list members (admin). */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { error: authErr } = await requireAdmin(supabase);
  if (authErr) {
    return NextResponse.json(
      { error: { code: authErr, message: authErr === "unauthorized" ? "Not authenticated." : "Admin only." } },
      { status: authErr === "unauthorized" ? 401 : 403 }
    );
  }

  const { data, error } = await supabase
    .from("project_members")
    .select("user_id, users:user_id(id, email, full_name)")
    .eq("project_id", params.id);

  if (error) {
    return NextResponse.json(
      { error: { code: "db_error", message: error.message } },
      { status: 500 }
    );
  }

  const members = (data ?? []).map((row) => row.users).filter(Boolean);
  return NextResponse.json({ data: members });
}

/** POST /api/projects/[id]/members — add a member (admin). Body: { userId } */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { user, error: authErr } = await requireAdmin(supabase);
  if (authErr || !user) {
    return NextResponse.json(
      { error: { code: authErr ?? "unauthorized", message: "Not permitted." } },
      { status: authErr === "forbidden" ? 403 : 401 }
    );
  }

  const { userId } = await req.json();
  if (!userId) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "userId is required." } },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("project_members")
    .insert({ project_id: params.id, user_id: userId, added_by: user.id });

  if (error) {
    return NextResponse.json(
      { error: { code: "db_error", message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { added: true } }, { status: 201 });
}

/** DELETE /api/projects/[id]/members — remove a member (admin). Body: { userId } */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { error: authErr } = await requireAdmin(supabase);
  if (authErr) {
    return NextResponse.json(
      { error: { code: authErr, message: "Not permitted." } },
      { status: authErr === "forbidden" ? 403 : 401 }
    );
  }

  const { userId } = await req.json();
  if (!userId) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "userId is required." } },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("project_id", params.id)
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json(
      { error: { code: "db_error", message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { removed: true } });
}
