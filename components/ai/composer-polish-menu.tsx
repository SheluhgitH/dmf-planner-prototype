"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { polishMessage } from "@/lib/ai/ai-service";
import type { PolishMode } from "@/lib/ai/types";

const MODES: { id: PolishMode; label: string }[] = [
  { id: "shorten", label: "Shorten" },
  { id: "clarify", label: "Clarify" },
  { id: "professional", label: "Professional" },
  { id: "grammar", label: "Fix grammar" },
  { id: "emoji", label: "Add tone" },
];

export function ComposerPolishMenu({
  text,
  onApply,
  disabled,
}: {
  text: string;
  onApply: (next: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<PolishMode | null>(null);

  async function run(mode: PolishMode) {
    if (!text.trim()) return;
    setLoading(mode);
    try {
      const result = await polishMessage(text, mode);
      onApply(result);
      setOpen(false);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="relative">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        disabled={disabled || !text.trim()}
        onClick={() => setOpen(!open)}
        title="Polish with AI"
      >
        <Sparkles className="h-4 w-4 text-violet-400" />
      </Button>
      {open && (
        <ul className="absolute bottom-full right-0 z-20 mb-1 w-40 rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl">
          {MODES.map((mode) => (
            <li key={mode.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
                disabled={loading !== null}
                onClick={() => void run(mode.id)}
              >
                {loading === mode.id ? "…" : mode.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
