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
import { getChannelSystemPrompt } from "@/lib/ai/channel-profiles";
import { getGenerationConfig } from "@/lib/ai/generation-config";
import {
  buildBeatExtractorPrompt,
  buildBriefPrompt,
  buildDigestPrompt,
  buildEventPrefillPrompt,
  buildIntentPrompt,
  buildJsonRepairPrompt,
  buildPolishPrompt,
  buildRewritePrompt,
  buildSummaryPrompt,
  buildTaskCandidatesPrompt,
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
  AiContext,
  AiMember,
  ExtractedBeat,
  ExtractedTask,
  MessageIntent,
  PolishMode,
  RewriteMode,
  SummaryFocus,
} from "@/lib/ai/types";
import { validateAndEnrichTasks, validateBeats } from "@/lib/ai/validate";
import { isWebGPUSupported } from "@/lib/ai/webgpu";
import { webLLMEngine } from "@/lib/ai/webllm-engine";

export function canUseWebLLM(): boolean {
  return isWebGPUSupported();
}

async function runQuality(
  ctx: AiContext,
  userPrompt: string,
  tool: keyof typeof import("@/lib/ai/generation-config").GENERATION_CONFIG
): Promise<string> {
  const config = getGenerationConfig(tool);
  return webLLMEngine.complete(
    config.tier,
    getChannelSystemPrompt(ctx.channelType),
    userPrompt,
    { temperature: config.temperature, maxTokens: config.maxTokens }
  );
}

async function runQualityStream(
  ctx: AiContext,
  userPrompt: string,
  tool: keyof typeof import("@/lib/ai/generation-config").GENERATION_CONFIG
): Promise<AsyncGenerator<string>> {
  const config = getGenerationConfig(tool);
  return webLLMEngine.stream(
    config.tier,
    getChannelSystemPrompt(ctx.channelType),
    userPrompt,
    { temperature: config.temperature, maxTokens: config.maxTokens }
  );
}

async function repairJson(raw: string, ctx: AiContext): Promise<string> {
  const config = getGenerationConfig("jsonRepair");
  return webLLMEngine.complete(
    config.tier,
    getChannelSystemPrompt(ctx.channelType),
    buildJsonRepairPrompt(raw),
    { temperature: config.temperature, maxTokens: config.maxTokens }
  );
}

export async function generateSummary(
  ctx: AiContext,
  focus: SummaryFocus = "all"
): Promise<string> {
  if (!canUseWebLLM()) return heuristicSummary(ctx.transcript);
  try {
    return await runQuality(ctx, buildSummaryPrompt(ctx, focus), "summary");
  } catch {
    return heuristicSummary(ctx.transcript);
  }
}

export async function* streamSummary(
  ctx: AiContext,
  focus: SummaryFocus = "all"
): AsyncGenerator<string> {
  if (!canUseWebLLM()) {
    yield heuristicSummary(ctx.transcript);
    return;
  }
  try {
    const stream = await runQualityStream(
      ctx,
      buildSummaryPrompt(ctx, focus),
      "summary"
    );
    for await (const chunk of stream) yield chunk;
  } catch {
    yield heuristicSummary(ctx.transcript);
  }
}

export async function extractTasks(
  ctx: AiContext,
  members: AiMember[] = []
): Promise<{ tasks: ExtractedTask[]; debug?: string }> {
  if (!canUseWebLLM()) {
    return { tasks: validateAndEnrichTasks(heuristicTasks(ctx.transcript), members) };
  }
  try {
    const candConfig = getGenerationConfig("taskCandidates");
    const candidates = await webLLMEngine.complete(
      candConfig.tier,
      getChannelSystemPrompt(ctx.channelType),
      buildTaskCandidatesPrompt(ctx),
      { temperature: candConfig.temperature, maxTokens: candConfig.maxTokens }
    );

    let raw = await runQuality(
      ctx,
      buildTasksPrompt(ctx, candidates || ctx.transcript),
      "tasks"
    );
    let tasks = parseTasksFromModel(raw);
    if (tasks.length === 0) {
      const repaired = await repairJson(raw, ctx);
      tasks = parseTasksFromModel(repaired);
      if (tasks.length > 0) raw = repaired;
    }
    if (tasks.length === 0) {
      return {
        tasks: validateAndEnrichTasks(heuristicTasks(ctx.transcript), members),
        debug: raw,
      };
    }
    return { tasks: validateAndEnrichTasks(tasks, members) };
  } catch {
    return { tasks: validateAndEnrichTasks(heuristicTasks(ctx.transcript), members) };
  }
}

export async function generateBrief(ctx: AiContext): Promise<string> {
  if (!canUseWebLLM()) return heuristicBrief(ctx.transcript, ctx.channelName);
  try {
    return await runQuality(ctx, buildBriefPrompt(ctx), "brief");
  } catch {
    return heuristicBrief(ctx.transcript, ctx.channelName);
  }
}

export async function* streamBrief(ctx: AiContext): AsyncGenerator<string> {
  if (!canUseWebLLM()) {
    yield heuristicBrief(ctx.transcript, ctx.channelName);
    return;
  }
  try {
    const stream = await runQualityStream(ctx, buildBriefPrompt(ctx), "brief");
    for await (const chunk of stream) yield chunk;
  } catch {
    yield heuristicBrief(ctx.transcript, ctx.channelName);
  }
}

export async function rewriteScript(
  text: string,
  mode: RewriteMode = "polish",
  channelType: AiContext["channelType"] = "scripts"
): Promise<string> {
  if (!canUseWebLLM()) return heuristicRewrite(text);
  const ctx: AiContext = {
    transcript: text,
    channelName: "rewrite",
    channelType,
    memberNames: [],
    messageCount: 1,
  };
  try {
    return await runQuality(ctx, buildRewritePrompt(text, mode), "rewrite");
  } catch {
    return heuristicRewrite(text);
  }
}

export async function* streamRewrite(
  text: string,
  mode: RewriteMode = "polish",
  channelType: AiContext["channelType"] = "scripts"
): AsyncGenerator<string> {
  if (!canUseWebLLM()) {
    yield heuristicRewrite(text);
    return;
  }
  const ctx: AiContext = {
    transcript: text,
    channelName: "rewrite",
    channelType,
    memberNames: [],
    messageCount: 1,
  };
  try {
    const stream = await runQualityStream(
      ctx,
      buildRewritePrompt(text, mode),
      "rewrite"
    );
    for await (const chunk of stream) yield chunk;
  } catch {
    yield heuristicRewrite(text);
  }
}

export async function polishMessage(
  text: string,
  mode: PolishMode
): Promise<string> {
  if (!canUseWebLLM()) return heuristicPolish(text, mode);
  try {
    const config = getGenerationConfig("taskCandidates");
    return await webLLMEngine.complete(
      config.tier,
      "You are a helpful writing assistant.",
      buildPolishPrompt(text, mode),
      { temperature: config.temperature, maxTokens: 400 }
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
    const config = getGenerationConfig("taskCandidates");
    const raw = await webLLMEngine.complete(
      config.tier,
      "You are a message classifier.",
      buildIntentPrompt(body),
      { temperature: config.temperature, maxTokens: 64 }
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
  const ctx: AiContext = {
    transcript: body,
    channelName,
    channelType: "general",
    memberNames,
    messageCount: 1,
  };
  try {
    const raw = await runQuality(
      ctx,
      buildTaskPrefillPrompt(body, channelName, memberNames),
      "tasks"
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
  const ctx: AiContext = {
    transcript: body,
    channelName: "events",
    channelType: "events",
    memberNames: [],
    messageCount: 1,
  };
  try {
    const raw = await runQuality(ctx, buildEventPrefillPrompt(body), "tasks");
    const parsed = extractJson<{
      title?: string;
      date?: string;
      time?: string;
      location?: string;
    }>(raw);
    if (parsed?.title) {
      return parsed as {
        title: string;
        date?: string;
        time?: string;
        location?: string;
      };
    }
    return heuristicEventPrefill(body);
  } catch {
    return heuristicEventPrefill(body);
  }
}

export async function summarizeThread(transcript: string): Promise<string> {
  if (!canUseWebLLM()) return heuristicSummary(transcript);
  const ctx: AiContext = {
    transcript,
    channelName: "thread",
    channelType: "general",
    memberNames: [],
    messageCount: 1,
  };
  try {
    const config = getGenerationConfig("summary");
    return await webLLMEngine.complete(
      config.tier,
      getChannelSystemPrompt("general"),
      buildThreadSummaryPrompt(transcript),
      { temperature: config.temperature, maxTokens: config.maxTokens }
    );
  } catch {
    return heuristicSummary(transcript);
  }
}

export async function generateStudioDigest(context: string): Promise<string> {
  if (!canUseWebLLM()) return heuristicDigest(context);
  try {
    const config = getGenerationConfig("summary");
    return await webLLMEngine.complete(
      config.tier,
      getChannelSystemPrompt("general"),
      buildDigestPrompt(context),
      { temperature: config.temperature, maxTokens: config.maxTokens }
    );
  } catch {
    return heuristicDigest(context);
  }
}

export async function extractScriptBeats(
  ctx: AiContext
): Promise<{ beats: ExtractedBeat[]; formatted: string; debug?: string }> {
  if (!canUseWebLLM()) {
    return { beats: [], formatted: heuristicBeatExtractor(ctx.transcript) };
  }
  try {
    let raw = await runQuality(ctx, buildBeatExtractorPrompt(ctx), "beats");
    let beats = validateBeats(parseBeatsFromModel(raw));
    if (beats.length === 0) {
      const repaired = await repairJson(raw, ctx);
      beats = validateBeats(parseBeatsFromModel(repaired));
      if (beats.length > 0) raw = repaired;
    }
    if (beats.length === 0) {
      return {
        beats: [],
        formatted: heuristicBeatExtractor(ctx.transcript),
        debug: raw,
      };
    }
    const formatted =
      "## Script beats\n\n" +
      beats
        .map((b) => {
          let line = `### ${b.scene}`;
          if (b.characters) line += `\nCharacters: ${b.characters}`;
          if (b.notes) line += `\n${b.notes}`;
          if (b.suggestedTask) line += `\n→ Task: ${b.suggestedTask}`;
          if (b.priority) line += ` [${b.priority}]`;
          return line;
        })
        .join("\n\n");
    return { beats, formatted };
  } catch {
    return { beats: [], formatted: heuristicBeatExtractor(ctx.transcript) };
  }
}

export async function* streamScriptBeats(
  ctx: AiContext
): AsyncGenerator<string> {
  const result = await extractScriptBeats(ctx);
  yield result.formatted;
}

export { webLLMEngine };
