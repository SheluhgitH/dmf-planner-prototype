import type {
  AiContext,
  PolishMode,
  RewriteMode,
  SummaryFocus,
} from "@/lib/ai/types";
import { getChannelFocusHint } from "@/lib/ai/channel-profiles";

function contextHeader(ctx: AiContext): string {
  const parts = [
    `Channel: #${ctx.channelName} (${ctx.channelType})`,
    `Messages: ${ctx.messageCount}`,
  ];
  if (ctx.dateRange) {
    parts.push(`Range: ${ctx.dateRange.from} – ${ctx.dateRange.to}`);
  }
  if (ctx.memberNames.length > 0) {
    parts.push(`Team: ${ctx.memberNames.join(", ")}`);
  }
  if (ctx.linkedProject) {
    parts.push(`Project: ${ctx.linkedProject.name}`);
  }
  if (ctx.upcomingEvents?.length) {
    parts.push(
      `Upcoming events: ${ctx.upcomingEvents.map((e) => `${e.title} (${e.date})`).join("; ")}`
    );
  }
  return parts.join("\n");
}

export function buildSummaryPrompt(ctx: AiContext, focus: SummaryFocus = "all"): string {
  const focusLine =
    focus === "decisions"
      ? "Focus only on decisions made."
      : focus === "actions"
        ? "Focus only on action items."
        : "Cover all sections below.";

  const example =
    focus === "all"
      ? `
Example input:
[Jun 20 2pm] Alex: Let's shoot Scene 3 Friday at the warehouse
[Jun 20 2:05pm] Jordan: I'll book the location

Example output:
## Decisions
- Scene 3 shoots Friday at the warehouse

## Action items
- Jordan: Book warehouse location

## Open questions
- (none)

## Parking lot
- (none)`
      : "";

  return `${getChannelFocusHint(ctx.channelType)}

${focusLine}

Output format:
## Decisions
## Action items
- [owner if known] task (due date if stated)
## Open questions
## Parking lot
${example}

Context:
${contextHeader(ctx)}

Transcript:
${ctx.transcript}`;
}

export function buildTaskCandidatesPrompt(ctx: AiContext): string {
  return `From this #${ctx.channelName} discussion, list only lines that imply a concrete action someone should take.
One action per line. Skip greetings, reactions, and vague chat.
Ignore lines that are already completed.

Transcript:
${ctx.transcript}`;
}

export function buildTasksPrompt(ctx: AiContext, candidates: string): string {
  const members =
    ctx.memberNames.length > 0
      ? ctx.memberNames.join(", ")
      : "none listed";

  return `Convert these action candidates into a JSON array for a creative studio task board.

Rules:
- Verb-led titles, max 80 characters
- assignee must be one of: ${members} — or omit assignee
- dueDate as YYYY-MM-DD only if clearly stated, else omit
- No duplicates

Example output:
[{"title":"Book warehouse for Scene 3","assignee":"Jordan","dueDate":"2026-06-27"}]

Return ONLY the JSON array. No markdown.

Candidates:
${candidates}`;
}

export function buildJsonRepairPrompt(broken: string): string {
  return `Fix this into valid JSON only. Return ONLY the corrected JSON array or object.

${broken}`;
}

export function buildBriefPrompt(ctx: AiContext): string {
  const taskBlock = ctx.linkedProject?.tasks.length
    ? `\nLinked project tasks:\n${ctx.linkedProject.tasks.map((t) => `- ${t.title} (${t.status})`).join("\n")}`
    : "";

  const ideasExtra =
    ctx.channelType === "ideas"
      ? `
## Logline
## Target audience
## 3-act skeleton`
      : "";

  return `${getChannelFocusHint(ctx.channelType)}

Write a project brief from this channel discussion.

Required sections:
## Overview
## Goals
## Current status
## Blocked / pending tasks
## Open questions
## Next 5 actions
${ideasExtra}
${taskBlock}

Context:
${contextHeader(ctx)}

Transcript:
${ctx.transcript}`;
}

export function buildRewritePrompt(text: string, mode: RewriteMode): string {
  const instructions: Record<RewriteMode, string> = {
    polish:
      "Polish dialogue and prose for clarity and flow. Preserve voice, character names, INT/EXT sluglines, and parentheticals. Do not change plot.",
    tighten:
      "Tighten pacing. Cut redundancy. Keep scene structure, character names, and sluglines intact.",
    grammar:
      "Fix grammar and spelling only. Minimal changes to wording and structure.",
    stage_directions:
      "Clean up stage directions and action lines. Keep dialogue unchanged. Standardize INT/EXT formatting.",
  };
  return `${instructions[mode]}

Return only the rewritten text.

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

export function buildBeatExtractorPrompt(ctx: AiContext): string {
  return `${getChannelFocusHint(ctx.channelType)}

Analyze this script/production discussion. Return ONLY JSON:
{"beats":[{"scene": string, "characters"?: string, "notes"?: string, "suggestedTask"?: string, "priority"?: "low"|"medium"|"high"}]}

Look for INT/EXT, Scene numbers, table reads, and production notes.

Context:
${contextHeader(ctx)}

Transcript:
${ctx.transcript}`;
}
