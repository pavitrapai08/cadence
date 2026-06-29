import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Health check — confirms Supabase reachability and reports which env vars are
 * present (booleans only, never the values). Used by Phase 0 to verify wiring.
 */
export async function GET() {
  const env = {
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    supabaseServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    cronSecret: Boolean(process.env.CRON_SECRET),
  };

  let database = "no_env";
  if (env.supabaseUrl && env.supabaseAnonKey) {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("tag_groups")
        .select("id", { count: "exact", head: true });
      database = error ? `error: ${error.code ?? "unknown"}` : "ok";
    } catch {
      database = "error";
    }
  }

  return NextResponse.json({ data: { status: "ok", env, database } });
}
