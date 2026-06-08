import { createClient } from "@/lib/supabase/server";
import { getHouseholds } from "@/lib/actions/households";
import { getProfile } from "@/lib/actions/profile";
import { Sidebar } from "@/components/layout/sidebar";
import { ScopeSwitcher } from "@/components/layout/scope-switcher";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = await getProfile();
  const households = await getHouseholds();

  return (
    <div className="flex min-h-screen">
      <Sidebar userEmail={user?.email ?? ""} />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-card px-6 py-4">
          <div>
            <p className="text-sm text-muted-foreground">Bem-vindo</p>
            <p className="font-medium">{profile?.full_name || user?.email}</p>
          </div>
          {profile ? <ScopeSwitcher profile={profile} households={households} /> : null}
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
