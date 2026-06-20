import { ChatView } from "@/components/chat/chat-view";
import { isSupabaseConfigured } from "@/lib/config";
import {
  getChannels,
  getCurrentUser,
  getMessages,
  getWorkspace,
} from "@/lib/data/provider";

export const dynamic = "force-dynamic";

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = await params;

  if (isSupabaseConfigured()) {
    const { joinSharedWorkspace } = await import(
      "@/lib/data/supabase/queries"
    );
    await joinSharedWorkspace();
  }

  const [channels, messages, user, workspace] = await Promise.all([
    getChannels(),
    getMessages(channelId, { limit: 100 }),
    getCurrentUser(),
    getWorkspace(),
  ]);

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
      />
    </div>
  );
}
