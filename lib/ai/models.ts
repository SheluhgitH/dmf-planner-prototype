export const FAST_MODEL_ID = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";
export const QUALITY_MODEL_ID = "Phi-3-mini-4k-instruct-q4f16_1-MLC";

export type ModelTier = "fast" | "quality";

export function modelIdForTier(tier: ModelTier): string {
  return tier === "fast" ? FAST_MODEL_ID : QUALITY_MODEL_ID;
}
