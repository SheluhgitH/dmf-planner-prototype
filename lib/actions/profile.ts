"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/data/supabase/server";

export async function updateProfileAction(
  displayName: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName.trim() })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return {};
}

export async function getLinkedTasksForChannelAction(channelId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .select("id, title, project_id, source_message_id, source_channel_id")
    .eq("source_channel_id", channelId)
    .not("source_message_id", "is", null);

  const map: Record<string, { id: string; title: string; projectId: string }> = {};
  for (const row of data ?? []) {
    if (row.source_message_id) {
      map[row.source_message_id] = {
        id: row.id,
        title: row.title,
        projectId: row.project_id,
      };
    }
  }
  return { linkedTasks: map };
}
