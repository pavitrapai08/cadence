import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { weekStart, weekStartISO, shiftWeek, parseWeekStart } from "@/lib/week";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function err(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

type RawEntry = {
  date: string;
  hours: number;
  project: {
    id: string;
    name: string;
    colour: string;
    external_id: string | null;
    client: { id: string; name: string } | null;
  } | null;
};

/** GET /api/reports/clients?dateFrom=&dateTo=&clientId=
 *  All authenticated users; RLS scopes rows by role automatically.
 *  Default range: last 12 weeks. Caps displayed columns at 12 with a note.
 */
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err(401, "unauthorized", "Not authenticated.");

  const url = req.nextUrl;
  const now = new Date();
  const currentWeek = weekStart(now);
  const defaultFrom = weekStartISO(shiftWeek(currentWeek, -11));
  const defaultTo = weekStartISO(shiftWeek(currentWeek, 1));
  const dateFrom = url.searchParams.get("dateFrom") ?? defaultFrom;
  const dateTo = url.searchParams.get("dateTo") ?? defaultTo;
  const filterClientId = url.searchParams.get("clientId");

  const { data: rawEntries, error: dbErr } = await supabase
    .from("time_entries")
    .select(
      "date, hours, project:projects(id, name, colour, external_id, client:clients(id, name))"
    )
    .gte("date", dateFrom)
    .lt("date", dateTo);

  if (dbErr) return err(500, "db_error", dbErr.message);

  const entries = (rawEntries ?? []) as unknown as RawEntry[];
  const filtered = filterClientId
    ? entries.filter((e) => e.project?.client?.id === filterClientId)
    : entries;

  // Build full weeks list
  const allWeeks: string[] = [];
  let ws = parseWeekStart(dateFrom);
  while (weekStartISO(ws) < dateTo) {
    allWeeks.push(weekStartISO(ws));
    ws = shiftWeek(ws, 1);
    if (allWeeks.length > 52) break;
  }

  // Aggregate: client → project → weekStart → hours
  const clientMap = new Map<
    string,
    {
      clientId: string;
      clientName: string;
      projects: Map<
        string,
        {
          projectId: string;
          projectName: string;
          colour: string;
          externalId: string | null;
          weeklyHours: Map<string, number>;
        }
      >;
    }
  >();

  for (const entry of filtered) {
    if (!entry.project) continue;
    const p = entry.project;
    const clientId = p.client?.id ?? "__none__";
    const clientName = p.client?.name ?? "No client";

    if (!clientMap.has(clientId)) {
      clientMap.set(clientId, { clientId, clientName, projects: new Map() });
    }
    const clientData = clientMap.get(clientId)!;

    if (!clientData.projects.has(p.id)) {
      clientData.projects.set(p.id, {
        projectId: p.id,
        projectName: p.name,
        colour: p.colour,
        externalId: p.external_id,
        weeklyHours: new Map(),
      });
    }
    const projectData = clientData.projects.get(p.id)!;

    // Bucket into the matching week
    for (let i = allWeeks.length - 1; i >= 0; i--) {
      const wStart = allWeeks[i];
      const wEnd =
        i + 1 < allWeeks.length ? allWeeks[i + 1] : dateTo;
      if (entry.date >= wStart && entry.date < wEnd) {
        projectData.weeklyHours.set(
          wStart,
          (projectData.weeklyHours.get(wStart) ?? 0) + entry.hours
        );
        break;
      }
    }
  }

  // Cap columns at 12 most recent weeks
  const weeks = allWeeks.slice(-12);
  const cappedNote =
    allWeeks.length > 12
      ? `Showing last 12 of ${allWeeks.length} weeks`
      : null;

  const clients = Array.from(clientMap.values())
    .map((c) => {
      const projects = Array.from(c.projects.values())
        .map((p) => {
          const weeklyHours: Record<string, number> = {};
          for (const w of weeks) {
            const h = p.weeklyHours.get(w) ?? 0;
            if (h > 0) weeklyHours[w] = round2(h);
          }
          const totalHours = round2(
            weeks.reduce((s, w) => s + (p.weeklyHours.get(w) ?? 0), 0)
          );
          return {
            projectId: p.projectId,
            projectName: p.projectName,
            colour: p.colour,
            externalId: p.externalId,
            totalHours,
            weeklyHours,
          };
        })
        .filter((p) => p.totalHours > 0)
        .sort((a, b) => b.totalHours - a.totalHours);

      const totalHours = round2(
        projects.reduce((s, p) => s + p.totalHours, 0)
      );
      return { clientId: c.clientId, clientName: c.clientName, totalHours, projects };
    })
    .filter((c) => c.totalHours > 0)
    .sort((a, b) => b.totalHours - a.totalHours);

  return NextResponse.json({ data: { clients, weeks, cappedNote } });
}
