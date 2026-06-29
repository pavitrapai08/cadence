import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { TopBar } from "@/components/layout/TopBar";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Authenticated app shell wrapping all six tabs. */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let email: string | null = null;
  let role: string | null = null;
  let fullName: string | null = null;

  // Degrade gracefully if env/session is absent (e.g. preview before secrets).
  try {
    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        email = user.email ?? null;
        const { data: profile } = await supabase
          .from("users")
          .select("role, full_name")
          .eq("id", user.id)
          .single();
        role = profile?.role ?? null;
        fullName = profile?.full_name ?? null;
      }
    }
  } catch {
    // Render the shell anyway.
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role={role} email={email} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar email={email} fullName={fullName} />
        <main className="flex-1 overflow-x-hidden bg-[#E8F0E9] p-4 pb-20 md:p-6 md:pb-6">
          {children}
        </main>
      </div>
      <MobileNav role={role} />
    </div>
  );
}
