import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** GET /api/projects — projects visible to this user (admin sees all). */
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

  const isAdmin = profile?.role === "admin";

  let projectIds: string[] | null = null;
  if (!isAdmin) {
    const { data: memberships } = await supabase
      .from("project_members")
      .select("project_id")
      .eq("user_id", user.id);
    projectIds = (memberships ?? []).map((m) => m.project_id);
    if (projectIds.length === 0) return NextResponse.json({ data: [] });
  }

  let query = supabase
    .from("projects")
    .select(
      "id, name, colour, external_id, description, budget_hours, is_active, client_id, tag_group_id, client:clients(id, name, is_active), tag_group:tag_groups(id, name)"
    )
    .order("name");

  if (projectIds) query = query.in("id", projectIds);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      { error: { code: "db_error", message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: data ?? [] });
}

/** POST /api/projects — create project (admin only). */
export async function POST(req: NextRequest) {
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
  const { name, clientId, externalId, description, colour, tagGroupId, budgetHours } = body;
  if (!name?.trim()) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "name is required." } },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      name: name.trim(),
      client_id: clientId ?? null,
      external_id: externalId?.trim() || null,
      description: description?.trim() || null,
      colour: colour ?? "#1B6B3A",
      tag_group_id: tagGroupId ?? null,
      budget_hours: budgetHours ?? null,
      created_by: user.id,
    })
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

  return NextResponse.json({ data }, { status: 201 });
}
