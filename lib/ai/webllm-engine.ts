"use client";

import { modelManager } from "@/lib/ai/model-manager";
import { modelIdForTier, type ModelTier } from "@/lib/ai/models";
import { isTierEnabled } from "@/lib/ai/model-preferences";
import type { InitProgress } from "@/lib/ai/types";

type ProgressListener = (progress: InitProgress) => void;

export type CompleteOptions = {
  temperature?: number;
  maxTokens?: number;
};

class WebLLMEngine {
  private listeners = new Set<ProgressListener>();

  subscribe(listener: ProgressListener): () => void {
    const unsubManager = modelManager.subscribe(listener);
    this.listeners.add(listener);
    return () => {
      unsubManager();
      this.listeners.delete(listener);
    };
  }

  getLoadedModelId(): string | null {
    return modelManager.getLoadedModelId();
  }

  async ensureModel(tier: ModelTier) {
    if (!isTierEnabled(tier)) {
      throw new Error(
        `The ${tier === "fast" ? "fast" : "quality"} AI model is disabled. Enable it in Settings → On-device AI models.`
      );
    }
    const modelId = modelIdForTier(tier);
    return modelManager.acquireEngine(modelId);
  }

  async complete(
    tier: ModelTier,
    systemPrompt: string,
    userPrompt: string,
    options: CompleteOptions = {}
  ): Promise<string> {
    const engine = await this.ensureModel(tier);
    const temperature = options.temperature ?? (tier === "fast" ? 0.3 : 0.7);
    const max_tokens = options.maxTokens ?? 1024;
    const response = await engine.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature,
      max_tokens,
    });
    return response.choices[0]?.message?.content?.trim() ?? "";
  }

  async *stream(
    tier: ModelTier,
    systemPrompt: string,
    userPrompt: string,
    options: CompleteOptions = {}
  ): AsyncGenerator<string> {
    const engine = await this.ensureModel(tier);
    const temperature = options.temperature ?? (tier === "fast" ? 0.3 : 0.7);
    const max_tokens = options.maxTokens ?? 1024;
    const chunks = await engine.chat.completions.create({
      stream: true,
      stream_options: { include_usage: false },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature,
      max_tokens,
    });

    for await (const chunk of chunks) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }
}

export const webLLMEngine = new WebLLMEngine();
