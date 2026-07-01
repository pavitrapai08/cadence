import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { weekStart, weekDays } from "@/lib/week";
import { formatHours } from "@/lib/hours";
import { format } from "date-fns";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT =
  "You are helping a DecisionFoundry employee reflect on their week. " +
  "Given time entries grouped by project, write a short personal paragraph per project. " +
  'Write in second person ("You worked on..."). ' +
  "Be specific and encouraging. " +
  "This is for personal reflection only, not a client email.";

type RawEntry = {
  id: string;
  date: string;
  hours: number;
  raw_notes: string | null;
  ai_description: string | null;
  project: { id: string; name: string } | null;
};

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

    const body = await req.json().catch(() => ({}));
    const weekStartDate = body.weekStart ? new Date(body.weekStart) : weekStart(new Date());
    const days = weekDays(weekStartDate);
    const dateFrom = format(days[0], "yyyy-MM-dd");
    const dateTo = format(days[6], "yyyy-MM-dd");

    const { data: rawEntries, error: dbErr } = await supabase
      .from("time_entries")
      .select("id, date, hours, raw_notes, ai_description, project:projects(id, name)")
      .eq("user_id", user.id)
      .gte("date", dateFrom)
      .lte("date", dateTo)
      .order("date");

    if (dbErr) {
      return Response.json(
        { error: { code: "db_error", message: dbErr.message } },
        { status: 500 }
      );
    }

    const entries = (rawEntries ?? []) as unknown as RawEntry[];
    if (entries.length === 0) {
      return Response.json(
        { error: { code: "no_entries", message: "No entries this week to summarize." } },
        { status: 422 }
      );
    }

    // Group by project
    const grouped = new Map<string, { name: string; entries: RawEntry[] }>();
    for (const e of entries) {
      const pid = e.project?.id ?? "__none__";
      const pname = e.project?.name ?? "Unknown project";
      if (!grouped.has(pid)) grouped.set(pid, { name: pname, entries: [] });
      grouped.get(pid)!.entries.push(e);
    }

    // Build user message
    const weekLabel = format(days[0], "MMM d");
    let userMessage = `Here are my time entries for the week of ${weekLabel}:\n\n`;
    for (const { name, entries: pEntries } of Array.from(grouped.values())) {
      const total = pEntries.reduce((s, e) => s + e.hours, 0);
      userMessage += `**${name}** (total: ${formatHours(total)}):\n`;
      for (const e of pEntries) {
        const note = e.ai_description || e.raw_notes || "(no note)";
        const dateLabel = format(new Date(e.date + "T00:00:00"), "EEE MMM d");
        userMessage += `- ${dateLabel}: ${note} (${formatHours(e.hours)})\n`;
      }
      userMessage += "\n";
    }
    userMessage += "Write one personal paragraph per project summarizing my work this week.";

    const client = new Anthropic();
    const stream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(new TextEncoder().encode(event.delta.text));
            }
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch {
    return Response.json(
      {
        error: {
          code: "ai_unavailable",
          message: "AI is temporarily unavailable. Please try again.",
        },
      },
      { status: 503 }
    );
  }
}
