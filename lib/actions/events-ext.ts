"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/data/supabase/server";
import { logActivityEvent } from "@/lib/actions/activity";

export async function updateEventRsvpAction(
  eventId: string,
  status: "going" | "maybe" | "not_going"
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("event_rsvps").upsert(
    {
      event_id: eventId,
      user_id: user.id,
      status,
      responded_at: new Date().toISOString(),
    },
    { onConflict: "event_id,user_id" }
  );

  if (error) return { error: error.message };

  const { data: event } = await supabase
    .from("events")
    .select("title")
    .eq("id", eventId)
    .maybeSingle();

  await logActivityEvent({
    type: "event_rsvp",
    title: `RSVP ${status.replace("_", " ")}: ${event?.title ?? "Event"}`,
    link: "/events",
  });

  revalidatePath("/events");
  revalidatePath("/dashboard");
  return {};
}

export async function shareEventToChannelAction(
  eventId: string,
  channelId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: event } = await supabase
    .from("events")
    .select("title, date, time, location")
    .eq("id", eventId)
    .maybeSingle();

  if (!event) return { error: "Event not found" };

  const body = [
    `📅 **${event.title}**`,
    `Date: ${event.date}${event.time ? ` at ${event.time}` : ""}`,
    event.location ? `Location: ${event.location}` : null,
    `[View event](/events)`,
  ]
    .filter(Boolean)
    .join("\n");

  const { error } = await supabase.from("messages").insert({
    channel_id: channelId,
    author_id: user.id,
    body,
  });

  if (error) return { error: error.message };

  await logActivityEvent({
    type: "event_shared",
    title: `Shared event to channel: ${event.title}`,
    link: `/chat/${channelId}`,
  });

  revalidatePath(`/chat/${channelId}`);
  return {};
}
