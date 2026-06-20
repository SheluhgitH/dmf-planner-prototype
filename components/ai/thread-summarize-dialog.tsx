"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { summarizeThread } from "@/lib/ai/ai-service";
import { getThreadContextAction } from "@/lib/actions/ai";

export function ThreadSummarizeDialog({
  channelId,
  parentMessageId,
  open,
  onOpenChange,
}: {
  channelId: string;
  parentMessageId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadSummary() {
    setLoading(true);
    setError(null);
    try {
      const { transcript, error: ctxError } = await getThreadContextAction(
        channelId,
        parentMessageId
      );
      if (ctxError || !transcript) {
        setError(ctxError ?? "No thread content");
        return;
      }
      const result = await summarizeThread(transcript);
      setSummary(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to summarize");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next && !summary) void loadSummary();
        if (!next) {
          setSummary(null);
          setError(null);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thread summary</DialogTitle>
        </DialogHeader>
        {loading && <p className="text-sm text-zinc-400">Summarizing thread…</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}
        {summary && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <p className="mb-2 text-xs text-amber-400">AI draft — review before sharing</p>
            <p className="whitespace-pre-wrap text-sm text-zinc-300">{summary}</p>
          </div>
        )}
        {summary && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => void navigator.clipboard.writeText(summary)}
          >
            Copy summary
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
