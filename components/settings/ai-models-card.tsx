"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, HardDrive, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineError } from "@/components/ui/inline-error";
import { AI_MODELS } from "@/lib/ai/models";
import {
  modelManager,
  type ModelStatus,
} from "@/lib/ai/model-manager";
import {
  getModelPreferences,
  setModelEnabled,
} from "@/lib/ai/model-preferences";
import { canUseWebLLM } from "@/lib/ai/ai-service";
import { isWebGPUSupported } from "@/lib/ai/webgpu";
import type { InitProgress } from "@/lib/ai/types";

function statusLabel(status: ModelStatus["cacheStatus"]): string {
  if (status === "loaded") return "Loaded in memory";
  if (status === "cached") return "Downloaded";
  return "Not downloaded";
}

export function AiModelsCard() {
  const [statuses, setStatuses] = useState<ModelStatus[]>([]);
  const [progress, setProgress] = useState<InitProgress | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const data = await modelManager.getAllModelStatuses();
    setStatuses(data);
  }, []);

  useEffect(() => {
    void refresh();
    const onChange = () => void refresh();
    window.addEventListener("dmf-ai-models-changed", onChange);
    return () => window.removeEventListener("dmf-ai-models-changed", onChange);
  }, [refresh]);

  useEffect(() => {
    return modelManager.subscribe((p) => {
      setProgress(p.progress >= 1 ? null : p);
    });
  }, []);

  const webgpu = isWebGPUSupported();

  async function handleToggle(modelId: string, enabled: boolean) {
    setError(null);
    setModelEnabled(modelId, enabled);
    if (!enabled && modelManager.getLoadedModelId() === modelId) {
      await modelManager.unloadEngine();
    }
    await refresh();
  }

  async function handleDownload(modelId: string) {
    setError(null);
    setLoadingId(modelId);
    try {
      await modelManager.download(modelId);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setLoadingId(null);
    }
  }

  async function handleDelete(modelId: string, name: string) {
    if (
      !window.confirm(
        `Remove ${name} from this browser? You will need to download it again to use on-device AI features that need it.`
      )
    ) {
      return;
    }
    setError(null);
    setLoadingId(modelId);
    try {
      await modelManager.deleteDownload(modelId);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setLoadingId(null);
    }
  }

  const prefs = getModelPreferences();

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-start gap-3">
        <HardDrive className="mt-0.5 h-5 w-5 shrink-0 text-violet-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-200">On-device AI models</p>
          <p className="mt-1 text-xs text-zinc-500">
            {webgpu
              ? "Download, enable, or remove WebLLM models stored in your browser. Disabled models fall back to offline drafts."
              : "WebGPU is not available in this browser. Use Chrome or Edge for on-device AI."}
          </p>
        </div>
      </div>

      {progress && (
        <div className="mt-4 rounded-lg border border-violet-500/30 bg-violet-500/5 px-3 py-2">
          <div className="flex items-center gap-2 text-sm text-violet-200">
            <Loader2 className="h-4 w-4 animate-spin" />
            Downloading model…
          </div>
          <p className="mt-1 truncate text-xs text-zinc-500">{progress.text}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full bg-violet-500 transition-all"
              style={{ width: `${Math.round(progress.progress * 100)}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4">
          <InlineError message={error} />
        </div>
      )}

      <ul className="mt-4 space-y-3">
        {AI_MODELS.map((model) => {
          const status = statuses.find((s) => s.modelId === model.id);
          const enabled = prefs.enabled[model.id] !== false;
          const busy = loadingId === model.id;

          return (
            <li
              key={model.id}
              className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-zinc-200">{model.name}</p>
                  <p className="text-xs text-zinc-500">{model.description}</p>
                  <p className="mt-1 text-[10px] text-zinc-600">
                    {model.sizeLabel} · {status ? statusLabel(status.cacheStatus) : "…"}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-xs text-zinc-400">
                  <input
                    type="checkbox"
                    checked={enabled}
                    disabled={!webgpu}
                    onChange={(e) =>
                      void handleToggle(model.id, e.target.checked)
                    }
                  />
                  Enabled
                </label>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!webgpu || !enabled || busy || status?.cacheStatus === "loaded"}
                  onClick={() => void handleDownload(model.id)}
                >
                  <Download className="mr-1 h-3 w-3" />
                  {status?.cacheStatus === "cached" || status?.cacheStatus === "loaded"
                    ? "Re-download"
                    : "Download"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={
                    !webgpu ||
                    busy ||
                    !status ||
                    status.cacheStatus === "not_cached"
                  }
                  onClick={() => void handleDelete(model.id, model.name)}
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  Remove
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {canUseWebLLM() && (
        <p className="mt-3 text-[10px] text-zinc-600">
          Models are cached locally. Removing frees disk space; re-download before using Draft Generator features.
        </p>
      )}
    </div>
  );
}
