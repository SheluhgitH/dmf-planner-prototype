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
import { Bot, Clapperboard, FileText, Lightbulb, Mic } from "lucide-react";
import { AiStatusBadge, ModelLoadProgress } from "@/components/ai/model-loader";
import {
  extractScriptBeats,
  extractTasks,
  generateBrief,
  generateSummary,
  rewriteScript,
  canUseWebLLM,
} from "@/lib/ai/ai-service";
import type { ExtractedBeat, ExtractedTask } from "@/lib/ai/types";
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
  const [activeTool, setActiveTool] = useState(tools[0]);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTask[]>([]);
  const [extractedBeats, setExtractedBeats] = useState<ExtractedBeat[]>([]);
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);
  const [channelId, setChannelId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getChannelsForAiAction().then(({ channels: data }) => {
      setChannels(data ?? []);
      if (data?.[0]) setChannelId(data[0].id);
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

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setOutput("");
    setExtractedTasks([]);
    setExtractedBeats([]);

    try {
      if (activeTool.tool === "beats" && channelId) {
        const ctx = await getChannelContextAction(channelId);
        if (ctx.error || !ctx.transcript) {
          setError(ctx.error ?? "No messages");
          return;
        }
        const { beats, formatted } = await extractScriptBeats(ctx.transcript);
        setExtractedBeats(beats);
        setOutput(formatted);
        return;
      }

      if (activeTool.tool && channelId) {
        const ctx = await getChannelContextAction(channelId);
        if (ctx.error || !ctx.transcript) {
          setError(ctx.error ?? "No messages");
          return;
        }

        if (activeTool.tool === "summary") {
          setOutput(
            await generateSummary(ctx.transcript, ctx.channelName ?? "channel")
          );
        } else if (activeTool.tool === "tasks") {
          const tasks = await extractTasks(
            ctx.transcript,
            ctx.channelName ?? "channel"
          );
          setExtractedTasks(tasks);
          setOutput(
            tasks.length > 0
              ? tasks.map((t, i) => `${i + 1}. ${t.title}${t.dueDate ? ` (due ${t.dueDate})` : ""}`).join("\n")
              : "No tasks extracted."
          );
        } else if (activeTool.tool === "brief") {
          setOutput(
            await generateBrief(
              ctx.transcript,
              ctx.channelName ?? "channel",
              ctx.taskTitles
            )
          );
        }
      } else if (!activeTool.tool && input.trim()) {
        setOutput(await rewriteScript(input));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleBulkCreateTasks() {
    if (!projectId || extractedTasks.length === 0) return;
    setBulkLoading(true);
    setError(null);
    const { created, error: err } = await createTasksBulkAction({
      projectId,
      tasks: extractedTasks.map((t) => ({
        title: t.title,
        dueDate: t.dueDate,
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

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-zinc-100">Draft Generator</h1>
          <AiStatusBadge />
        </div>
        <p className="mt-1 text-zinc-400">
          {canUseWebLLM()
            ? "AI runs on your device via WebGPU — prompts never leave your browser."
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
                setOutput("");
                setExtractedTasks([]);
                setExtractedBeats([]);
                setError(null);
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
            {activeTool.tool ? (
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
            ) : (
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste your script here..."
                rows={6}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            )}
            <Button
              onClick={() => void handleGenerate()}
              disabled={
                loading ||
                (activeTool.tool ? !channelId : !input.trim())
              }
            >
              {loading ? "Generating..." : "Generate draft"}
            </Button>
            {error && <p className="text-sm text-red-400">{error}</p>}
            {output && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <p className="mb-2 text-xs text-amber-400">
                  Draft — confirm before creating tasks or events
                </p>
                <p className="whitespace-pre-wrap text-sm text-zinc-300">{output}</p>
              </div>
            )}
            {extractedTasks.length > 0 && (
              <div className="space-y-2 rounded-lg border border-zinc-800 p-3">
                <p className="text-sm text-zinc-300">Add extracted tasks to project:</p>
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
                  {bulkLoading ? "Creating..." : `Add ${extractedTasks.length} tasks`}
                </Button>
              </div>
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
