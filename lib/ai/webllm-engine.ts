"use client";

import { CreateMLCEngine, type MLCEngine, type InitProgressReport } from "@mlc-ai/web-llm";
import { modelIdForTier, type ModelTier } from "@/lib/ai/models";
import type { InitProgress } from "@/lib/ai/types";

type ProgressListener = (progress: InitProgress) => void;

class WebLLMEngine {
  private engine: MLCEngine | null = null;
  private loadedModelId: string | null = null;
  private loadPromise: Promise<MLCEngine> | null = null;
  private listeners = new Set<ProgressListener>();

  subscribe(listener: ProgressListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(report: InitProgressReport) {
    const progress: InitProgress = {
      text: report.text,
      progress: report.progress,
    };
    for (const listener of this.listeners) listener(progress);
  }

  async ensureModel(tier: ModelTier): Promise<MLCEngine> {
    const modelId = modelIdForTier(tier);
    if (this.engine && this.loadedModelId === modelId) {
      return this.engine;
    }

    if (this.loadPromise && this.loadedModelId === modelId) {
      return this.loadPromise;
    }

    this.loadPromise = (async () => {
      if (this.engine && this.loadedModelId !== modelId) {
        try {
          await this.engine.unload();
        } catch {
          // ignore unload errors
        }
        this.engine = null;
        this.loadedModelId = null;
      }

      const engine = await CreateMLCEngine(modelId, {
        initProgressCallback: (report) => this.emit(report),
      });
      this.engine = engine;
      this.loadedModelId = modelId;
      return engine;
    })();

    try {
      return await this.loadPromise;
    } finally {
      this.loadPromise = null;
    }
  }

  async complete(
    tier: ModelTier,
    systemPrompt: string,
    userPrompt: string,
    maxTokens = 1024
  ): Promise<string> {
    const engine = await this.ensureModel(tier);
    const response = await engine.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: tier === "fast" ? 0.3 : 0.7,
      max_tokens: maxTokens,
    });
    return response.choices[0]?.message?.content?.trim() ?? "";
  }

  async *stream(
    tier: ModelTier,
    systemPrompt: string,
    userPrompt: string,
    maxTokens = 1024
  ): AsyncGenerator<string> {
    const engine = await this.ensureModel(tier);
    const chunks = await engine.chat.completions.create({
      stream: true,
      stream_options: { include_usage: false },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: tier === "fast" ? 0.3 : 0.7,
      max_tokens: maxTokens,
    });

    for await (const chunk of chunks) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }
}

export const webLLMEngine = new WebLLMEngine();
