"use client";

import { useEffect, useState } from "react";
import { Loader2, Cpu } from "lucide-react";
import { webLLMEngine } from "@/lib/ai/webllm-engine";
import { canUseWebLLM } from "@/lib/ai/ai-service";
import type { InitProgress } from "@/lib/ai/types";

export function AiStatusBadge() {
  const supported = canUseWebLLM();
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${
        supported
          ? "bg-emerald-500/10 text-emerald-400"
          : "bg-amber-500/10 text-amber-400"
      }`}
    >
      <Cpu className="h-3 w-3" />
      {supported ? "On-device AI" : "Offline drafts"}
    </span>
  );
}

export function ModelLoadProgress() {
  const [progress, setProgress] = useState<InitProgress | null>(null);

  useEffect(() => {
    return webLLMEngine.subscribe((p) => {
      if (p.progress >= 1) {
        setProgress(null);
      } else {
        setProgress(p);
      }
    });
  }, []);

  if (!progress) return null;

  return (
    <div className="mb-4 rounded-lg border border-violet-500/30 bg-violet-500/5 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-violet-200">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading AI model…
      </div>
      <p className="mt-1 truncate text-xs text-zinc-500">{progress.text}</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full bg-violet-500 transition-all"
          style={{ width: `${Math.round(progress.progress * 100)}%` }}
        />
      </div>
    </div>
  );
}
