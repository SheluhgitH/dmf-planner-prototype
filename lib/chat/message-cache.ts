import type { Message } from "@/lib/data/types";

function cacheKey(channelId: string) {
  return `dmf-chat-cache:${channelId}`;
}

export function loadCachedMessages(channelId: string): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(cacheKey(channelId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Message[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCachedMessages(channelId: string, messages: Message[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      cacheKey(channelId),
      JSON.stringify(messages.slice(-500))
    );
  } catch {
    // ignore quota errors
  }
}

export function mergeMessageLists(
  ...lists: Message[][]
): Message[] {
  const byId = new Map<string, Message>();
  for (const list of lists) {
    for (const message of list) {
      const existing = byId.get(message.id);
      if (!existing) {
        byId.set(message.id, message);
        continue;
      }
      const existingAtt = existing.attachments?.length ?? 0;
      const nextAtt = message.attachments?.length ?? 0;
      byId.set(
        message.id,
        nextAtt > existingAtt ? message : { ...existing, ...message }
      );
    }
  }
  return [...byId.values()].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}
