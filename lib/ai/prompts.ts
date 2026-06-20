import type { PolishMode } from "@/lib/ai/types";

export function buildSummaryPrompt(transcript: string, channelName: string): string {
  return `You are a production assistant for a creative studio. Summarize this #${channelName} channel discussion.

Output format:
## Summary
(bullet points)

## Action items
- [owner if known] task

Keep it concise and practical.

Transcript:
${transcript}`;
}

export function buildTasksPrompt(transcript: string, channelName: string): string {
  return `Extract actionable tasks from this #${channelName} discussion.

Return ONLY a JSON array with objects: {"title": string, "assignee"?: string, "dueDate"?: "YYYY-MM-DD"}
No markdown, no explanation.

Transcript:
${transcript}`;
}

export function buildBriefPrompt(
  transcript: string,
  channelName: string,
  taskTitles: string
): string {
  return `Write a project brief from this creative studio channel #${channelName}.

## Overview
## Goals
## Open questions
## Blocked / pending tasks
${taskTitles ? `\nKnown tasks:\n${taskTitles}` : ""}

Transcript:
${transcript}`;
}

export function buildRewritePrompt(text: string): string {
  return `Polish this script or creative writing. Preserve meaning and voice. Return only the rewritten text.

${text}`;
}

export function buildPolishPrompt(text: string, mode: PolishMode): string {
  const instructions: Record<PolishMode, string> = {
    shorten: "Make this message shorter while keeping the meaning.",
    clarify: "Make this message clearer and easier to understand.",
    professional: "Make this message more professional but friendly.",
    grammar: "Fix grammar and spelling only. Minimal changes.",
    emoji: "Add light emoji tone where appropriate. Keep it brief.",
  };
  return `${instructions[mode]}\n\nReturn only the revised message.\n\n${text}`;
}

export function buildIntentPrompt(body: string): string {
  return `Classify this chat message. Reply with ONLY a JSON array containing zero or more of: "task", "event", "script"

Message: ${body}`;
}

export function buildTaskPrefillPrompt(
  body: string,
  channelName: string,
  memberNames: string[]
): string {
  return `Extract task fields from this message in #${channelName}.
Return ONLY JSON: {"title": string, "assignee"?: string, "dueDate"?: "YYYY-MM-DD", "projectHint"?: string}
Team members: ${memberNames.join(", ")}

Message:
${body}`;
}

export function buildEventPrefillPrompt(body: string): string {
  return `Extract event fields from this message.
Return ONLY JSON: {"title": string, "date"?: "YYYY-MM-DD", "time"?: "HH:MM", "location"?: string}
Use today's year if year omitted. Message:
${body}`;
}

export function buildThreadSummaryPrompt(transcript: string): string {
  return `Summarize this thread in 3-5 bullet points. Include decisions and next steps.

${transcript}`;
}

export function buildDigestPrompt(context: string): string {
  return `Write a 5-line "studio digest" for a creative team — what happened, what's due, what's next. Be specific.

${context}`;
}

export function buildBeatExtractorPrompt(transcript: string): string {
  return `Analyze this script/production discussion. Return ONLY JSON:
{"beats":[{"scene": string, "notes"?: string, "suggestedTask"?: string}]}

Transcript:
${transcript}`;
}
