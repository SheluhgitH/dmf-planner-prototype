"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/data/supabase/server";
import { logActivityEvent } from "@/lib/actions/activity";

export async function createEventFromMessageAction(input: {
  title: string;
  date: string;
  time?: string;
  location?: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("slug", "dmf-studio")
    .maybeSingle();

  if (!workspace) return { error: "No workspace found" };

  const { error } = await supabase.from("events").insert({
    workspace_id: workspace.id,
    title: input.title.trim(),
    date: input.date,
    time: input.time || null,
    location: input.location || null,
    created_by: user.id,
  });

  if (error) return { error: error.message };

  await logActivityEvent({
    type: "event_shared",
    title: `Scheduled event: ${input.title}`,
    link: "/events",
  });

  revalidatePath("/events");
  revalidatePath("/dashboard");
  return {};
}
