import { createClient } from "@/lib/supabase/server";
import { ReportsDashboard } from "@/components/reports/ReportsDashboard";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  let role = "employee";
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();
        role = profile?.role ?? "employee";
      }
    }
  } catch {
    // Render with employee defaults in preview
  }

  return <ReportsDashboard role={role} />;
}
