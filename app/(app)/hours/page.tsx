import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { weekStartISO } from "@/lib/week";
import { HoursShell } from "@/components/hours/HoursShell";
import { Project, TimeEntry, MonthLockRow, UserProfile } from "@/lib/types";

export default async function HoursPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch in parallel: user profile, project memberships, lock rows, this week's entries
  const today = new Date();
  const weekStart = weekStartISO(today);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  const [profileRes, membershipsRes, locksRes, entriesRes] = await Promise.all([
    supabase.from("users").select("*").eq("id", user.id).single(),
    supabase.from("project_members").select("project_id").eq("user_id", user.id),
    supabase
      .from("month_locks")
      .select("year, month, is_locked")
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(24),
    supabase
      .from("time_entries")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", weekStart)
      .lt("date", weekEndStr)
      .order("date")
      .order("created_at"),
  ]);

  const profile = profileRes.data as UserProfile | null;
  if (!profile) redirect("/login");

  const projectIds = (membershipsRes.data ?? []).map((m: { project_id: string }) => m.project_id);
  let projects: Project[] = [];
  if (projectIds.length > 0) {
    const { data } = await supabase
      .from("projects")
      .select(
        `id, name, colour, external_id, tag_group_id,
         tag_group:tag_groups(
           id, name,
           tags(id, name, is_billable, is_required, sort_order)
         )`
      )
      .in("id", projectIds)
      .eq("is_active", true)
      .order("name");
    projects = (data ?? []).map((p: Record<string, unknown>) => ({
      ...p,
      tag_group: p.tag_group
        ? {
            ...(p.tag_group as Record<string, unknown>),
            tags: [...((p.tag_group as { tags: { sort_order: number }[] }).tags ?? [])].sort(
              (a, b) => a.sort_order - b.sort_order
            ),
          }
        : null,
    })) as Project[];
  }

  return (
    <HoursShell
      initialEntries={(entriesRes.data ?? []) as TimeEntry[]}
      projects={projects}
      lockRows={(locksRes.data ?? []) as MonthLockRow[]}
      user={profile}
    />
  );
}
