"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, FileText, Lightbulb, Mic } from "lucide-react";
import {
  generateFromChatContextAction,
  getChannelsForAiAction,
} from "@/lib/actions/ai";

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
];

export default function AIToolsPage() {
  const [activeTool, setActiveTool] = useState(tools[0]);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);
  const [channelId, setChannelId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void getChannelsForAiAction().then(({ channels: data }) => {
      setChannels(data ?? []);
      if (data?.[0]) setChannelId(data[0].id);
    });
  }, []);

  async function handleGenerate() {
    setLoading(true);
    if (activeTool.tool && channelId) {
      const { output: result, error } = await generateFromChatContextAction(
        channelId,
        activeTool.tool
      );
      setOutput(error ?? result ?? "");
    } else {
      setOutput(
        `[Draft rewrite]\n\n${input}\n\n— Polished version would appear here when an AI provider is connected.`
      );
    }
    setLoading(false);
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100">AI Tools</h1>
        <p className="text-zinc-400">
          Generate drafts from your workspace chat context. Review before creating tasks.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => {
                setActiveTool(tool);
                setInput("");
                setOutput("");
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
              disabled={loading || (activeTool.tool ? !channelId : !input.trim())}
            >
              {loading ? "Generating..." : "Generate draft"}
            </Button>
            {output && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <p className="mb-2 text-xs text-amber-400">
                  Draft — confirm before creating tasks or events
                </p>
                <p className="whitespace-pre-wrap text-sm text-zinc-300">{output}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
