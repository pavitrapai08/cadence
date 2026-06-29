import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/month-locks
 * Returns the last 24 months with their lock state.
 * Accessible to all authenticated users (calendar needs the lock state).
 * Months with no row = unlocked.
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

  const { data, error } = await supabase
    .from("month_locks")
    .select("year, month, is_locked, locked_by, locked_at, unlocked_by, unlocked_at")
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .limit(24);

  if (error) {
    return NextResponse.json(
      { error: { code: "db_error", message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}

/**
 * PATCH /api/admin/month-locks
 * Body: { year: number, month: number, is_locked: boolean }
 * Admin only. Locks or unlocks the specified month.
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

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Admin only" } },
      { status: 403 }
    );
  }

  const body = (await req.json()) as {
    year: number;
    month: number;
    is_locked: boolean;
  };
  const { year, month, is_locked } = body;

  if (
    typeof year !== "number" ||
    typeof month !== "number" ||
    month < 1 ||
    month > 12 ||
    typeof is_locked !== "boolean"
  ) {
    return NextResponse.json(
      {
        error: {
          code: "bad_request",
          message: "year (number), month (1–12), is_locked (boolean) required",
        },
      },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const upsertPayload = {
    year,
    month,
    is_locked,
    locked_by: is_locked ? user.id : null,
    locked_at: is_locked ? now : null,
    unlocked_by: is_locked ? null : user.id,
    unlocked_at: is_locked ? null : now,
  };

  const { data, error } = await supabase
    .from("month_locks")
    .upsert(upsertPayload, { onConflict: "year,month" })
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
