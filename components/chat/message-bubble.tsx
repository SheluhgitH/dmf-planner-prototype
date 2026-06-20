"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ReactionPicker } from "@/components/chat/reaction-picker";
import type { Message, User } from "@/lib/data/types";
import { cn, formatRelativeTime } from "@/lib/utils";

export function MessageBubble({
  message,
  currentUser,
  onReply,
  onToggleReaction,
}: {
  message: Message;
  currentUser: User;
  onReply?: (message: Message) => void;
  onToggleReaction?: (messageId: string, emoji: string, reactedByMe: boolean) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const isOwn = message.authorId === currentUser.id;

  return (
    <div className={cn("group flex gap-3", isOwn && "flex-row-reverse")}>
      <Avatar name={message.author?.displayName ?? "?"} />
      <div className={cn("max-w-[70%]", isOwn && "text-right")}>
        <div
          className={cn(
            "flex items-baseline gap-2",
            isOwn && "flex-row-reverse"
          )}
        >
          <span className="text-sm font-medium text-zinc-200">
            {message.author?.displayName}
          </span>
          <span className="text-xs text-zinc-500">
            {formatRelativeTime(message.createdAt)}
          </span>
        </div>

        {message.body.trim() && (
          <p
            className={cn(
              "mt-1 rounded-lg px-3 py-2 text-sm",
              isOwn
                ? "bg-violet-600/30 text-violet-100"
                : "bg-zinc-800 text-zinc-200"
            )}
          >
            {message.body}
          </p>
        )}

        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.attachments.map((att) =>
              att.mimeType?.startsWith("image/") && att.url ? (
                <a key={att.id} href={att.url} target="_blank" rel="noreferrer">
                  <img
                    src={att.url}
                    alt={att.fileName}
                    className="max-h-48 rounded-lg border border-zinc-700"
                  />
                </a>
              ) : (
                <a
                  key={att.id}
                  href={att.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-violet-300 hover:bg-zinc-800"
                >
                  {att.fileName}
                </a>
              )
            )}
          </div>
        )}

        {message.reactions && message.reactions.length > 0 && (
          <div className={cn("mt-1 flex flex-wrap gap-1", isOwn && "justify-end")}>
            {message.reactions.map((r) => (
              <button
                key={r.emoji}
                type="button"
                onClick={() => onToggleReaction?.(message.id, r.emoji, r.reactedByMe)}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-xs",
                  r.reactedByMe
                    ? "border-violet-500 bg-violet-500/20 text-violet-200"
                    : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                )}
              >
                {r.emoji} {r.count}
              </button>
            ))}
          </div>
        )}

        <div
          className={cn(
            "mt-1 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100",
            isOwn && "justify-end"
          )}
        >
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              className="h-7 px-2 text-xs text-zinc-500"
              onClick={() => setShowPicker(!showPicker)}
            >
              React
            </Button>
            {showPicker && onToggleReaction && (
              <div className="absolute bottom-full left-0 z-10 mb-1">
                <ReactionPicker
                  onSelect={(emoji) => {
                    const existing = message.reactions?.find((r) => r.emoji === emoji);
                    onToggleReaction(message.id, emoji, existing?.reactedByMe ?? false);
                    setShowPicker(false);
                  }}
                />
              </div>
            )}
          </div>
          {onReply && !message.parentMessageId && (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              className="h-7 gap-1 px-2 text-xs text-zinc-500"
              onClick={() => onReply(message)}
            >
              <MessageSquare className="h-3 w-3" />
              Reply
              {(message.replyCount ?? 0) > 0 && (
                <span className="text-violet-400">({message.replyCount})</span>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
