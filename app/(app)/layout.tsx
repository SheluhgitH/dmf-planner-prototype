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
  const workspaces = await getWorkspaces();
  if (isSupabaseConfigured() && workspaces.length === 0) {
    redirect("/onboarding");
  }

  const [workspace, channels, user, unreadCounts] = await Promise.all([
    getWorkspace(),
    getChannels(),
    getCurrentUser(),
    getChannelUnreadCounts(),
  ]);

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <AppSidebar
        workspace={workspace}
        channels={channels}
        user={user ?? { id: "guest", email: "", displayName: "Guest" }}
        unreadCounts={unreadCounts}
      />
      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
