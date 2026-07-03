import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/clients — all clients (admin only). */
export async function GET() {
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

  const { data, error } = await supabase
    .from("clients")
    .select("id, name, is_active")
    .eq("is_active", true)
    .order("name");

  if (error) {
    return NextResponse.json(
      { error: { code: "db_error", message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: data ?? [] });
}

/** POST /api/admin/clients — create client (admin only). */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: { code: "unauthorized", message: "Not authenticated." } }, { status: 401 });

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: { code: "forbidden", message: "Admin only." } }, { status: 403 });

  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: { code: "bad_request", message: "name is required." } }, { status: 400 });

  const { data, error } = await supabase
    .from("clients")
    .insert({ name: body.name.trim(), is_active: true })
    .select("id, name, is_active")
    .single();

  if (error) return NextResponse.json({ error: { code: "db_error", message: error.message } }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
