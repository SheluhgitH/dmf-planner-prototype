"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getActivityFeedAction } from "@/lib/actions/activity";
import { formatRelativeTime } from "@/lib/utils";

export function ActivityFeed() {
  const [events, setEvents] = useState<
    { id: string; title: string; body?: string; link?: string; createdAt: string }[]
  >([]);

  useEffect(() => {
    void getActivityFeedAction(15).then(({ events: data }) => {
      setEvents(data ?? []);
    });
  }, []);

  if (events.length === 0) {
    return <p className="text-sm text-zinc-500">No recent activity yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {events.map((event) => (
        <li key={event.id}>
          {event.link ? (
            <Link
              href={event.link}
              className="block rounded-lg bg-zinc-800/50 px-3 py-2 text-sm hover:bg-zinc-800"
            >
              <p className="text-zinc-200">{event.title}</p>
              {event.body && (
                <p className="truncate text-xs text-zinc-500">{event.body}</p>
              )}
              <p className="mt-0.5 text-[10px] text-zinc-600">
                {formatRelativeTime(event.createdAt)}
              </p>
            </Link>
          ) : (
            <div className="rounded-lg bg-zinc-800/50 px-3 py-2 text-sm">
              <p className="text-zinc-200">{event.title}</p>
              <p className="mt-0.5 text-[10px] text-zinc-600">
                {formatRelativeTime(event.createdAt)}
              </p>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
