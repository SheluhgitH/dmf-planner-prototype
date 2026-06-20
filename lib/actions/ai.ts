"use server";

import { createClient } from "@/lib/data/supabase/server";
import {
  getMessages,
  getSharedWorkspace,
  getDashboardData,
} from "@/lib/data/supabase/queries";
import { getProjects, getWorkspaceMembers, getEvents } from "@/lib/data/provider";
import { formatTranscriptFromMessages } from "@/lib/ai/parse";
import { resolveChannelType } from "@/lib/ai/validate";
import type { AiContext, AiMember, ChannelType } from "@/lib/ai/types";

export type ChannelContextResult =
  | (AiContext & { members: AiMember[]; taskTitles?: string })
  | { error: string };

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

export async function getChannelContextAction(
  channelId: string,
  messageLimit = 30
): Promise<ChannelContextResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const messages = await getMessages(channelId, { limit: messageLimit });
  if (messages.length === 0) {
    return { error: "No messages in this channel yet" };
  }

  const { data: channel } = await supabase
    .from("channels")
    .select("name")
    .eq("id", channelId)
    .maybeSingle();

  const channelName = channel?.name ?? "channel";
  const channelType: ChannelType = resolveChannelType(channelName);
  const { transcript, messageCount, dateRange } =
    formatTranscriptFromMessages(messages, messageLimit);

  const workspaceMembers = await getWorkspaceMembers();
  const members: AiMember[] = workspaceMembers.map((m) => ({
    id: m.user.id,
    displayName: m.user.displayName,
  }));
  const memberNames = members.map((m) => m.displayName);

  const projects = await getProjects();
  const slug = channelName.replace(/^project-/, "");
  const linkedProject = projects.find((p) => {
    const pSlug = p.name.toLowerCase().replace(/\s+/g, "-");
    return (
      channelName === `project-${pSlug}` ||
      channelName.includes(pSlug) ||
      p.name.toLowerCase() === slug.replace(/-/g, " ")
    );
  });

  const events = await getEvents();
  const today = new Date().toISOString().split("T")[0];
  const upcomingEvents = events
    .filter((e) => e.date >= today)
    .slice(0, 5)
    .map((e) => ({ title: e.title, date: e.date }));

  const taskTitles = linkedProject
    ? linkedProject.tasks.map((t) => `- ${t.title} (${t.status})`).join("\n")
    : "";

  return {
    transcript,
    channelName,
    channelType,
    memberNames,
    members,
    linkedProject: linkedProject
      ? {
          id: linkedProject.id,
          name: linkedProject.name,
          tasks: linkedProject.tasks.map((t) => ({
            title: t.title,
            status: t.status,
          })),
        }
      : undefined,
    upcomingEvents,
    messageCount,
    dateRange,
    taskTitles,
  };
}

export async function getThreadContextAction(
  channelId: string,
  parentMessageId: string
): Promise<{ transcript?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
