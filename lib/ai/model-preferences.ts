"use client";

import {
  AI_MODELS,
  FAST_MODEL_ID,
  QUALITY_MODEL_ID,
  type ModelTier,
} from "@/lib/ai/models";

const STORAGE_KEY = "dmf-planner-ai-models";

export type ModelPreferences = {
  enabled: Record<string, boolean>;
};

const DEFAULT_PREFERENCES: ModelPreferences = {
  enabled: {
    [FAST_MODEL_ID]: true,
    [QUALITY_MODEL_ID]: true,
  },
};

export function getModelPreferences(): ModelPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as ModelPreferences;
    return {
      enabled: {
        ...DEFAULT_PREFERENCES.enabled,
        ...parsed.enabled,
      },
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function setModelEnabled(modelId: string, enabled: boolean): ModelPreferences {
  const prefs = getModelPreferences();
  prefs.enabled[modelId] = enabled;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  window.dispatchEvent(new CustomEvent("dmf-ai-models-changed"));
  return prefs;
}

export function isModelEnabled(modelId: string): boolean {
  return getModelPreferences().enabled[modelId] !== false;
}

export function isTierEnabled(tier: ModelTier): boolean {
  const modelId = tier === "fast" ? FAST_MODEL_ID : QUALITY_MODEL_ID;
  return isModelEnabled(modelId);
}

export function getEnabledModels() {
  return AI_MODELS.filter((m) => isModelEnabled(m.id));
}
