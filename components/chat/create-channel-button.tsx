"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InlineError } from "@/components/ui/inline-error";
import { createChannelAction } from "@/lib/actions/channels";

export function CreateChannelButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"public" | "private">("public");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { channel, error: err } = await createChannelAction(name, type);
    setLoading(false);
    if (channel) {
      setOpen(false);
      setName("");
      router.push(`/chat/${channel.id}`);
      router.refresh();
    } else if (err) {
      setError(err);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-1 px-3 py-1 text-xs text-zinc-500 hover:text-zinc-300"
        >
          <Plus className="h-3 w-3" />
          Add channel
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create channel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Channel name"
            required
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "public" | "private")}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
          <Button type="submit" disabled={loading || !name.trim()}>
            Create
          </Button>
          {error && <InlineError message={error} />}
        </form>
      </DialogContent>
    </Dialog>
  );
}
