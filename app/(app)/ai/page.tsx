"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Clapperboard, Copy, FileText, Lightbulb, Mic, RefreshCw } from "lucide-react";
import { AiStatusBadge, ModelLoadProgress } from "@/components/ai/model-loader";
import {
  TaskReviewList,
  getSelectedTasks,
} from "@/components/ai/task-review-list";
import {
  extractScriptBeats,
  extractTasks,
  canUseWebLLM,
  streamBrief,
  streamRewrite,
  streamSummary,
} from "@/lib/ai/ai-service";
import { formatContextStats } from "@/lib/ai/parse";
import { useStreamingGeneration } from "@/lib/ai/use-streaming-generation";
import type {
  AiContext,
  AiMember,
  ExtractedBeat,
  ExtractedTask,
  RewriteMode,
  SummaryFocus,
} from "@/lib/ai/types";
import {
  getChannelContextAction,
  getChannelsForAiAction,
} from "@/lib/actions/ai";
import { createTasksBulkAction } from "@/lib/actions/projects";

const tools = [
  {
    id: "summary",
    icon: Mic,
    title: "Meeting Summary",
    description: "Summarize recent channel messages into bullets and action items.",
    tool: "summary" as const,
  },
  {
    id: "tasks",
    icon: Lightbulb,
    title: "Task Extractor",
    description: "Suggest tasks from recent channel discussion.",
    tool: "tasks" as const,
  },
  {
    id: "brief",
    icon: Bot,
    title: "Project Brief Generator",
    description: "Draft a project brief from channel context.",
    tool: "brief" as const,
  },
  {
    id: "rewrite",
    icon: FileText,
    title: "Script Rewrite",
    description: "Polish pasted text (manual input).",
    tool: null,
  },
  {
    id: "beats",
    icon: Clapperboard,
    title: "Script Beat Extractor",
    description: "Extract scenes, notes, and suggested production tasks from #scripts.",
    tool: "beats" as const,
  },
];

export default function AIToolsPage() {
  const router = useRouter();
  const stream = useStreamingGeneration();
  const [activeTool, setActiveTool] = useState(tools[0]);
  const [input, setInput] = useState("");
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTask[]>([]);
  const [extractedBeats, setExtractedBeats] = useState<ExtractedBeat[]>([]);
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);
  const [channelId, setChannelId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [members, setMembers] = useState<AiMember[]>([]);
  const [contextStats, setContextStats] = useState<string | null>(null);
  const [summaryFocus, setSummaryFocus] = useState<SummaryFocus>("all");
  const [rewriteMode, setRewriteMode] = useState<RewriteMode>("polish");
  const [messageLimit, setMessageLimit] = useState(30);
  const [debugOutput, setDebugOutput] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const output = stream.output;
  const loading = stream.loading;
  const setOutput = stream.setOutput;

  useEffect(() => {
    void getChannelsForAiAction().then(({ channels: data }) => {
      const list = data ?? [];
      setChannels(list);
      const scripts = list.find((c) => c.name === "scripts");
      if (scripts) setChannelId(scripts.id);
      else if (list[0]) setChannelId(list[0].id);
    });
  }, []);

  useEffect(() => {
    void (async () => {
      const { getProjectsForAiAction } = await import("@/lib/actions/ai-projects");
      const { projects: data } = await getProjectsForAiAction();
      setProjects(data ?? []);
      if (data?.[0]) setProjectId(data[0].id);
    })();
  }, []);

  async function loadContext(): Promise<AiContext | null> {
    if (!channelId) return null;
    const ctx = await getChannelContextAction(channelId, messageLimit);
    if ("error" in ctx) {
      setError(ctx.error);
      return null;
    }
    if (!ctx.transcript) {
      setError("No messages");
      return null;
    }
    const { members: ctxMembers, taskTitles: _t, ...aiCtx } = ctx;
    setMembers(ctxMembers ?? []);
    setContextStats(
      formatContextStats(
        ctx.channelName,
        ctx.messageCount,
        ctx.memberNames.length
      )
    );
    return aiCtx;
  }

  async function handleGenerate() {
    setError(null);
    setDebugOutput(null);
    setExtractedTasks([]);
    setExtractedBeats([]);
    stream.reset();

    try {
      if (activeTool.tool === "beats" && channelId) {
        const ctx = await loadContext();
        if (!ctx) return;
        const { beats, formatted, debug } = await extractScriptBeats(ctx);
        setExtractedBeats(beats);
        setOutput(formatted);
        if (debug) setDebugOutput(debug);
        return;
      }

      if (activeTool.tool === "tasks" && channelId) {
        const ctx = await loadContext();
        if (!ctx) return;
        const { tasks, debug } = await extractTasks(ctx, members);
        setExtractedTasks(tasks);
        setOutput(
          tasks.length > 0
            ? tasks
                .map(
                  (t, i) =>
                    `${i + 1}. ${t.title}${t.assignee ? ` (@${t.assignee})` : ""}${t.dueDate ? ` (due ${t.dueDate})` : ""}`
                )
                .join("\n")
            : "No tasks extracted."
        );
        if (debug) setDebugOutput(debug);
        return;
      }

      if (activeTool.tool === "summary" && channelId) {
        const ctx = await loadContext();
        if (!ctx) return;
        await stream.runStream(streamSummary(ctx, summaryFocus));
        return;
      }

      if (activeTool.tool === "brief" && channelId) {
        const ctx = await loadContext();
        if (!ctx) return;
        await stream.runStream(streamBrief(ctx));
        return;
      }

      if (!activeTool.tool && input.trim()) {
        await stream.runStream(streamRewrite(input, rewriteMode, "scripts"));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    }
  }

  async function handleBulkCreateTasks() {
    const selected = getSelectedTasks(extractedTasks);
    if (!projectId || selected.length === 0) return;
    setBulkLoading(true);
    setError(null);
    const { created, error: err } = await createTasksBulkAction({
      projectId,
      tasks: selected.map((t) => ({
        title: t.title,
        dueDate: t.dueDate,
        assigneeId: t.assigneeId,
      })),
      channelId,
    });
    setBulkLoading(false);
    if (err) {
      setError(err);
      return;
    }
    router.push(`/projects/${projectId}`);
    router.refresh();
    setOutput(`Created ${created} task(s) on project board.`);
  }

  async function handleBulkCreateFromBeats() {
    const tasks = extractedBeats
      .filter((b) => b.suggestedTask)
      .map((b) => ({ title: b.suggestedTask! }));
    if (!projectId || tasks.length === 0) return;
    setBulkLoading(true);
    const { created, error: err } = await createTasksBulkAction({
      projectId,
      tasks,
      channelId,
    });
    setBulkLoading(false);
    if (err) {
      setError(err);
      return;
    }
    router.push(`/projects/${projectId}`);
    router.refresh();
    setOutput(`Created ${created} production task(s) from beats.`);
  }

  async function copyOutput() {
    if (!output) return;
    await navigator.clipboard.writeText(output);
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-zinc-100">Draft Generator</h1>
          <AiStatusBadge />
        </div>
        <p className="mt-1 text-zinc-400">
          {canUseWebLLM()
            ? "AI runs on your device (Phi-3.5 Mini) — prompts never leave your browser."
            : "WebGPU not available. Using offline drafts. Use Chrome or Edge for on-device AI."}
        </p>
      </div>

      <ModelLoadProgress />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => {
                setActiveTool(tool);
                setInput("");
                stream.reset();
                setExtractedTasks([]);
                setExtractedBeats([]);
                setError(null);
                setDebugOutput(null);
                setContextStats(null);
              }}
              className={`w-full rounded-xl border p-4 text-left transition-colors ${
                activeTool.id === tool.id
                  ? "border-violet-500 bg-violet-500/10"
                  : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
              }`}
            >
              <tool.icon className="mb-2 h-5 w-5 text-violet-400" />
              <p className="font-medium text-zinc-100">{tool.title}</p>
              <p className="text-xs text-zinc-500">{tool.description}</p>
            </button>
          ))}
        </div>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{activeTool.title}</CardTitle>
            <CardDescription>{activeTool.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeTool.tool && (
              <>
                <select
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                >
                  {channels.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.name}
                    </option>
                  ))}
                </select>
                {(activeTool.tool === "beats" ||
                  activeTool.tool === "tasks" ||
                  activeTool.tool === "summary" ||
                  activeTool.tool === "brief") && (
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="text-xs text-zinc-500">
                      Messages:
                      <select
                        value={messageLimit}
                        onChange={(e) => setMessageLimit(Number(e.target.value))}
                        className="ml-2 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
                      >
                        <option value={10}>10</option>
                        <option value={30}>30</option>
                        <option value={50}>50</option>
                      </select>
                    </label>
                    {activeTool.tool === "summary" && (
                      <label className="text-xs text-zinc-500">
                        Focus:
                        <select
                          value={summaryFocus}
                          onChange={(e) =>
                            setSummaryFocus(e.target.value as SummaryFocus)
                          }
                          className="ml-2 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
                        >
                          <option value="all">All sections</option>
                          <option value="decisions">Decisions only</option>
                          <option value="actions">Action items only</option>
                        </select>
                      </label>
                    )}
                  </div>
                )}
              </>
            )}

            {!activeTool.tool && (
              <>
                <select
                  value={rewriteMode}
                  onChange={(e) =>
                    setRewriteMode(e.target.value as RewriteMode)
                  }
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                >
                  <option value="polish">Polish dialogue & prose</option>
                  <option value="tighten">Tighten pacing</option>
                  <option value="grammar">Fix grammar only</option>
                  <option value="stage_directions">Clean stage directions</option>
                </select>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Paste your script here..."
                  rows={6}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </>
            )}

            {contextStats && activeTool.tool && (
              <p className="text-xs text-zinc-500">{contextStats}</p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => void handleGenerate()}
                disabled={
                  loading ||
                  (activeTool.tool ? !channelId : !input.trim())
                }
              >
                {loading ? "Generating..." : "Generate draft"}
              </Button>
              {output && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleGenerate()}
                    disabled={loading}
                  >
                    <RefreshCw className="mr-1 h-3 w-3" />
                    Regenerate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void copyOutput()}
                  >
                    <Copy className="mr-1 h-3 w-3" />
                    Copy
                  </Button>
                </>
              )}
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            {output && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <p className="mb-2 text-xs text-amber-400">
                  Draft — confirm before creating tasks or events
                </p>
                <p className="whitespace-pre-wrap text-sm text-zinc-300">
                  {output}
                  {loading && (
                    <span className="ml-0.5 inline-block h-4 w-1 animate-pulse bg-violet-400" />
                  )}
                </p>
              </div>
            )}

            {debugOutput && (
              <details className="rounded-lg border border-zinc-800 p-3 text-xs text-zinc-500">
                <summary className="cursor-pointer text-zinc-400">
                  Debug: raw model output
                </summary>
                <pre className="mt-2 whitespace-pre-wrap">{debugOutput}</pre>
              </details>
            )}

            {extractedTasks.length > 0 && (
              <>
                <TaskReviewList
                  tasks={extractedTasks}
                  members={members}
                  onChange={setExtractedTasks}
                />
                <div className="space-y-2">
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    disabled={bulkLoading || !projectId}
                    onClick={() => void handleBulkCreateTasks()}
                  >
                    {bulkLoading
                      ? "Creating..."
                      : `Add ${getSelectedTasks(extractedTasks).length} tasks`}
                  </Button>
                </div>
              </>
            )}

            {extractedBeats.some((b) => b.suggestedTask) && (
              <div className="space-y-2 rounded-lg border border-zinc-800 p-3">
                <p className="text-sm text-zinc-300">Add suggested production tasks:</p>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  disabled={bulkLoading || !projectId}
                  onClick={() => void handleBulkCreateFromBeats()}
                >
                  {bulkLoading
                    ? "Creating..."
                    : `Add ${extractedBeats.filter((b) => b.suggestedTask).length} tasks`}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
