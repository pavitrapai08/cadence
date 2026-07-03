import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROFILE_SELECT =
  "id, email, full_name, avatar_url, role, capacity_hours, timezone, notification_days, notification_time, dismissed_welcome";

/** GET /api/account/profile — own profile (all authenticated). */
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

  const { data, error } = await supabase
    .from("users")
    .select(PROFILE_SELECT)
    .eq("id", user.id)
    .single();

  if (error) {
    return NextResponse.json(
      { error: { code: "db_error", message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}

/** PATCH /api/account/profile — update own profile fields. */
export async function PATCH(req: NextRequest) {
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

  const body = await req.json();

  // Only these fields are user-editable
  const ALLOWED = [
    "full_name",
    "capacity_hours",
    "timezone",
    "notification_days",
    "notification_time",
    "dismissed_welcome",
  ] as const;

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

  if (
    "capacity_hours" in update &&
    (typeof update.capacity_hours !== "number" || update.capacity_hours <= 0)
  ) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "capacity_hours must be a positive number." } },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("users")
    .update(update)
    .eq("id", user.id)
    .select(PROFILE_SELECT)
    .single();

  if (error) {
    return NextResponse.json(
      { error: { code: "db_error", message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}
