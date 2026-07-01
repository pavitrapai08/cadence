import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { weekStart, weekDays } from "@/lib/week";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export type HealthIssue = "no_note" | "too_brief" | "ok";

export interface HealthEntry {
  entryId: string;
  date: string;
  projectName: string;
  note: string | null;
  issue: HealthIssue;
}

type RawHealthEntry = {
  id: string;
  date: string;
  raw_notes: string | null;
  ai_description: string | null;
  project: { name: string } | null;
};

/** POST /api/ai/health — deterministic rules-based health check. No LLM. */
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

  const body = await req.json().catch(() => ({}));
  const weekStartDate = body.weekStart ? new Date(body.weekStart) : weekStart(new Date());
  const days = weekDays(weekStartDate);
  const dateFrom = format(days[0], "yyyy-MM-dd");
  const dateTo = format(days[6], "yyyy-MM-dd");

  const { data: rawEntries, error: dbErr } = await supabase
    .from("time_entries")
    .select("id, date, raw_notes, ai_description, project:projects(name)")
    .eq("user_id", user.id)
    .gte("date", dateFrom)
    .lte("date", dateTo)
    .order("date");

  if (dbErr) {
    return NextResponse.json(
      { error: { code: "db_error", message: dbErr.message } },
      { status: 500 }
    );
  }

  const entries = (rawEntries ?? []) as unknown as RawHealthEntry[];

  const results: HealthEntry[] = entries.map((e) => {
    // Use polished description if available, otherwise raw notes
    const note = e.ai_description?.trim() || e.raw_notes?.trim() || null;
    let issue: HealthIssue;
    if (!note || note === "") {
      issue = "no_note";
    } else if (note.split(/\s+/).length < 5) {
      issue = "too_brief";
    } else {
      issue = "ok";
    }
    return {
      entryId: e.id,
      date: e.date,
      projectName: (e.project as { name: string } | null)?.name ?? "Unknown",
      note,
      issue,
    };
  });

  return NextResponse.json({ data: results });
}
