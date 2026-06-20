import { ChatView } from "@/components/chat/chat-view";
import {
  getChannels,
  getCurrentUser,
  getMessages,
  getWorkspace,
} from "@/lib/data/provider";

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = await params;
  const [channels, messages, user, workspace] = await Promise.all([
    getChannels(),
    getMessages(channelId),
    getCurrentUser(),
    getWorkspace(),
  ]);

  const channel = channels.find((c) => c.id === channelId);
  const channelName = channel?.name ?? channelId;

  return (
    <ChatView
      channelId={channelId}
      channelName={channelName}
      workspaceId={workspace.id}
      initialMessages={messages}
      currentUser={user ?? { id: "guest", email: "", displayName: "Guest" }}
    />
  );
}
