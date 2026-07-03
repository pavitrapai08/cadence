import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/cron/missing-hours
 *  Optional Vercel-Pro path. The primary cron runs inside Supabase pg_cron (see CLAUDE.md §11).
 *  This endpoint calls the same check_missing_hours() DB function and must be guarded
 *  by CRON_SECRET so it cannot be triggered by anyone else.
 */
export async function POST(req: NextRequest) {
  // Accept the secret via header only — query params appear in access logs.
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Invalid or missing cron secret." } },
      { status: 403 }
    );
  }

  const supabase = createClient();
  const { error } = await supabase.rpc("check_missing_hours");
  if (error) {
    return NextResponse.json(
      { error: { code: "db_error", message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { ok: true } });
}
