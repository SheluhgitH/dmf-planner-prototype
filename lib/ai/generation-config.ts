import type { ModelTier } from "@/lib/ai/models";

export type AiToolId =
  | "summary"
  | "tasks"
  | "brief"
  | "rewrite"
  | "beats"
  | "taskCandidates"
  | "jsonRepair";

export type GenerationOptions = {
  temperature: number;
  maxTokens: number;
  tier: ModelTier;
};

export const GENERATION_CONFIG: Record<AiToolId, GenerationOptions> = {
  summary: { temperature: 0.5, maxTokens: 1200, tier: "quality" },
  tasks: { temperature: 0.2, maxTokens: 800, tier: "quality" },
  brief: { temperature: 0.6, maxTokens: 1500, tier: "quality" },
  rewrite: { temperature: 0.7, maxTokens: 2000, tier: "quality" },
  beats: { temperature: 0.3, maxTokens: 1200, tier: "quality" },
  taskCandidates: { temperature: 0.2, maxTokens: 400, tier: "fast" },
  jsonRepair: { temperature: 0.1, maxTokens: 600, tier: "quality" },
};

export function getGenerationConfig(tool: AiToolId): GenerationOptions {
  return GENERATION_CONFIG[tool];
}
