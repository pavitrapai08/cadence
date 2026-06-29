import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/users/me
 * Allows the current user to update their own profile fields.
 * Accepted fields: dismissedWelcome (boolean).
 */
export async function PATCH(req: NextRequest) {
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

  const body = await req.json() as { dismissedWelcome?: boolean };

  const patch: Record<string, unknown> = {};
  if (typeof body.dismissedWelcome === "boolean") {
    patch.dismissed_welcome = body.dismissedWelcome;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "No updatable fields provided" } },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("users")
    .update(patch)
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: { code: "db_error", message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}
