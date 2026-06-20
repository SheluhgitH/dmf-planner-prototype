"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/data/supabase/client";

type UnreadContextValue = {
  unreadCounts: Record<string, number>;
};

const UnreadContext = createContext<UnreadContextValue>({ unreadCounts: {} });

export function UnreadProvider({
  initialCounts,
  workspaceId,
  userId,
  channelIds,
  children,
}: {
  initialCounts: Record<string, number>;
  workspaceId: string;
  userId: string;
  channelIds: string[];
  children: React.ReactNode;
}) {
  const [unreadCounts, setUnreadCounts] = useState(initialCounts);

  useEffect(() => {
    setUnreadCounts(initialCounts);
  }, [initialCounts]);

  useEffect(() => {
    if (!isSupabaseConfigured() || !userId) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`unread:${workspaceId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new as { channel_id: string; author_id: string };
          if (row.author_id === userId) return;
          if (!channelIds.includes(row.channel_id)) return;
          setUnreadCounts((prev) => ({
            ...prev,
            [row.channel_id]: (prev[row.channel_id] ?? 0) + 1,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, userId, channelIds]);

  return (
    <UnreadContext.Provider value={{ unreadCounts }}>
      {children}
    </UnreadContext.Provider>
  );
}

export function useUnreadCounts() {
  return useContext(UnreadContext).unreadCounts;
}

export function useClearUnread(channelId: string) {
  const [, setCounts] = useState<Record<string, number>>({});
  return () => {
    setCounts((prev) => {
      const next = { ...prev, [channelId]: 0 };
      return next;
    });
  };
}
