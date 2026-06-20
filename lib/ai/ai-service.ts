"use client";

import {
  heuristicBeatExtractor,
  heuristicBrief,
  heuristicDigest,
  heuristicEventPrefill,
  heuristicIntent,
  heuristicPolish,
  heuristicRewrite,
  heuristicSummary,
  heuristicTaskPrefill,
  heuristicTasks,
} from "@/lib/ai/heuristics";
import {
  buildBeatExtractorPrompt,
  buildBriefPrompt,
  buildDigestPrompt,
  buildEventPrefillPrompt,
  buildIntentPrompt,
  buildPolishPrompt,
  buildRewritePrompt,
  buildSummaryPrompt,
  buildTaskPrefillPrompt,
  buildTasksPrompt,
  buildThreadSummaryPrompt,
} from "@/lib/ai/prompts";
import {
  parseBeatsFromModel,
  parseIntentsFromModel,
  parseTasksFromModel,
  extractJson,
} from "@/lib/ai/parse";
import type {
  ExtractedBeat,
  ExtractedTask,
  MessageIntent,
  PolishMode,
} from "@/lib/ai/types";
import { isWebGPUSupported } from "@/lib/ai/webgpu";
import { webLLMEngine } from "@/lib/ai/webllm-engine";

const SYSTEM = "You are a helpful creative studio assistant for DMF Planner.";

export function canUseWebLLM(): boolean {
  return isWebGPUSupported();
}

export async function generateSummary(
  transcript: string,
  channelName: string
): Promise<string> {
  if (!canUseWebLLM()) return heuristicSummary(transcript);
  try {
    return await webLLMEngine.complete(
      "quality",
      SYSTEM,
      buildSummaryPrompt(transcript, channelName),
      800
    );
  } catch {
    return heuristicSummary(transcript);
  }
}

export async function extractTasks(
  transcript: string,
  channelName: string
): Promise<ExtractedTask[]> {
  if (!canUseWebLLM()) return heuristicTasks(transcript);
  try {
    const raw = await webLLMEngine.complete(
      "quality",
      SYSTEM,
      buildTasksPrompt(transcript, channelName),
      600
    );
    const tasks = parseTasksFromModel(raw);
    return tasks.length > 0 ? tasks : heuristicTasks(transcript);
  } catch {
    return heuristicTasks(transcript);
  }
}

export async function generateBrief(
  transcript: string,
  channelName: string,
  taskTitles = ""
): Promise<string> {
  if (!canUseWebLLM()) return heuristicBrief(transcript, channelName);
  try {
    return await webLLMEngine.complete(
      "quality",
      SYSTEM,
      buildBriefPrompt(transcript, channelName, taskTitles),
      1000
    );
  } catch {
    return heuristicBrief(transcript, channelName);
  }
}

export async function rewriteScript(text: string): Promise<string> {
  if (!canUseWebLLM()) return heuristicRewrite(text);
  try {
    return await webLLMEngine.complete(
      "quality",
      SYSTEM,
      buildRewritePrompt(text),
      1200
    );
  } catch {
    return heuristicRewrite(text);
  }
}

export async function polishMessage(
  text: string,
  mode: PolishMode
): Promise<string> {
  if (!canUseWebLLM()) return heuristicPolish(text, mode);
  try {
    return await webLLMEngine.complete(
      "fast",
      SYSTEM,
      buildPolishPrompt(text, mode),
      400
    );
  } catch {
    return heuristicPolish(text, mode);
  }
}

export async function classifyMessageIntent(
  body: string
): Promise<MessageIntent[]> {
  if (!canUseWebLLM() || body.trim().length < 12) {
    return heuristicIntent(body);
  }
  try {
    const raw = await webLLMEngine.complete(
      "fast",
      SYSTEM,
      buildIntentPrompt(body),
      64
    );
    const intents = parseIntentsFromModel(raw);
    return intents.length > 0 ? intents : heuristicIntent(body);
  } catch {
    return heuristicIntent(body);
  }
}

export async function prefillTaskFromMessage(
  body: string,
  channelName: string,
  memberNames: string[]
): Promise<{
  title: string;
  assignee?: string;
  dueDate?: string;
  projectHint?: string;
}> {
  if (!canUseWebLLM()) return heuristicTaskPrefill(body);
  try {
    const raw = await webLLMEngine.complete(
      "quality",
      SYSTEM,
      buildTaskPrefillPrompt(body, channelName, memberNames),
      256
    );
    const parsed = extractJson<{
      title?: string;
      assignee?: string;
      dueDate?: string;
      projectHint?: string;
    }>(raw);
    if (parsed?.title) return { title: parsed.title, ...parsed };
    return heuristicTaskPrefill(body);
  } catch {
    return heuristicTaskPrefill(body);
  }
}

export async function prefillEventFromMessage(body: string): Promise<{
  title: string;
  date?: string;
  time?: string;
  location?: string;
}> {
  if (!canUseWebLLM()) return heuristicEventPrefill(body);
  try {
    const raw = await webLLMEngine.complete(
      "quality",
      SYSTEM,
      buildEventPrefillPrompt(body),
      256
    );
    const parsed = extractJson<{
      title?: string;
      date?: string;
      time?: string;
      location?: string;
    }>(raw);
    if (parsed?.title) return parsed as { title: string; date?: string; time?: string; location?: string };
    return heuristicEventPrefill(body);
  } catch {
    return heuristicEventPrefill(body);
  }
}

export async function summarizeThread(transcript: string): Promise<string> {
  if (!canUseWebLLM()) return heuristicSummary(transcript);
  try {
    return await webLLMEngine.complete(
      "quality",
      SYSTEM,
      buildThreadSummaryPrompt(transcript),
      500
    );
  } catch {
    return heuristicSummary(transcript);
  }
}

export async function generateStudioDigest(context: string): Promise<string> {
  if (!canUseWebLLM()) return heuristicDigest(context);
  try {
    return await webLLMEngine.complete(
      "quality",
      SYSTEM,
      buildDigestPrompt(context),
      400
    );
  } catch {
    return heuristicDigest(context);
  }
}

export async function extractScriptBeats(
  transcript: string
): Promise<{ beats: ExtractedBeat[]; formatted: string }> {
  if (!canUseWebLLM()) {
    return { beats: [], formatted: heuristicBeatExtractor(transcript) };
  }
  try {
    const raw = await webLLMEngine.complete(
      "quality",
      SYSTEM,
      buildBeatExtractorPrompt(transcript),
      900
    );
    const beats = parseBeatsFromModel(raw);
    if (beats.length === 0) {
      return { beats: [], formatted: heuristicBeatExtractor(transcript) };
    }
    const formatted =
      "## Script beats\n\n" +
      beats
        .map((b) => {
          let line = `### ${b.scene}`;
          if (b.notes) line += `\n${b.notes}`;
          if (b.suggestedTask) line += `\n→ Task: ${b.suggestedTask}`;
          return line;
        })
        .join("\n\n");
    return { beats, formatted };
  } catch {
    return { beats: [], formatted: heuristicBeatExtractor(transcript) };
  }
}

export { webLLMEngine };
