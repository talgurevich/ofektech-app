import { createClient } from "@/lib/supabase/server";
import { AppSidebarLayout } from "@/components/app-sidebar";

export async function SidebarWrapper({ children }: { children: React.ReactNode }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // No sidebar for unauthenticated users (login page etc.)
      return <>{children}</>;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name, avatar_url")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return <>{children}</>;
    }

    return (
      <AppSidebarLayout
        role={profile.role as "candidate" | "mentor" | "admin"}
        fullName={profile.full_name}
        avatarUrl={profile.avatar_url}
      >
        {children}
      </AppSidebarLayout>
    );
  } catch {
    // If Supabase is unreachable, render without sidebar
    return <>{children}</>;
  }
}
