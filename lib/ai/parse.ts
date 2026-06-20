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

export function formatTranscript(
  messages: { author?: string; body: string }[],
  max = 30
): string {
  const slice = messages.slice(-max);
  return slice
    .map((m) => `${m.author ?? "User"}: ${m.body}`)
    .join("\n");
}
