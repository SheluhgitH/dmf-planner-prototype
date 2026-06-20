import type { ExtractedBeat, ExtractedTask, AiMember } from "@/lib/ai/types";

export function normalizeDate(str?: string): string | undefined {
  if (!str?.trim()) return undefined;
  const trimmed = str.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = Date.parse(trimmed);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString().split("T")[0];
  }
  return undefined;
}

export function matchAssignee(
  name: string | undefined,
  members: AiMember[]
): string | undefined {
  if (!name?.trim() || members.length === 0) return undefined;
  const q = name.trim().toLowerCase();
  const exact = members.find((m) => m.displayName.toLowerCase() === q);
  if (exact) return exact.id;
  const partial = members.find(
    (m) =>
      m.displayName.toLowerCase().includes(q) ||
      q.includes(m.displayName.toLowerCase().replace(/\s/g, ""))
  );
  return partial?.id;
}

export function dedupeTasks(tasks: ExtractedTask[]): ExtractedTask[] {
  const seen = new Set<string>();
  return tasks.filter((t) => {
    const key = t.title.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function validateAndEnrichTasks(
  tasks: ExtractedTask[],
  members: AiMember[]
): ExtractedTask[] {
  return dedupeTasks(
    tasks
      .map((t) => ({
        ...t,
        title: t.title.trim().slice(0, 120),
        dueDate: normalizeDate(t.dueDate),
        assigneeId: matchAssignee(t.assignee, members),
        selected: t.selected ?? true,
      }))
      .filter((t) => t.title.length > 0)
  );
}

export function validateBeats(beats: ExtractedBeat[]): ExtractedBeat[] {
  const seen = new Set<string>();
  return beats.filter((b) => {
    const key = b.scene.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function resolveChannelType(channelName: string): import("@/lib/ai/types").ChannelType {
  const name = channelName.toLowerCase();
  if (name.startsWith("project-")) return "project";
  if (name === "scripts") return "scripts";
  if (name === "ideas") return "ideas";
  if (name === "events") return "events";
  return "general";
}
