import { ChatView } from "@/components/chat/chat-view";
import {
  getChannels,
  getCurrentUser,
  getMessages,
} from "@/lib/data/provider";

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = await params;
  const [channels, messages, user] = await Promise.all([
    getChannels(),
    getMessages(channelId),
    getCurrentUser(),
  ]);

  const channel = channels.find((c) => c.id === channelId);
  const channelName = channel?.name ?? channelId;

  return (
    <ChatView
      channelId={channelId}
      channelName={channelName}
      initialMessages={messages}
      currentUser={user ?? { id: "guest", email: "", displayName: "Guest" }}
    />
  );
}
