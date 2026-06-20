"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { generateStudioDigest } from "@/lib/ai/ai-service";
import { getStudioDigestContextAction } from "@/lib/actions/ai";
import { AiStatusBadge } from "@/components/ai/model-loader";

export function StudioDigestCard() {
  const [digest, setDigest] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async () => {
    setLoading(true);
    try {
      const { context, error } = await getStudioDigestContextAction();
      if (error || !context) {
        setDigest("No activity to summarize yet.");
        return;
      }
      const result = await generateStudioDigest(context);
      setDigest(result);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void generate();
  }, [generate]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <AiStatusBadge />
        <Button size="sm" variant="outline" disabled={loading} onClick={() => void generate()}>
          {loading ? "Generating…" : "Refresh digest"}
        </Button>
      </div>
      {digest ? (
        <p className="whitespace-pre-wrap text-sm text-zinc-300">{digest}</p>
      ) : (
        <p className="text-sm text-zinc-500">Preparing studio digest…</p>
      )}
    </div>
  );
}
