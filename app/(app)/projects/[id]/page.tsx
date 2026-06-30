import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProjectDetail } from "@/components/projects/ProjectDetail";
import { splitHoursByBillable } from "@/lib/billable";
import { weekStart, weekStartISO, shiftWeek } from "@/lib/week";
import { ProjectFull, ProjectStats } from "@/lib/types";

export const dynamic = "force-dynamic";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export default async function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const [{ data: profile }, { data: rawProject, error: projErr }] =
    await Promise.all([
      supabase.from("users").select("role").eq("id", user.id).single(),
      supabase
        .from("projects")
        .select(
          "id, name, colour, external_id, description, budget_hours, is_active, client_id, tag_group_id, client:clients(id, name, is_active), tag_group:tag_groups(id, name)"
        )
        .eq("id", params.id)
        .single(),
    ]);

  if (projErr || !rawProject) notFound();

  const project = rawProject as unknown as ProjectFull;
  const role = profile?.role ?? "employee";

  // Fetch tags and entries in parallel
  const tagGroupId = project.tag_group_id;
  const [{ data: tags }, { data: entries }] = await Promise.all([
    tagGroupId
      ? supabase.from("tags").select("id, name, is_billable").eq("tag_group_id", tagGroupId)
      : Promise.resolve({ data: [] as { id: string; name: string; is_billable: boolean }[] }),
    supabase
      .from("time_entries")
      .select("hours, tag_ids, date")
      .eq("project_id", params.id),
  ]);

  const allTags = (tags ?? []) as { id: string; name: string; is_billable: boolean }[];
  const allEntries = (entries ?? []) as { hours: number; tag_ids: string[]; date: string }[];
  const billableTagIds = new Set(allTags.filter((t) => t.is_billable).map((t) => t.id));

  const { billable, nonBillable, total } = splitHoursByBillable(
    allEntries.map((e) => ({ hours: e.hours, tagIds: e.tag_ids })),
    billableTagIds
  );

  const now = new Date();
  const thisWeekISO = weekStartISO(weekStart(now));
  const nextWeekISO = weekStartISO(shiftWeek(weekStart(now), 1));

  const thisWeekHours = round2(
    allEntries
      .filter((e) => e.date >= thisWeekISO && e.date < nextWeekISO)
      .reduce((s, e) => s + e.hours, 0)
  );

  const thisMonthHours = round2(
    allEntries
      .filter((e) => {
        const d = new Date(e.date + "T00:00:00");
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, e) => s + e.hours, 0)
  );

  const lastFiveWeeks = Array.from({ length: 5 }, (_, i) => {
    const ws = weekStartISO(shiftWeek(weekStart(now), i - 4));
    const we = weekStartISO(shiftWeek(weekStart(now), i - 3));
    return {
      weekStart: ws,
      hours: round2(
        allEntries
          .filter((e) => e.date >= ws && e.date < we)
          .reduce((s, e) => s + e.hours, 0)
      ),
    };
  });

  const tagHours = new Map<string, number>();
  for (const entry of allEntries) {
    for (const tagId of entry.tag_ids) {
      tagHours.set(tagId, (tagHours.get(tagId) ?? 0) + entry.hours);
    }
  }
  const tagUsage = Array.from(tagHours.entries())
    .map(([tagId, hours]) => ({
      tagId,
      tagName: allTags.find((t) => t.id === tagId)?.name ?? "Unknown",
      hours: round2(hours),
    }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 10);

  const stats: ProjectStats = {
    totalHours: total,
    thisWeekHours,
    thisMonthHours,
    billableHours: billable,
    nonBillableHours: nonBillable,
    lastFiveWeeks,
    tagUsage,
  };

  return (
    <ProjectDetail
      project={project}
      stats={stats}
      isAdmin={role === "admin"}
    />
  );
}
