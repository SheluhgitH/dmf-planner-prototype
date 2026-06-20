"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/data/supabase/server";
import { SHARED_WORKSPACE_SLUG } from "@/lib/data/supabase/queries";
import type { Project, Task } from "@/lib/data/types";

async function getWorkspaceId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" as const };

  let { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("slug", SHARED_WORKSPACE_SLUG)
    .maybeSingle();

  if (!workspace) {
    await supabase.rpc("join_shared_workspace");
    const retry = await supabase
      .from("workspaces")
      .select("id")
      .eq("slug", SHARED_WORKSPACE_SLUG)
      .maybeSingle();
    workspace = retry.data;
  }

  if (!workspace) return { error: "No workspace found" as const };
  return { workspaceId: workspace.id, userId: user.id };
}

export async function createProjectAction(
  name: string,
  description: string
): Promise<{ project?: Project; error?: string }> {
  const supabase = await createClient();
  const ctx = await getWorkspaceId(supabase);
  if ("error" in ctx) return { error: ctx.error };

  const { data, error } = await supabase
    .from("projects")
    .insert({
      workspace_id: ctx.workspaceId,
      name: name.trim(),
      description: description.trim(),
      created_by: ctx.userId,
    })
    .select("id, workspace_id, name, description, status")
    .single();

  if (error || !data) return { error: error?.message ?? "Failed to create project" };

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  return {
    project: {
      id: data.id,
      workspaceId: data.workspace_id,
      name: data.name,
      description: data.description,
      status: data.status,
      tasks: [],
    },
  };
}

export async function createTaskAction(input: {
  projectId: string;
  title: string;
  dueDate?: string;
  assigneeId?: string;
  sourceMessageId?: string;
  sourceChannelId?: string;
}): Promise<{ task?: Task; error?: string }> {
  const supabase = await createClient();
  const ctx = await getWorkspaceId(supabase);
  if ("error" in ctx) return { error: ctx.error };

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      project_id: input.projectId,
      title: input.title.trim(),
      due_date: input.dueDate || null,
      assignee_id: input.assigneeId || null,
      source_message_id: input.sourceMessageId || null,
      source_channel_id: input.sourceChannelId || null,
      created_by: ctx.userId,
    })
    .select("id, project_id, title, status, due_date, assignee_id, source_message_id, source_channel_id")
    .single();

  if (error || !data) return { error: error?.message ?? "Failed to create task" };

  if (input.assigneeId && input.assigneeId !== ctx.userId) {
    await supabase.from("notifications").insert({
      user_id: input.assigneeId,
      type: "task_assigned",
      title: "New task assigned",
      body: data.title,
      link: `/projects/${data.project_id}`,
    });
  }

  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  return {
    task: {
      id: data.id,
      projectId: data.project_id,
      title: data.title,
      status: data.status,
      dueDate: data.due_date ?? undefined,
      assigneeId: data.assignee_id ?? undefined,
      sourceMessageId: data.source_message_id ?? undefined,
      sourceChannelId: data.source_channel_id ?? undefined,
    },
  };
}

export async function updateTaskStatusAction(
  taskId: string,
  projectId: string,
  status: Task["status"]
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", taskId);

  if (error) return { error: error.message };
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
  return {};
}

export async function updateTaskAction(
  taskId: string,
  projectId: string,
  updates: { title?: string; dueDate?: string | null; assigneeId?: string | null }
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({
      ...(updates.title !== undefined ? { title: updates.title } : {}),
      ...(updates.dueDate !== undefined ? { due_date: updates.dueDate } : {}),
      ...(updates.assigneeId !== undefined ? { assignee_id: updates.assigneeId } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (error) return { error: error.message };
  revalidatePath(`/projects/${projectId}`);
  return {};
}

export async function deleteTaskAction(
  taskId: string,
  projectId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) return { error: error.message };
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
  return {};
}

export async function createTaskFromMessageAction(input: {
  projectId: string;
  title: string;
  messageId: string;
  channelId: string;
  assigneeId?: string;
}): Promise<{ task?: Task; error?: string }> {
  return createTaskAction({
    projectId: input.projectId,
    title: input.title,
    assigneeId: input.assigneeId,
    sourceMessageId: input.messageId,
    sourceChannelId: input.channelId,
  });
}
