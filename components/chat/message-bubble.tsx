"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageSquare, CheckSquare, Pencil, Trash2, MessagesSquare, Calendar, Sparkles } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageIntentChips } from "@/components/ai/message-intent-chips";
import { ThreadSummarizeDialog } from "@/components/ai/thread-summarize-dialog";
import { ReactionPicker } from "@/components/chat/reaction-picker";
import { FilePreview } from "@/components/chat/file-preview";
import { MessageBody } from "@/components/chat/message-body";
import { CreateTaskFromMessageDialog } from "@/components/chat/create-task-from-message-dialog";
import { ScheduleEventFromMessageDialog } from "@/components/chat/schedule-event-from-message-dialog";
import type { Message, Project, User } from "@/lib/data/types";
import { cn, formatRelativeTime } from "@/lib/utils";

export function MessageBubble({
  message,
  currentUser,
  channelId,
  channelName = "channel",
  projects = [],
  members = [],
  linkedTask,
  highlight = false,
  onReply,
  onThread,
  onToggleReaction,
  onEdit,
  onDelete,
}: {
  message: Message;
  currentUser: User;
  channelId?: string;
  channelName?: string;
  projects?: Project[];
  members?: User[];
  linkedTask?: { id: string; title: string; projectId: string };
  highlight?: boolean;
  onReply?: (message: Message) => void;
  onThread?: (message: Message) => void;
  onToggleReaction?: (messageId: string, emoji: string, reactedByMe: boolean) => void;
  onEdit?: (messageId: string, body: string) => Promise<void>;
  onDelete?: (messageId: string) => Promise<void>;
}) {
  const router = useRouter();
  const [showPicker, setShowPicker] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(message.body);
  const isOwn = message.authorId === currentUser.id;

  return (
    <div
      id={highlight ? `message-${message.id}` : undefined}
      className={cn(
        "group flex gap-3",
        isOwn && "flex-row-reverse",
        highlight && "rounded-lg ring-2 ring-violet-500/50"
      )}
    >
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

        {message.body.trim() && !editing && (
          <div
            className={cn(
              "mt-1 rounded-lg px-3 py-2 text-sm",
              isOwn
                ? "bg-violet-600/30 text-violet-100"
                : "bg-zinc-800 text-zinc-200"
            )}
          >
            <MessageBody body={message.body} />
          </div>
        )}
        {message.body.trim() && channelId && (
          <MessageIntentChips
            body={message.body}
            onTask={() => setShowTaskDialog(true)}
            onEvent={() => setShowEventDialog(true)}
            onScript={() => router.push("/ai")}
          />
        )}
        {linkedTask && (
          <Link
            href={`/projects/${linkedTask.projectId}`}
            className={cn(
              "mt-1 inline-block rounded-full border border-violet-500/40 bg-violet-500/10 px-2 py-0.5 text-xs text-violet-300",
              isOwn && "float-right clear-both"
            )}
          >
            Linked task: {linkedTask.title}
          </Link>
        )}
        {editing && (
          <form
            className="mt-1 space-y-2"
            onSubmit={async (e) => {
              e.preventDefault();
              await onEdit?.(message.id, editBody);
              setEditing(false);
            }}
          >
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              rows={3}
            />
            <div className="flex gap-2">
              <Button type="submit" size="sm">Save</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.attachments.map((att) => (
              <FilePreview key={att.id} attachment={att} />
            ))}
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
            </Button>
          )}
          {onThread && !message.parentMessageId && (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              className="h-7 gap-1 px-2 text-xs text-zinc-500"
              onClick={() => onThread(message)}
            >
              <MessagesSquare className="h-3 w-3" />
              Thread
              {(message.replyCount ?? 0) > 0 && (
                <span className="text-violet-400">({message.replyCount})</span>
              )}
            </Button>
          )}
          {channelId && (message.replyCount ?? 0) > 0 && !message.parentMessageId && (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              className="h-7 gap-1 px-2 text-xs text-zinc-500"
              onClick={() => setShowSummaryDialog(true)}
            >
              <Sparkles className="h-3 w-3" />
              Summarize
            </Button>
          )}
          {channelId && message.body.trim() && (
            <>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                className="h-7 gap-1 px-2 text-xs text-zinc-500"
                onClick={() => setShowTaskDialog(true)}
              >
                <CheckSquare className="h-3 w-3" />
                Task
              </Button>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                className="h-7 gap-1 px-2 text-xs text-zinc-500"
                onClick={() => setShowEventDialog(true)}
              >
                <Calendar className="h-3 w-3" />
                Schedule
              </Button>
            </>
          )}
          {isOwn && onEdit && (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              className="h-7 px-2 text-xs text-zinc-500"
              onClick={() => {
                setEditBody(message.body);
                setEditing(true);
              }}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}
          {isOwn && onDelete && (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              className="h-7 px-2 text-xs text-zinc-500"
              onClick={() => void onDelete(message.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
        {channelId && (
          <>
            <CreateTaskFromMessageDialog
              message={message}
              channelId={channelId}
              channelName={channelName}
              projects={projects}
              members={members}
              open={showTaskDialog}
              onOpenChange={setShowTaskDialog}
            />
            <ScheduleEventFromMessageDialog
              messageBody={message.body}
              open={showEventDialog}
              onOpenChange={setShowEventDialog}
            />
            <ThreadSummarizeDialog
              channelId={channelId}
              parentMessageId={message.id}
              open={showSummaryDialog}
              onOpenChange={setShowSummaryDialog}
            />
          </>
        )}
      </div>
    </div>
  );
}
