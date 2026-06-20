export const FAST_MODEL_ID = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";
export const QUALITY_MODEL_ID = "Phi-3.5-mini-instruct-q4f16_1-MLC";

export type ModelTier = "fast" | "quality";

export type AiModelDefinition = {
  id: string;
  tier: ModelTier;
  name: string;
  description: string;
  sizeLabel: string;
};

export const AI_MODELS: AiModelDefinition[] = [
  {
    id: FAST_MODEL_ID,
    tier: "fast",
    name: "Qwen 2.5 0.5B",
    description: "Fast helper for message polish and intent classification.",
    sizeLabel: "~400 MB",
  },
  {
    id: QUALITY_MODEL_ID,
    tier: "quality",
    name: "Phi-3.5 Mini",
    description: "Quality model for summaries, briefs, rewrites, and task extraction.",
    sizeLabel: "~2.3 GB",
  },
];

const MODEL_IDS = new Set(AI_MODELS.map((m) => m.id));

export function modelIdForTier(tier: ModelTier): string {
  return tier === "fast" ? FAST_MODEL_ID : QUALITY_MODEL_ID;
}

export function getModelDefinition(modelId: string): AiModelDefinition | undefined {
  return AI_MODELS.find((m) => m.id === modelId);
}

export function isKnownModelId(modelId: string): boolean {
  return MODEL_IDS.has(modelId);
}
