import { ChatView } from "@/components/chat/chat-view";
import { isSupabaseConfigured } from "@/lib/config";
import {
  getChannels,
  getCurrentUser,
  getMessages,
  getProjects,
  getWorkspace,
  getWorkspaceMembers,
} from "@/lib/data/provider";
import { getLinkedTasksForChannelAction } from "@/lib/actions/profile";

export const dynamic = "force-dynamic";

export default async function ChannelPage({
  params,
  searchParams,
}: {
  params: Promise<{ channelId: string }>;
  searchParams: Promise<{ messageId?: string }>;
}) {
  const { channelId } = await params;
  const { messageId } = await searchParams;

  if (isSupabaseConfigured()) {
    const { joinSharedWorkspace } = await import(
      "@/lib/data/supabase/queries"
    );
    await joinSharedWorkspace();
  }

  const [channels, messages, user, workspace, projects, members] =
    await Promise.all([
      getChannels(),
      getMessages(channelId, { limit: 100 }),
      getCurrentUser(),
      getWorkspace(),
      getProjects(),
      getWorkspaceMembers(),
    ]);

  const { linkedTasks } = isSupabaseConfigured()
    ? await getLinkedTasksForChannelAction(channelId)
    : { linkedTasks: {} };

  const channel = channels.find((c) => c.id === channelId);
  const channelName = channel?.name ?? channelId;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ChatView
        channelId={channelId}
        channelName={channelName}
        workspaceId={workspace.id}
        initialMessages={messages}
        currentUser={user ?? { id: "guest", email: "", displayName: "Guest" }}
        projects={projects}
        members={members.map((m) => m.user)}
        linkedTasks={linkedTasks}
        highlightMessageId={messageId}
      />
    </div>
  );
}
