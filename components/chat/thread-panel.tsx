"use client";

import { X } from "lucide-react";
import { MessageBubble } from "@/components/chat/message-bubble";
import { MessageComposer } from "@/components/chat/message-composer";
import { Button } from "@/components/ui/button";
import type { Message, User } from "@/lib/data/types";

export function ThreadPanel({
  parentMessage,
  replies,
  currentUser,
  channelName,
  onClose,
  onSend,
  onToggleReaction,
}: {
  parentMessage: Message;
  replies: Message[];
  currentUser: User;
  channelName: string;
  onClose: () => void;
  onSend: (body: string, file?: File) => Promise<void>;
  onToggleReaction: (messageId: string, emoji: string, reactedByMe: boolean) => void;
}) {
  return (
    <aside className="flex w-full max-w-md flex-col border-l border-zinc-800 bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-100">Thread</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <MessageBubble
          message={parentMessage}
          currentUser={currentUser}
          onToggleReaction={onToggleReaction}
        />
        {replies.length > 0 && (
          <div className="border-t border-zinc-800 pt-4">
            <p className="mb-3 text-xs font-medium text-zinc-500">
              {replies.length} {replies.length === 1 ? "reply" : "replies"}
            </p>
            <div className="space-y-4">
              {replies.map((reply) => (
                <MessageBubble
                  key={reply.id}
                  message={reply}
                  currentUser={currentUser}
                  onToggleReaction={onToggleReaction}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <MessageComposer
        channelName={channelName}
        onSend={onSend}
      />
    </aside>
  );
}
