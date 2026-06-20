"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/data/supabase/client";

type UnreadContextValue = {
  unreadCounts: Record<string, number>;
  clearUnread: (channelId: string) => void;
};

const UnreadContext = createContext<UnreadContextValue>({
  unreadCounts: {},
  clearUnread: () => {},
});

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

  const clearUnread = useCallback((channelId: string) => {
    setUnreadCounts((prev) => {
      if (!prev[channelId]) return prev;
      const next = { ...prev };
      delete next[channelId];
      return next;
    });
  }, []);

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

  const value = useMemo(
    () => ({ unreadCounts, clearUnread }),
    [unreadCounts, clearUnread]
  );

  return (
    <UnreadContext.Provider value={value}>{children}</UnreadContext.Provider>
  );
}

export function useUnreadCounts() {
  return useContext(UnreadContext).unreadCounts;
}

export function useClearUnread() {
  return useContext(UnreadContext).clearUnread;
}
