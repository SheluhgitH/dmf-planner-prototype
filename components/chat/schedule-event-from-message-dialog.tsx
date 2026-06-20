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
import { prefillEventFromMessage } from "@/lib/ai/ai-service";
import { createEventFromMessageAction } from "@/lib/actions/events-from-message";

export function ScheduleEventFromMessageDialog({
  messageBody,
  open,
  onOpenChange,
}: {
  messageBody: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(messageBody.slice(0, 120));
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [prefilling, setPrefilling] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(messageBody.slice(0, 120));
    setDate("");
    setTime("");
    setLocation("");
    setError(null);

    let cancelled = false;
    setPrefilling(true);
    void prefillEventFromMessage(messageBody).then((prefill) => {
      if (cancelled) return;
      setTitle(prefill.title);
      if (prefill.date) setDate(prefill.date);
      if (prefill.time) setTime(prefill.time);
      if (prefill.location) setLocation(prefill.location);
      setPrefilling(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, messageBody]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await createEventFromMessageAction({
        title,
        date,
        time: time || undefined,
        location: location || undefined,
      });
      if (result?.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
      onOpenChange(false);
      router.push("/events");
      router.refresh();
    } catch {
      onOpenChange(false);
      router.push("/events");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule event from message</DialogTitle>
        </DialogHeader>
        {prefilling && (
          <p className="text-xs text-violet-400">AI prefill…</p>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Event title"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          />
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location (optional)"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          />
          {error && <InlineError message={error} />}
          <Button type="submit" disabled={loading || !title.trim() || !date}>
            {loading ? "Creating..." : "Create event"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
