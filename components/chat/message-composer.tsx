"use client";

import { useState } from "react";
import { MessageSquare, Paperclip, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MessageComposer({
  channelName,
  replyTo,
  onCancelReply,
  onSend,
  onTyping,
  disabled,
}: {
  channelName: string;
  replyTo?: { id: string; authorName: string; body: string };
  onCancelReply?: () => void;
  onSend: (body: string, file?: File) => Promise<void>;
  onTyping?: () => void;
  disabled?: boolean;
}) {
  const [input, setInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = input.trim();
    if (!body && !file) return;

    setSending(true);
    try {
      await onSend(body || " ", file ?? undefined);
      setInput("");
      setFile(null);
      onCancelReply?.();
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-zinc-800 p-4">
      {replyTo && (
        <div className="mb-2 flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm">
          <div className="min-w-0">
            <p className="text-xs text-violet-400">
              Replying to {replyTo.authorName}
            </p>
            <p className="truncate text-zinc-400">{replyTo.body}</p>
          </div>
          {onCancelReply && (
            <button type="button" onClick={onCancelReply} className="text-zinc-500 hover:text-zinc-300">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
      {file && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-300">
          <Paperclip className="h-4 w-4 shrink-0" />
          <span className="truncate">{file.name}</span>
          <button type="button" onClick={() => setFile(null)} className="ml-auto text-zinc-500 hover:text-zinc-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="flex gap-2">
        <label className="flex cursor-pointer items-center">
          <input
            type="file"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">
            <Paperclip className="h-4 w-4" />
          </span>
        </label>
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            onTyping?.();
          }}
          placeholder={`Message #${channelName}`}
          disabled={disabled || sending}
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
        />
        <Button type="submit" size="icon" disabled={disabled || sending || (!input.trim() && !file)}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
