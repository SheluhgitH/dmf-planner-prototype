import { AppSidebar } from "@/components/layout/app-sidebar";
import { isSupabaseConfigured } from "@/lib/config";
import {
  getChannelUnreadCounts,
  getChannels,
  getCurrentUser,
  getWorkspace,
  getWorkspaces,
} from "@/lib/data/provider";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (isSupabaseConfigured()) {
    const { getSharedWorkspace } = await import(
      "@/lib/data/supabase/queries"
    );
    const shared = await getSharedWorkspace();
    if (!shared) {
      redirect("/onboarding");
    }
  } else {
    const workspaces = await getWorkspaces();
    if (workspaces.length === 0) {
      redirect("/onboarding");
    }
  }

  const [workspace, channels, user, unreadCounts] = await Promise.all([
    getWorkspace(),
    getChannels(),
    getCurrentUser(),
    getChannelUnreadCounts(),
  ]);

  return (
    <div className="flex h-screen flex-col overflow-hidden lg:flex-row">
      <AppSidebar
        workspace={workspace}
        channels={channels}
        user={user ?? { id: "guest", email: "", displayName: "Guest" }}
        unreadCounts={unreadCounts}
      />
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
