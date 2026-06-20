"use client";

import { useEffect, useState } from "react";
import { classifyMessageIntent } from "@/lib/ai/ai-service";
import type { MessageIntent } from "@/lib/ai/types";

const LABELS: Record<MessageIntent, string> = {
  task: "Create task",
  event: "Schedule event",
  script: "Draft Generator",
};

export function MessageIntentChips({
  body,
  onTask,
  onEvent,
  onScript,
}: {
  body: string;
  onTask?: () => void;
  onEvent?: () => void;
  onScript?: () => void;
}) {
  const [intents, setIntents] = useState<MessageIntent[]>([]);

  useEffect(() => {
    if (body.trim().length < 12) {
      setIntents([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      void classifyMessageIntent(body).then((result) => {
        if (!cancelled) setIntents(result);
      });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [body]);

  if (intents.length === 0) return null;

  const handlers: Record<MessageIntent, (() => void) | undefined> = {
    task: onTask,
    event: onEvent,
    script: onScript,
  };

  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {intents.map((intent) => {
        const handler = handlers[intent];
        if (!handler) return null;
        return (
          <button
            key={intent}
            type="button"
            onClick={handler}
            className="rounded-full border border-violet-500/40 bg-violet-500/10 px-2 py-0.5 text-[10px] text-violet-300 hover:bg-violet-500/20"
          >
            ✨ {LABELS[intent]}
          </button>
        );
      })}
    </div>
  );
}
