"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, FileText, Lightbulb, Mic } from "lucide-react";

const tools = [
  {
    id: "rewrite",
    icon: FileText,
    title: "Script Rewrite",
    description: "Polish and refine your scripts with AI assistance.",
    placeholder: "Paste your script here...",
  },
  {
    id: "ideas",
    icon: Lightbulb,
    title: "Idea Generator",
    description: "Brainstorm concepts for your next project.",
    placeholder: "Describe your project or theme...",
  },
  {
    id: "summary",
    icon: Mic,
    title: "Meeting Summary",
    description: "Turn meeting notes into actionable summaries.",
    placeholder: "Paste meeting notes or transcript...",
  },
  {
    id: "brief",
    icon: Bot,
    title: "Project Brief Generator",
    description: "Create structured project briefs from a few bullet points.",
    placeholder: "List key points for your project brief...",
  },
];

export default function AIToolsPage() {
  const [activeTool, setActiveTool] = useState(tools[0]);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

  function handleDemo() {
    setOutput(
      `[Demo output — connect an AI API key to enable live generation]\n\nProcessed: "${input.slice(0, 80)}${input.length > 80 ? "..." : ""}"\n\nThis is a placeholder response. When Supabase and your AI provider are configured, this tool will generate real results.`
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100">AI Tools</h1>
        <p className="text-zinc-400">
          Script rewrites, idea generation, and meeting summaries.
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
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={activeTool.placeholder}
              rows={6}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <Button onClick={handleDemo} disabled={!input.trim()}>
              Generate (Demo)
            </Button>
            {output && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <p className="whitespace-pre-wrap text-sm text-zinc-300">
                  {output}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
