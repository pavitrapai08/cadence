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

/** GET /api/reports/people?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
 *  Manager/admin only. Returns per-user weekly utilisation data.
 */
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err(401, "unauthorized", "Not authenticated.");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = profile?.role;
  if (role !== "manager" && role !== "admin") {
    return err(403, "forbidden", "Manager or admin only.");
  }

  const url = req.nextUrl;
  const now = new Date();
  const currentWeek = weekStart(now);
  const defaultFrom = weekStartISO(shiftWeek(currentWeek, -3)); // 4 weeks default
  const defaultTo = weekStartISO(shiftWeek(currentWeek, 1));
  const dateFrom = url.searchParams.get("dateFrom") ?? defaultFrom;
  const dateTo = url.searchParams.get("dateTo") ?? defaultTo;
  const today = now.toISOString().slice(0, 10);

  // Get target users (managers see direct reports; admins see everyone)
  let usersQuery = supabase
    .from("users")
    .select("id, email, full_name, role, capacity_hours")
    .eq("is_active", true);
  if (role === "manager") {
    usersQuery = usersQuery.eq("manager_id", user.id);
  }
  const { data: users } = await usersQuery.order("full_name");
  if (!users || users.length === 0) {
    return NextResponse.json({ data: { users: [], weeks: [] } });
  }

  const userIds = users.map((u) => u.id);

  // Parallel: tags for billability, entries in range, timesheets for this week
  const [{ data: tags }, { data: entries }, { data: timesheets }] =
    await Promise.all([
      supabase.from("tags").select("id, is_billable"),
      supabase
        .from("time_entries")
        .select("user_id, date, hours, tag_ids")
        .in("user_id", userIds)
        .gte("date", dateFrom)
        .lt("date", dateTo),
      supabase
        .from("timesheets")
        .select("user_id, status")
        .in("user_id", userIds)
        .eq("week_start_date", weekStartISO(currentWeek)),
    ]);

  const billableTagIds = new Set(
    (tags ?? []).filter((t) => t.is_billable).map((t) => t.id)
  );
  const submittedSet = new Set(
    (timesheets ?? [])
      .filter((t) => t.status === "submitted")
      .map((t) => t.user_id)
  );

  // Build ordered week list
  const weeks: string[] = [];
  let ws = parseWeekStart(dateFrom);
  while (weekStartISO(ws) < dateTo) {
    weeks.push(weekStartISO(ws));
    ws = shiftWeek(ws, 1);
    if (weeks.length > 52) break;
  }

  const result = users.map((u) => {
    const userEntries = (entries ?? []).filter((e) => e.user_id === u.id);

    const weeklyData = weeks.map((wStart) => {
      const wEnd = weekStartISO(shiftWeek(parseWeekStart(wStart), 1));
      const wEntries = userEntries.filter(
        (e) => e.date >= wStart && e.date < wEnd
      );
      const hours = round2(wEntries.reduce((s, e) => s + e.hours, 0));
      const billable = round2(
        wEntries
          .filter((e) =>
            (e.tag_ids ?? []).some((tid: string) => billableTagIds.has(tid))
          )
          .reduce((s, e) => s + e.hours, 0)
      );
      return { weekStart: wStart, hours, billable };
    });

    const totalLogged = round2(weeklyData.reduce((s, w) => s + w.hours, 0));
    const totalBillable = round2(
      weeklyData.reduce((s, w) => s + w.billable, 0)
    );
    const hasLoggedToday = userEntries.some((e) => e.date === today);

    return {
      userId: u.id,
      fullName: u.full_name,
      email: u.email,
      role: u.role,
      capacityHours: u.capacity_hours,
      weeklyData,
      totalLogged,
      totalBillable,
      submittedThisWeek: submittedSet.has(u.id),
      hasLoggedToday,
    };
  });

  return NextResponse.json({ data: { users: result, weeks } });
}
