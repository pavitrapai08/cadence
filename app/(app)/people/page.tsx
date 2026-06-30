import { createClient } from "@/lib/supabase/server";
import { PeopleShell } from "@/components/people/PeopleShell";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role = "employee";
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    role = profile?.role ?? "employee";
  }

  if (role === "employee") {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm font-medium text-gray-500">Access restricted</p>
        <p className="mt-1 text-xs text-gray-400">
          The People tab is available to managers and admins.
        </p>
      </div>
    );
  }

  return <PeopleShell role={role} />;
}
