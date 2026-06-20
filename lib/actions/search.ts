"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/data/supabase/server";
import { SHARED_WORKSPACE_SLUG } from "@/lib/data/supabase/queries";
import type { Notification, SearchResult } from "@/lib/data/types";

export async function getNotificationsAction(): Promise<{
  notifications?: Notification[];
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("notifications")
    .select("id, user_id, type, title, body, link, read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return { error: error.message };
  return {
    notifications: (data ?? []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      body: row.body ?? undefined,
      link: row.link ?? undefined,
      read: row.read,
      createdAt: row.created_at,
    })),
  };
}

export async function markNotificationReadAction(
  notificationId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return {};
}

export async function markAllNotificationsReadAction(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);

  if (error) return { error: error.message };
  return {};
}

export async function searchWorkspaceAction(
  query: string
): Promise<{ results?: SearchResult[]; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const q = query.trim();
  if (!q) return { results: [] };

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("slug", SHARED_WORKSPACE_SLUG)
    .maybeSingle();

  if (!workspace) return { results: [] };

  const results: SearchResult[] = [];
  const pattern = `%${q}%`;

  const [channels, projects, events, messages, tasks] = await Promise.all([
    supabase
      .from("channels")
      .select("id, name")
      .eq("workspace_id", workspace.id)
      .ilike("name", pattern)
      .limit(5),
    supabase
      .from("projects")
      .select("id, name, description")
      .eq("workspace_id", workspace.id)
      .or(`name.ilike.${pattern},description.ilike.${pattern}`)
      .limit(5),
    supabase
      .from("events")
      .select("id, title, date")
      .eq("workspace_id", workspace.id)
      .ilike("title", pattern)
      .limit(5),
    supabase
      .from("messages")
      .select("id, body, channel_id, created_at")
      .ilike("body", pattern)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("tasks")
      .select("id, title, project_id, projects(name)")
      .ilike("title", pattern)
      .limit(5),
  ]);

  for (const c of channels.data ?? []) {
    results.push({
      type: "channel",
      id: c.id,
      title: `#${c.name}`,
      link: `/chat/${c.id}`,
    });
  }

  for (const p of projects.data ?? []) {
    results.push({
      type: "project",
      id: p.id,
      title: p.name,
      subtitle: p.description,
      link: `/projects/${p.id}`,
    });
  }

  for (const e of events.data ?? []) {
    results.push({
      type: "event",
      id: e.id,
      title: e.title,
      subtitle: e.date,
      link: "/events",
    });
  }

  for (const m of messages.data ?? []) {
    results.push({
      type: "message",
      id: m.id,
      title: m.body.slice(0, 80),
      subtitle: m.channel_id,
      link: `/chat/${m.channel_id}`,
    });
  }

  for (const t of tasks.data ?? []) {
    const project = t.projects as unknown as { name: string } | null;
    results.push({
      type: "task",
      id: t.id,
      title: t.title,
      subtitle: project?.name,
      link: `/projects/${t.project_id}`,
    });
  }

  return { results };
}
