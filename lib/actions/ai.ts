"use server";

import { createClient } from "@/lib/data/supabase/server";
import { getMessages, getSharedWorkspace } from "@/lib/data/supabase/queries";

export async function generateFromChatContextAction(
  channelId: string,
  tool: "summary" | "tasks" | "brief"
): Promise<{ output?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const messages = await getMessages(channelId, { limit: 50 });
  if (messages.length === 0) {
    return { error: "No messages in this channel yet" };
  }

  const transcript = messages
    .map((m) => `${m.author?.displayName ?? "User"}: ${m.body}`)
    .join("\n");

  if (tool === "summary") {
    const bullets = messages
      .filter((m) => m.body.trim().length > 20)
      .slice(-10)
      .map((m) => `• ${m.body.slice(0, 120)}`);
    return {
      output: `Meeting Summary (draft)\n\n${bullets.join("\n")}\n\nAction items:\n• Review notes above\n• Follow up in project board`,
    };
  }

  if (tool === "tasks") {
    const suggestions = messages
      .filter((m) => m.body.length > 15)
      .slice(-5)
      .map((m, i) => `${i + 1}. ${m.body.slice(0, 80)}`);
    return {
      output: `Suggested tasks (confirm before creating):\n\n${suggestions.join("\n")}`,
    };
  }

  return {
    output: `Project Brief (draft)\n\nBased on ${messages.length} messages:\n\n${transcript.slice(0, 500)}...\n\nNext steps: refine goals, assign owners, set deadlines.`,
  };
}

export async function getChannelsForAiAction(): Promise<{
  channels?: { id: string; name: string }[];
  error?: string;
}> {
  const workspace = await getSharedWorkspace();
  if (!workspace) return { channels: [] };

  const supabase = await createClient();
  const { data } = await supabase
    .from("channels")
    .select("id, name")
    .eq("workspace_id", workspace.id)
    .eq("is_dm", false)
    .order("name");

  return { channels: data ?? [] };
}
