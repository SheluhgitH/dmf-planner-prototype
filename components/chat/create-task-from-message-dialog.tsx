"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InlineError } from "@/components/ui/inline-error";
import { prefillTaskFromMessage } from "@/lib/ai/ai-service";
import { createTaskFromMessageAction } from "@/lib/actions/projects";
import type { Message, Project, User } from "@/lib/data/types";

export function CreateTaskFromMessageDialog({
  message,
  channelId,
  channelName = "channel",
  projects,
  members = [],
  open,
  onOpenChange,
}: {
  message: Message;
  channelId: string;
  channelName?: string;
  projects: Project[];
  members?: User[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [title, setTitle] = useState(message.body.slice(0, 200));
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [prefilling, setPrefilling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(message.body.slice(0, 200));
    setAssigneeId("");
    setDueDate("");
    setError(null);

    let cancelled = false;
    setPrefilling(true);
    void prefillTaskFromMessage(
      message.body,
      channelName,
      members.map((m) => m.displayName)
    ).then((prefill) => {
      if (cancelled) return;
      setTitle(prefill.title);
      if (prefill.dueDate) setDueDate(prefill.dueDate);
      if (prefill.assignee) {
        const match = members.find(
          (m) =>
            m.displayName.toLowerCase() === prefill.assignee!.toLowerCase() ||
            m.displayName.toLowerCase().includes(prefill.assignee!.toLowerCase())
        );
        if (match) setAssigneeId(match.id);
      }
      if (prefill.projectHint && projects.length > 0) {
        const hint = prefill.projectHint.toLowerCase();
        const match = projects.find(
          (p) =>
            p.name.toLowerCase().includes(hint) ||
            hint.includes(p.name.toLowerCase())
        );
        if (match) setProjectId(match.id);
      }
      setPrefilling(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, message.body, channelName, members, projects]);

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
      assigneeId: assigneeId || undefined,
      dueDate: dueDate || undefined,
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
        {prefilling && (
          <p className="text-xs text-violet-400">AI prefill…</p>
        )}
        {projects.length === 0 ? (
          <p className="text-sm text-zinc-400">Create a project first to add tasks.</p>
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
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            />
            {members.length > 0 && (
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            )}
            {error && <InlineError message={error} />}
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading ? "Creating..." : "Create task"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
