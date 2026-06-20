"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/data/supabase/client";
import type { Message, User } from "@/lib/data/types";
import { cn, formatRelativeTime } from "@/lib/utils";

export function ChatView({
  channelId,
  channelName,
  initialMessages,
  currentUser,
}: {
  channelId: string;
  channelName: string;
  initialMessages: Message[];
  currentUser: User;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`room:${channelId}`)
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
            created_at: string;
          };
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", row.author_id)
            .single();
          setMessages((prev) => [
            ...prev,
            {
              id: row.id,
              channelId: row.channel_id,
              authorId: row.author_id,
              body: row.body,
              createdAt: row.created_at,
              author: {
                id: row.author_id,
                email: "",
                displayName: profile?.display_name ?? "Member",
              },
            },
          ]);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const body = input.trim();
    if (!body) return;

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("messages")
        .insert({ channel_id: channelId, author_id: user.id, body })
        .select("id, channel_id, author_id, body, created_at")
        .single();

      if (!error && data) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .single();
        const msg: Message = {
          id: data.id,
          channelId: data.channel_id,
          authorId: data.author_id,
          body: data.body,
          createdAt: data.created_at,
          author: {
            id: user.id,
            email: user.email ?? "",
            displayName: profile?.display_name ?? "You",
          },
        };
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    } else {
      const newMsg: Message = {
        id: `local-${Date.now()}`,
        channelId,
        authorId: currentUser.id,
        body,
        createdAt: new Date().toISOString(),
        author: currentUser,
      };
      setMessages((prev) => [...prev, newMsg]);
    }
    setInput("");
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-800 px-6 py-4">
        <h1 className="flex items-center gap-2 text-lg font-semibold text-zinc-100">
          <span className="text-zinc-500">#</span>
          {channelName}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="space-y-4">
          {messages.map((msg) => {
            const isOwn = msg.authorId === currentUser.id;
            return (
              <div
                key={msg.id}
                className={cn("flex gap-3", isOwn && "flex-row-reverse")}
              >
                <Avatar name={msg.author?.displayName ?? "?"} />
                <div className={cn("max-w-[70%]", isOwn && "text-right")}>
                  <div
                    className={cn(
                      "flex items-baseline gap-2",
                      isOwn && "flex-row-reverse"
                    )}
                  >
                    <span className="text-sm font-medium text-zinc-200">
                      {msg.author?.displayName}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {formatRelativeTime(msg.createdAt)}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "mt-1 rounded-lg px-3 py-2 text-sm",
                      isOwn
                        ? "bg-violet-600/30 text-violet-100"
                        : "bg-zinc-800 text-zinc-200"
                    )}
                  >
                    {msg.body}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      <form
        onSubmit={handleSend}
        className="border-t border-zinc-800 p-4"
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message #${channelName}`}
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <Button type="submit" size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
