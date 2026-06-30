import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json(
        { error: { code: "unauthorized", message: "Not authenticated." } },
        { status: 401 }
      );
    }

    const { weekStart } = await req.json();
    if (!weekStart) {
      return Response.json(
        { error: { code: "bad_request", message: "weekStart is required." } },
        { status: 400 }
      );
    }

    const { error } = await supabase.rpc("submit_week", {
      p_week_start: weekStart,
    });

    if (error) {
      return Response.json(
        { error: { code: "submit_failed", message: error.message } },
        { status: 400 }
      );
    }

    return Response.json({ data: { submitted: true, weekStart } });
  } catch {
    return Response.json(
      { error: { code: "server_error", message: "Failed to submit timesheet." } },
      { status: 500 }
    );
  }
}
