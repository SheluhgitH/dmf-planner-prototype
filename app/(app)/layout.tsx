import { AppSidebar } from "@/components/layout/app-sidebar";
import { CommandPalette } from "@/components/layout/command-palette";
import { UnreadProvider } from "@/components/layout/unread-provider";
import { isSupabaseConfigured } from "@/lib/config";
import {
  getChannelUnreadCounts,
  getChannels,
  getCurrentUser,
  getWorkspace,
  getWorkspaceMembers,
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

  const [workspace, channels, user, unreadCounts, members] = await Promise.all([
    getWorkspace(),
    getChannels(),
    getCurrentUser(),
    getChannelUnreadCounts(),
    getWorkspaceMembers(),
  ]);

  const currentUser = user ?? { id: "guest", email: "", displayName: "Guest" };

  return (
    <UnreadProvider
      initialCounts={unreadCounts}
      workspaceId={workspace.id}
      userId={currentUser.id}
      channelIds={channels.map((c) => c.id)}
    >
      <div className="flex h-screen flex-col overflow-hidden lg:flex-row">
        <AppSidebar
          workspace={workspace}
          channels={channels}
          user={currentUser}
          members={members.map((m) => m.user)}
          unreadCounts={unreadCounts}
        />
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </main>
        <CommandPalette />
      </div>
    </UnreadProvider>
  );
}
