import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account/AccountShell";

export default async function AccountPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select(
      "id, email, full_name, avatar_url, role, capacity_hours, timezone, notification_days, notification_time"
    )
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  return (
    <AccountShell
      profile={{
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name ?? null,
        avatar_url: profile.avatar_url ?? null,
        role: profile.role,
        capacity_hours: profile.capacity_hours,
        timezone: profile.timezone,
        notification_days: profile.notification_days ?? ["monday","tuesday","wednesday","thursday","friday"],
        notification_time: profile.notification_time ?? "17:00",
      }}
    />
  );
}
