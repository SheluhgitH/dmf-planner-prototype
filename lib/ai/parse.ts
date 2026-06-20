import type { Message } from "@/lib/data/types";
import type { ExtractedBeat, ExtractedTask, MessageIntent } from "@/lib/ai/types";

export function extractJson<T>(text: string): T | null {
  const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}

export function parseTasksFromModel(text: string): ExtractedTask[] {
  const parsed = extractJson<ExtractedTask[] | { tasks: ExtractedTask[] }>(text);
  if (Array.isArray(parsed)) return parsed.filter((t) => t.title?.trim());
  if (parsed && "tasks" in parsed && Array.isArray(parsed.tasks)) {
    return parsed.tasks.filter((t) => t.title?.trim());
  }
  return [];
}

export function parseIntentsFromModel(text: string): MessageIntent[] {
  const parsed = extractJson<MessageIntent[]>(text);
  if (!parsed) return [];
  return parsed.filter((i) => i === "task" || i === "event" || i === "script");
}

export function parseBeatsFromModel(text: string): ExtractedBeat[] {
  const parsed = extractJson<{ beats: ExtractedBeat[] }>(text);
  if (!parsed?.beats) return [];
  return parsed.beats.filter((b) => b.scene?.trim());
}

export function formatTranscriptFromMessages(
  messages: Message[],
  max = 30
): { transcript: string; messageCount: number; dateRange?: { from: string; to: string } } {
  const slice = messages
    .filter((m) => m.body.trim().length > 0)
    .slice(-max);

  const lines = slice.map((m) => {
    const ts = formatMessageTimestamp(m.createdAt);
    const author = m.author?.displayName ?? "User";
    return `[${ts}] ${author}: ${m.body.trim()}`;
  });

  const dateRange =
    slice.length > 0
      ? {
          from: formatMessageTimestamp(slice[0].createdAt),
          to: formatMessageTimestamp(slice[slice.length - 1].createdAt),
        }
      : undefined;

  return {
    transcript: lines.join("\n"),
    messageCount: slice.length,
    dateRange,
  };
}

function formatMessageTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatContextStats(
  channelName: string,
  messageCount: number,
  memberCount: number
): string {
  return `Using ${messageCount} message${messageCount === 1 ? "" : "s"} from #${channelName} · ${memberCount} team member${memberCount === 1 ? "" : "s"}`;
}
