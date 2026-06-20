"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { shareEventToChannelAction } from "@/lib/actions/events-ext";
import type { Channel } from "@/lib/data/types";

export function ShareEventButton({
  eventId,
  channels,
}: {
  eventId: string;
  channels: Channel[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const publicChannels = channels.filter((c) => !c.isDm);

  async function share(channelId: string) {
    const { error } = await shareEventToChannelAction(eventId, channelId);
    if (!error) {
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Share2 className="mr-1 h-3 w-3" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share to channel</DialogTitle>
        </DialogHeader>
        <ul className="space-y-1">
          {publicChannels.map((c) => (
            <li key={c.id}>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => void share(c.id)}
              >
                #{c.name}
              </Button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
