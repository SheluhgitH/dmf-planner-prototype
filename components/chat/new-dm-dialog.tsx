"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCirclePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getOrCreateDmChannelAction } from "@/lib/actions/channels";
import type { User } from "@/lib/data/types";

export function NewDmDialog({
  members,
  currentUserId,
}: {
  members: User[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  async function startDm(userId: string) {
    setLoading(userId);
    const { channel, error } = await getOrCreateDmChannelAction(userId);
    setLoading(null);
    if (channel) {
      setOpen(false);
      router.push(`/chat/${channel.id}`);
      router.refresh();
    } else if (error) {
      alert(error);
    }
  }

  const others = members.filter((m) => m.id !== currentUserId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-1 px-3 py-1 text-xs text-zinc-500 hover:text-zinc-300"
        >
          <MessageCirclePlus className="h-3 w-3" />
          New message
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start a direct message</DialogTitle>
        </DialogHeader>
        <ul className="space-y-1">
          {others.map((m) => (
            <li key={m.id}>
              <Button
                variant="ghost"
                className="w-full justify-start"
                disabled={loading === m.id}
                onClick={() => void startDm(m.id)}
              >
                {m.displayName}
              </Button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
