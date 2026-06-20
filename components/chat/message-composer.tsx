"use client";

import { useRef, useState } from "react";
import { Paperclip, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComposerPolishMenu } from "@/components/ai/composer-polish-menu";
import type { User } from "@/lib/data/types";
import { cn } from "@/lib/utils";

export function MessageComposer({
  channelName,
  replyTo,
  members = [],
  onCancelReply,
  onSend,
  onTyping,
  disabled,
  uploadError,
}: {
  channelName: string;
  replyTo?: { id: string; authorName: string; body: string };
  members?: User[];
  onCancelReply?: () => void;
  onSend: (body: string, file?: File) => Promise<void>;
  onTyping?: () => void;
  disabled?: boolean;
  uploadError?: string | null;
}) {
  const [input, setInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const mentionCandidates = members.filter((m) => {
    if (mentionQuery === null) return false;
    const q = mentionQuery.toLowerCase();
    return (
      m.displayName.toLowerCase().includes(q) ||
      m.displayName.toLowerCase().replace(/\s/g, "").includes(q)
    );
  }).slice(0, 6);

  function handleInputChange(value: string) {
    setInput(value);
    onTyping?.();
    const atMatch = value.match(/@([\w.-]*)$/);
    setMentionQuery(atMatch ? atMatch[1] : null);
  }

  function insertMention(name: string) {
    const next = input.replace(/@[\w.-]*$/, `@${name.replace(/\s/g, "")} `);
    setInput(next);
    setMentionQuery(null);
    inputRef.current?.focus();
  }

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

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const blob = item.getAsFile();
        if (blob) {
          e.preventDefault();
          setFile(blob);
        }
        break;
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-zinc-800 p-4">
      {replyTo && (
        <div className="mb-2 flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm">
          <div className="min-w-0">
            <p className="text-xs text-violet-400">Replying to {replyTo.authorName}</p>
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
          <span className="truncate">{file.name || "Pasted image"}</span>
          <button type="button" onClick={() => setFile(null)} className="ml-auto text-zinc-500 hover:text-zinc-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {uploadError && <p className="mb-2 text-sm text-red-400">{uploadError}</p>}
      <div className="relative flex gap-2">
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
          ref={inputRef}
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          onPaste={handlePaste}
          placeholder={`Message #${channelName}`}
          disabled={disabled || sending}
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
        />
        <ComposerPolishMenu
          text={input}
          disabled={disabled || sending}
          onApply={setInput}
        />
        <Button type="submit" size="icon" disabled={disabled || sending || (!input.trim() && !file)}>
          <Send className="h-4 w-4" />
        </Button>
        {mentionCandidates.length > 0 && (
          <ul className="absolute bottom-full left-12 z-20 mb-1 w-56 rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl">
            {mentionCandidates.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                  onClick={() => insertMention(m.displayName)}
                >
                  @{m.displayName}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </form>
  );
}
