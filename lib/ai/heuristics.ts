import type { ExtractedTask, MessageIntent } from "@/lib/ai/types";

export function heuristicSummary(transcript: string): string {
  const lines = transcript.split("\n").filter((l) => l.trim().length > 20).slice(-10);
  const bullets = lines.map((l) => `• ${l.slice(0, 120)}`);
  return `Meeting Summary (offline draft)\n\n${bullets.join("\n")}\n\nAction items:\n• Review notes above\n• Follow up in project board`;
}

export function heuristicTasks(transcript: string): ExtractedTask[] {
  return transcript
    .split("\n")
    .filter((l) => l.trim().length > 15)
    .slice(-5)
    .map((l) => {
      const body = l.includes(": ") ? l.split(": ").slice(1).join(": ") : l;
      return { title: body.slice(0, 80) };
    });
}

export function heuristicBrief(transcript: string, channelName: string): string {
  return `Project Brief (offline draft)\n\nChannel: #${channelName}\n\n${transcript.slice(0, 800)}\n\nNext steps: refine goals, assign owners, set deadlines.`;
}

export function heuristicRewrite(text: string): string {
  return text.trim();
}

export function heuristicPolish(text: string, mode: string): string {
  const trimmed = text.trim();
  if (mode === "shorten" && trimmed.length > 80) {
    return trimmed.slice(0, Math.max(60, trimmed.length - 40)).trim() + "…";
  }
  return trimmed;
}

export function heuristicIntent(body: string): MessageIntent[] {
  const lower = body.toLowerCase();
  const intents: MessageIntent[] = [];
  if (
    /\b(todo|task|need to|should|assign|deadline|finish|complete)\b/.test(lower)
  ) {
    intents.push("task");
  }
  if (
    /\b(meet|event|table read|shoot|friday|monday|schedule|rsvp|rehearsal)\b/.test(
      lower
    )
  ) {
    intents.push("event");
  }
  if (
    /\b(scene|script|dialogue|act|character|beat|draft|rewrite)\b/.test(lower)
  ) {
    intents.push("script");
  }
  return intents;
}

export function heuristicTaskPrefill(body: string): {
  title: string;
  dueDate?: string;
} {
  const title = body.split("\n")[0]?.slice(0, 200) || body.slice(0, 200);
  const dateMatch = body.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  return { title, dueDate: dateMatch?.[1] };
}

export function heuristicEventPrefill(body: string): {
  title: string;
  date?: string;
  time?: string;
  location?: string;
} {
  const title = body.split("\n")[0]?.slice(0, 120) || body.slice(0, 120);
  const dateMatch = body.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  const timeMatch = body.match(/\b(\d{1,2}:\d{2})\b/);
  const locMatch = body.match(/\bat\s+([^,.!\n]+)/i);
  return {
    title,
    date: dateMatch?.[1],
    time: timeMatch?.[1],
    location: locMatch?.[1]?.trim(),
  };
}

export function heuristicDigest(context: string): string {
  const lines = context.split("\n").filter(Boolean).slice(0, 8);
  return `Studio Digest (offline)\n\n${lines.join("\n")}\n\n— Enable Chrome/Edge WebGPU for AI-powered digest.`;
}

export function heuristicBeatExtractor(transcript: string): string {
  const scenes = transcript
    .split("\n")
    .filter((l) => /scene|act|int\.|ext\./i.test(l))
    .slice(0, 8);
  if (scenes.length === 0) {
    return "Script Beat Extractor (offline)\n\nNo scene markers detected. Paste script text with INT./EXT. or Scene headings.";
  }
  return `Script Beats (offline)\n\n${scenes.map((s) => `• ${s}`).join("\n")}`;
}
