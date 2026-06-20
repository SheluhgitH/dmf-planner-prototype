"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { updateEventRsvpAction } from "@/lib/actions/events-ext";
import type { PlannerEvent } from "@/lib/data/types";
import { cn } from "@/lib/utils";

export function EventRsvpButtons({ event }: { event: PlannerEvent }) {
  const router = useRouter();

  async function rsvp(status: "going" | "maybe" | "not_going") {
    await updateEventRsvpAction(event.id, status);
    router.refresh();
  }

  const options = [
    { status: "going" as const, label: "Going" },
    { status: "maybe" as const, label: "Maybe" },
    { status: "not_going" as const, label: "Can't go" },
  ];

  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {options.map((opt) => (
        <Button
          key={opt.status}
          size="sm"
          variant={event.myRsvp === opt.status ? "default" : "outline"}
          className={cn("h-7 text-xs")}
          onClick={() => void rsvp(opt.status)}
        >
          {opt.label}
        </Button>
      ))}
      {(event.goingCount ?? 0) > 0 && (
        <span className="ml-2 self-center text-xs text-zinc-500">
          {event.goingCount} going
        </span>
      )}
    </div>
  );
}
