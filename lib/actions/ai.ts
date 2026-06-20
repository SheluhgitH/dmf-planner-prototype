"use server";

import { createClient } from "@/lib/data/supabase/server";
import {
  getMessages,
  getSharedWorkspace,
  getDashboardData,
} from "@/lib/data/supabase/queries";
import { getProjects } from "@/lib/data/provider";

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

export async function getChannelContextAction(channelId: string): Promise<{
  transcript?: string;
  channelName?: string;
  taskTitles?: string;
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const messages = await getMessages(channelId, { limit: 30 });
  if (messages.length === 0) {
    return { error: "No messages in this channel yet" };
  }

  const { data: channel } = await supabase
    .from("channels")
    .select("name")
    .eq("id", channelId)
    .maybeSingle();

  const transcript = messages
    .map((m) => `${m.author?.displayName ?? "User"}: ${m.body}`)
    .join("\n");

  const projects = await getProjects();
  const linkedProject = projects.find((p) =>
    channel?.name ? `project-${p.name.toLowerCase().replace(/\s+/g, "-")}` === channel.name ||
      channel.name.includes(p.name.toLowerCase().replace(/\s+/g, "-"))
    : false
  );
  const taskTitles = linkedProject
    ? linkedProject.tasks.map((t) => `- ${t.title} (${t.status})`).join("\n")
    : "";

  return {
    transcript,
    channelName: channel?.name ?? "channel",
    taskTitles,
  };
}

export async function getThreadContextAction(
  channelId: string,
  parentMessageId: string
): Promise<{ transcript?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: parentRow } = await supabase
    .from("messages")
    .select("body, profiles(display_name)")
    .eq("id", parentMessageId)
    .maybeSingle();

  const replies = await getMessages(channelId, {
    limit: 30,
    parentId: parentMessageId,
  });

  const lines: string[] = [];
  if (parentRow) {
    const profile = parentRow.profiles as unknown as { display_name: string } | null;
    lines.push(`${profile?.display_name ?? "User"}: ${parentRow.body}`);
  }

  for (const r of replies) {
    lines.push(`${r.author?.displayName ?? "User"}: ${r.body}`);
  }

  if (lines.length === 0) return { error: "No thread messages" };
  return { transcript: lines.join("\n") };
}

export async function getStudioDigestContextAction(): Promise<{
  context?: string;
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const data = await getDashboardData();
  const parts: string[] = [];

  if (data.recentMessages.length > 0) {
    parts.push(
      "Recent messages:\n" +
        data.recentMessages
          .slice(0, 5)
          .map((m) => `#${m.channelName}: ${m.body.slice(0, 100)}`)
          .join("\n")
    );
  }

  if (data.todaysTasks.length > 0) {
    parts.push(
      "Tasks due today:\n" +
        data.todaysTasks.map((t) => `- ${t.title}`).join("\n")
    );
  }

  if (data.upcomingEvents.length > 0) {
    parts.push(
      "Upcoming events:\n" +
        data.upcomingEvents
          .slice(0, 3)
          .map((e) => `- ${e.title} on ${e.date}`)
          .join("\n")
    );
  }

  if (data.assignedTasksDueSoon.length > 0) {
    parts.push(
      "Assigned soon:\n" +
        data.assignedTasksDueSoon.map((t) => `- ${t.title}`).join("\n")
    );
  }

  if (parts.length === 0) {
    return { context: "No recent activity in the workspace yet." };
  }

  return { context: parts.join("\n\n") };
}

/** @deprecated Use client-side WebLLM via ai-service */
export async function generateFromChatContextAction(
  channelId: string,
  tool: "summary" | "tasks" | "brief"
): Promise<{ output?: string; error?: string }> {
  const { transcript, channelName, error } = await getChannelContextAction(channelId);
  if (error || !transcript) return { error: error ?? "No context" };

  if (tool === "summary") {
    const bullets = transcript
      .split("\n")
      .filter((l) => l.length > 20)
      .slice(-10)
      .map((l) => `• ${l.slice(0, 120)}`);
    return {
      output: `Meeting Summary (offline)\n\n${bullets.join("\n")}\n\nAction items:\n• Review notes above`,
    };
  }

  if (tool === "tasks") {
    const suggestions = transcript
      .split("\n")
      .filter((l) => l.length > 15)
      .slice(-5)
      .map((l, i) => `${i + 1}. ${l.slice(0, 80)}`);
    return {
      output: `Suggested tasks:\n\n${suggestions.join("\n")}`,
    };
  }

  return {
    output: `Project Brief (offline)\n\n#${channelName}\n\n${transcript.slice(0, 500)}...`,
  };
}
