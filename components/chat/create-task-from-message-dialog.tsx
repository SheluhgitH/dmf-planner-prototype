"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createTaskFromMessageAction } from "@/lib/actions/projects";
import type { Message, Project } from "@/lib/data/types";

export function CreateTaskFromMessageDialog({
  message,
  channelId,
  projects,
  open,
  onOpenChange,
}: {
  message: Message;
  channelId: string;
  projects: Project[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [title, setTitle] = useState(message.body.slice(0, 200));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    setLoading(true);
    setError(null);
    const { error: err } = await createTaskFromMessageAction({
      projectId,
      title,
      messageId: message.id,
      channelId,
    });
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create task from message</DialogTitle>
        </DialogHeader>
        {projects.length === 0 ? (
          <p className="text-sm text-zinc-400">
            Create a project first to add tasks.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading ? "Creating..." : "Create task"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
