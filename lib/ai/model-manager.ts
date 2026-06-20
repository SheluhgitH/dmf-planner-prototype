"use client";

import {
  CreateMLCEngine,
  deleteModelAllInfoInCache,
  hasModelInCache,
} from "@mlc-ai/web-llm";
import { AI_MODELS, isKnownModelId } from "@/lib/ai/models";
import { isModelEnabled } from "@/lib/ai/model-preferences";
import type { InitProgress } from "@/lib/ai/types";

export type ModelCacheStatus = "cached" | "not_cached" | "loaded";

export type ModelStatus = {
  modelId: string;
  cacheStatus: ModelCacheStatus;
  enabled: boolean;
};

type ProgressListener = (progress: InitProgress) => void;

class ModelManager {
  private engine: Awaited<ReturnType<typeof CreateMLCEngine>> | null = null;
  private loadedModelId: string | null = null;
  private loadPromise: Promise<void> | null = null;
  private listeners = new Set<ProgressListener>();

  subscribe(listener: ProgressListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(report: { text: string; progress: number }) {
    for (const listener of this.listeners) {
      listener({ text: report.text, progress: report.progress });
    }
  }

  getLoadedModelId(): string | null {
    return this.loadedModelId;
  }

  async getAllModelStatuses(): Promise<ModelStatus[]> {
    const loaded = this.loadedModelId;
    const statuses = await Promise.all(
      AI_MODELS.map(async (model) => {
        const cached = await hasModelInCache(model.id);
        return {
          modelId: model.id,
          cacheStatus: (loaded === model.id
            ? "loaded"
            : cached
              ? "cached"
              : "not_cached") as ModelCacheStatus,
          enabled: isModelEnabled(model.id),
        };
      })
    );
    return statuses;
  }

  async isCached(modelId: string): Promise<boolean> {
    if (!isKnownModelId(modelId)) return false;
    if (this.loadedModelId === modelId) return true;
    return hasModelInCache(modelId);
  }

  async download(modelId: string): Promise<void> {
    if (!isKnownModelId(modelId)) {
      throw new Error("Unknown model");
    }
    if (!isModelEnabled(modelId)) {
      throw new Error("Enable this model in settings before downloading.");
    }

    if (this.loadPromise) {
      await this.loadPromise;
    }

    this.loadPromise = (async () => {
      if (this.engine && this.loadedModelId !== modelId) {
        await this.unloadEngine();
      }

      if (this.loadedModelId === modelId && this.engine) {
        return;
      }

      const cached = await hasModelInCache(modelId);
      if (cached && this.loadedModelId === modelId) return;

      const engine = await CreateMLCEngine(modelId, {
        initProgressCallback: (report) => this.emit(report),
      });

      if (this.engine && this.loadedModelId !== modelId) {
        try {
          await this.engine.unload();
        } catch {
          // ignore
        }
      }

      this.engine = engine;
      this.loadedModelId = modelId;
    })();

    try {
      await this.loadPromise;
    } finally {
      this.loadPromise = null;
    }
  }

  async deleteDownload(modelId: string): Promise<void> {
    if (!isKnownModelId(modelId)) return;

    if (this.loadedModelId === modelId) {
      await this.unloadEngine();
    }

    await deleteModelAllInfoInCache(modelId);
    window.dispatchEvent(new CustomEvent("dmf-ai-models-changed"));
  }

  async unloadEngine(): Promise<void> {
    if (this.engine) {
      try {
        await this.engine.unload();
      } catch {
        // ignore
      }
    }
    this.engine = null;
    this.loadedModelId = null;
    window.dispatchEvent(new CustomEvent("dmf-ai-models-changed"));
  }

  /** Used by WebLLMEngine for inference — shares the same engine instance. */
  async acquireEngine(modelId: string): Promise<Awaited<ReturnType<typeof CreateMLCEngine>>> {
    if (!isModelEnabled(modelId)) {
      throw new Error("Model is disabled in settings.");
    }

    if (this.engine && this.loadedModelId === modelId) {
      return this.engine;
    }

    await this.download(modelId);
    if (!this.engine) {
      throw new Error("Failed to load model");
    }
    return this.engine;
  }
}

export const modelManager = new ModelManager();
