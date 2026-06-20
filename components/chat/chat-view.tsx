"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageBubble } from "@/components/chat/message-bubble";
import { MessageComposer } from "@/components/chat/message-composer";
import { ThreadPanel } from "@/components/chat/thread-panel";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/data/supabase/client";
import {
  addReactionAction,
  getChannelMessagesAction,
  getOlderMessagesAction,
  getThreadRepliesAction,
  markChannelReadAction,
  removeReactionAction,
  sendMessageAction,
  uploadChatAttachmentAction,
} from "@/lib/actions/chat";
import {
  loadCachedMessages,
  mergeMessageLists,
  saveCachedMessages,
} from "@/lib/chat/message-cache";
import type { Message, MessageReaction, User } from "@/lib/data/types";

const MESSAGE_PAGE_SIZE = 50;
const INITIAL_MESSAGE_LIMIT = 100;

function mergeReaction(
  reactions: MessageReaction[] | undefined,
  emoji: string,
  add: boolean,
  userId: string
): MessageReaction[] {
  const list = [...(reactions ?? [])];
  const idx = list.findIndex((r) => r.emoji === emoji);
  if (add) {
    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        count: list[idx].count + 1,
        reactedByMe: true,
      };
    } else {
      list.push({ emoji, count: 1, reactedByMe: true });
    }
  } else if (idx >= 0) {
    const next = list[idx].count - 1;
    if (next <= 0) list.splice(idx, 1);
    else list[idx] = { ...list[idx], count: next, reactedByMe: false };
  }
  return list;
}

export function ChatView({
  channelId,
  channelName,
  workspaceId,
  initialMessages,
  currentUser,
}: {
  channelId: string;
  channelName: string;
  workspaceId: string;
  initialMessages: Message[];
  currentUser: User;
}) {
  const [messages, setMessages] = useState<Message[]>(() =>
    mergeMessageLists(loadCachedMessages(channelId), initialMessages)
  );
  const [threadParent, setThreadParent] = useState<Message | null>(null);
  const [threadReplies, setThreadReplies] = useState<Message[]>([]);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const broadcastRef = useRef<ReturnType<
    ReturnType<typeof createClient>["channel"]
  > | null>(null);
  const [hasMore, setHasMore] = useState(
    initialMessages.length >= INITIAL_MESSAGE_LIMIT
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const messagesRef = useRef(messages);
  const hasMoreRef = useRef(hasMore);
  const loadingMoreRef = useRef(loadingMore);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    loadingMoreRef.current = loadingMore;
  }, [loadingMore]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    const merged = mergeMessageLists(
      loadCachedMessages(channelId),
      initialMessages
    );
    setMessages(merged);
    setHasMore(initialMessages.length >= INITIAL_MESSAGE_LIMIT);
    setFetchError(null);
  }, [channelId, initialMessages]);

  useEffect(() => {
    saveCachedMessages(channelId, messages);
  }, [channelId, messages]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    let cancelled = false;
    (async () => {
      const { messages: freshMessages, error } = await getChannelMessagesAction(
        channelId,
        INITIAL_MESSAGE_LIMIT
      );
      if (cancelled) return;
      if (error) {
        setFetchError(error);
        return;
      }
      if (freshMessages?.length) {
        setMessages((prev) => mergeMessageLists(prev, freshMessages));
        setHasMore(freshMessages.length >= INITIAL_MESSAGE_LIMIT);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [channelId]);

  const loadOlderMessages = useCallback(async () => {
    if (!isSupabaseConfigured() || loadingMoreRef.current || !hasMoreRef.current) {
      return;
    }

    const scrollEl = scrollRef.current;
    const oldestMessageId = messagesRef.current[0]?.id;
    if (!oldestMessageId) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);

    const scrollHeightBefore = scrollEl?.scrollHeight ?? 0;
    const { messages: olderMessages, error } = await getOlderMessagesAction(
      channelId,
      oldestMessageId,
      MESSAGE_PAGE_SIZE
    );

    if (error) {
      setFetchError(error);
      setHasMore(false);
    } else if (olderMessages?.length) {
      setMessages((prev) => mergeMessageLists(olderMessages, prev));
      if (olderMessages.length < MESSAGE_PAGE_SIZE) {
        setHasMore(false);
      }
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop =
            scrollRef.current.scrollHeight - scrollHeightBefore;
        }
      });
    } else {
      setHasMore(false);
    }

    loadingMoreRef.current = false;
    setLoadingMore(false);
  }, [channelId]);

  useEffect(() => {
    if (initialMessages.length > 0) {
      scrollToBottom("instant");
    }
  }, [channelId, initialMessages, scrollToBottom]);

  useEffect(() => {
    if (!loadingMore && messages.length > initialMessages.length) {
      scrollToBottom("smooth");
    }
  }, [messages.length, loadingMore, initialMessages.length, scrollToBottom]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    markChannelReadAction(channelId);
  }, [channelId]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const scrollEl = scrollRef.current;
    const topEl = topRef.current;
    if (!scrollEl || !topEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadOlderMessages();
        }
      },
      { root: scrollEl, rootMargin: "120px", threshold: 0 }
    );

    observer.observe(topEl);
    return () => observer.disconnect();
  }, [channelId, loadOlderMessages, hasMore]);

  const upsertMessage = useCallback((msg: Message) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, []);

  const appendAttachment = useCallback(
    (messageId: string, attachment: NonNullable<Message["attachments"]>[0]) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                attachments: [...(m.attachments ?? []), attachment],
              }
            : m
        )
      );
      setThreadReplies((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                attachments: [...(m.attachments ?? []), attachment],
              }
            : m
        )
      );
    },
    []
  );

  const updateReactions = useCallback(
    (messageId: string, emoji: string, add: boolean) => {
      const updater = (m: Message) =>
        m.id === messageId
          ? {
              ...m,
              reactions: mergeReaction(
                m.reactions,
                emoji,
                add,
                currentUser.id
              ),
            }
          : m;
      setMessages((prev) => prev.map(updater));
      setThreadReplies((prev) => prev.map(updater));
      if (threadParent?.id === messageId) {
        setThreadParent((p) =>
          p ? { ...p, reactions: mergeReaction(p.reactions, emoji, add, currentUser.id) } : p
        );
      }
    },
    [currentUser.id, threadParent?.id]
  );


  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();

    const room = supabase.channel(`room:${channelId}`, {
      config: { broadcast: { self: false } },
    });

    room
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const { userId, name } = payload as { userId: string; name: string };
        if (userId === currentUser.id) return;
        setTypingUsers((prev) => ({ ...prev, [userId]: name }));
        setTimeout(() => {
          setTypingUsers((prev) => {
            const next = { ...prev };
            delete next[userId];
            return next;
          });
        }, 3000);
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          const row = payload.new as {
            id: string;
            channel_id: string;
            author_id: string;
            body: string;
            parent_message_id: string | null;
            created_at: string;
          };
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", row.author_id)
            .single();

          const msg: Message = {
            id: row.id,
            channelId: row.channel_id,
            authorId: row.author_id,
            body: row.body,
            createdAt: row.created_at,
            parentMessageId: row.parent_message_id ?? undefined,
            author: {
              id: row.author_id,
              email: "",
              displayName: profile?.display_name ?? "Member",
            },
          };

          if (row.parent_message_id) {
            setThreadReplies((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
            setMessages((prev) =>
              prev.map((m) =>
                m.id === row.parent_message_id
                  ? { ...m, replyCount: (m.replyCount ?? 0) + 1 }
                  : m
              )
            );
          } else {
            upsertMessage(msg);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_attachments",
        },
        async (payload) => {
          const row = payload.new as {
            id: string;
            message_id: string;
            storage_path: string;
            file_name: string;
            mime_type: string | null;
            file_size: number | null;
          };
          const { data: signed } = await supabase.storage
            .from("chat-attachments")
            .createSignedUrl(row.storage_path, 3600);
          appendAttachment(row.message_id, {
            id: row.id,
            fileName: row.file_name,
            mimeType: row.mime_type ?? undefined,
            fileSize: row.file_size ?? undefined,
            storagePath: row.storage_path,
            url: signed?.signedUrl,
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_reactions",
        },
        (payload) => {
          const row = payload.new as {
            message_id: string;
            user_id: string;
            emoji: string;
          };
          if (row.user_id === currentUser.id) return;
          updateReactions(row.message_id, row.emoji, true);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "message_reactions",
        },
        (payload) => {
          const row = payload.old as {
            message_id: string;
            user_id: string;
            emoji: string;
          };
          if (row.user_id === currentUser.id) return;
          updateReactions(row.message_id, row.emoji, false);
        }
      )
      .subscribe();

    broadcastRef.current = room;

    return () => {
      supabase.removeChannel(room);
    };
  }, [
    channelId,
    currentUser.id,
    upsertMessage,
    appendAttachment,
    updateReactions,
  ]);

  function broadcastTyping() {
    if (!isSupabaseConfigured() || !broadcastRef.current) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      broadcastRef.current?.send({
        type: "broadcast",
        event: "typing",
        payload: { userId: currentUser.id, name: currentUser.displayName },
      });
    }, 300);
  }

  async function handleSend(body: string, file?: File, parentId?: string) {
    setUploadError(null);
    if (isSupabaseConfigured()) {
      const { message, error } = await sendMessageAction(
        channelId,
        body,
        parentId ?? replyTo?.id
      );
      if (error || !message) {
        setUploadError(error ?? "Failed to send message");
        return;
      }

      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        const { attachment, error: uploadErr } = await uploadChatAttachmentAction(
          workspaceId,
          channelId,
          message.id,
          fd
        );
        if (uploadErr) {
          setUploadError(uploadErr);
        }
        if (attachment) {
          appendAttachment(message.id, attachment);
          message.attachments = [attachment];
        }
      }

      if (parentId || replyTo?.id) {
        setThreadReplies((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
        const parentMsgId = parentId ?? replyTo?.id;
        if (parentMsgId) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === parentMsgId
                ? { ...m, replyCount: (m.replyCount ?? 0) + 1 }
                : m
            )
          );
        }
        setReplyTo(null);
      } else {
        upsertMessage(message);
      }
    } else {
      const newMsg: Message = {
        id: `local-${Date.now()}`,
        channelId,
        authorId: currentUser.id,
        body,
        createdAt: new Date().toISOString(),
        author: currentUser,
        parentMessageId: parentId ?? replyTo?.id,
      };
      if (newMsg.parentMessageId) {
        setThreadReplies((prev) => [...prev, newMsg]);
      } else {
        setMessages((prev) => [...prev, newMsg]);
      }
      setReplyTo(null);
    }
  }

  async function openThread(message: Message) {
    setThreadParent(message);
    if (isSupabaseConfigured()) {
      const { replies } = await getThreadRepliesAction(message.id);
      setThreadReplies(replies ?? []);
    } else {
      setThreadReplies([]);
    }
  }

  async function handleToggleReaction(
    messageId: string,
    emoji: string,
    reactedByMe: boolean
  ) {
    if (isSupabaseConfigured()) {
      if (reactedByMe) {
        await removeReactionAction(messageId, emoji, channelId);
        updateReactions(messageId, emoji, false);
      } else {
        await addReactionAction(messageId, emoji, channelId);
        updateReactions(messageId, emoji, true);
      }
    } else {
      updateReactions(messageId, emoji, !reactedByMe);
    }
  }

  const typingNames = Object.values(typingUsers);

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-zinc-800 px-6 py-4">
          <h1 className="flex items-center gap-2 text-lg font-semibold text-zinc-100">
            <span className="text-zinc-500">#</span>
            {channelName}
          </h1>
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto px-6 py-4"
          ref={scrollRef}
        >
          <div ref={topRef} />
          {fetchError && (
            <div className="mb-3 rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-center text-sm text-red-300">
              {fetchError}
            </div>
          )}
          {loadingMore && (
            <div className="py-2 text-center text-sm text-zinc-500">
              Loading older messages...
            </div>
          )}
          {hasMore && !loadingMore && messages.length > 0 && (
            <div className="pb-3 text-center">
              <button
                type="button"
                onClick={() => void loadOlderMessages()}
                className="text-sm text-violet-300 hover:text-violet-200"
              >
                Load older messages
              </button>
            </div>
          )}
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm text-zinc-400">
                  No messages in #{channelName} yet.
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Say hello to start the conversation.
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  currentUser={currentUser}
                  onReply={openThread}
                  onToggleReaction={handleToggleReaction}
                />
              ))
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        <TypingIndicator names={typingNames} />

        <div className="shrink-0">
          <MessageComposer
          channelName={channelName}
          uploadError={uploadError}
          replyTo={
            replyTo
              ? {
                  id: replyTo.id,
                  authorName: replyTo.author?.displayName ?? "Member",
                  body: replyTo.body,
                }
              : undefined
          }
          onCancelReply={() => setReplyTo(null)}
          onSend={(body, file) => handleSend(body, file)}
          onTyping={broadcastTyping}
          />
        </div>
      </div>

      {threadParent && (
        <ThreadPanel
          parentMessage={threadParent}
          replies={threadReplies}
          currentUser={currentUser}
          channelName={channelName}
          onClose={() => {
            setThreadParent(null);
            setThreadReplies([]);
          }}
          onSend={(body, file) => handleSend(body, file, threadParent.id)}
          onToggleReaction={handleToggleReaction}
          uploadError={uploadError}
        />
      )}
    </div>
  );
}
