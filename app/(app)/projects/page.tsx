import { createClient } from "@/lib/supabase/server";
import { ProjectsShell } from "@/components/projects/ProjectsShell";
import { ProjectFull } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  let projects: ProjectFull[] = [];
  let role: string = "employee";

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
      role = profile?.role ?? "employee";

      if (role === "admin") {
        const { data } = await supabase
          .from("projects")
          .select(
            "id, name, colour, external_id, description, budget_hours, is_active, client_id, tag_group_id, client:clients(id, name, is_active), tag_group:tag_groups(id, name)"
          )
          .order("name");
        projects = (data ?? []) as unknown as ProjectFull[];
      } else {
        const { data: memberships } = await supabase
          .from("project_members")
          .select("project_id")
          .eq("user_id", user.id);

        const ids = (memberships ?? []).map((m) => m.project_id);
        if (ids.length > 0) {
          const { data } = await supabase
            .from("projects")
            .select(
              "id, name, colour, external_id, description, budget_hours, is_active, client_id, tag_group_id, client:clients(id, name, is_active), tag_group:tag_groups(id, name)"
            )
            .in("id", ids)
            .order("name");
          projects = (data ?? []) as unknown as ProjectFull[];
        }
      }
    }
  } catch {
    // Render shell with empty state on error.
  }

  return <ProjectsShell initialProjects={projects} isAdmin={role === "admin"} />;
}
