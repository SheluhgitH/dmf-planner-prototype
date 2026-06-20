import { isSupabaseConfigured } from "@/lib/config";
import {
  mockChannels,
  mockCurrentUser,
  mockEvents,
  mockMembers,
  mockMessages,
  mockProjects,
  mockUsers,
  mockWorkspace,
  mockWorkspaces,
} from "./mock";
import type {
  Channel,
  DashboardData,
  Message,
  PlannerEvent,
  Project,
  User,
  Workspace,
  WorkspaceMember,
} from "./types";

export async function getCurrentUser(): Promise<User | null> {
  if (isSupabaseConfigured()) {
    const { getCurrentUser: getSupabaseUser } = await import(
      "./supabase/queries"
    );
    return getSupabaseUser();
  }
  return mockCurrentUser;
}

export async function getWorkspaces(): Promise<Workspace[]> {
  if (isSupabaseConfigured()) {
    const { getWorkspaces: getSupabaseWorkspaces } = await import(
      "./supabase/queries"
    );
    return getSupabaseWorkspaces();
  }
  return mockWorkspaces;
}

export async function getWorkspaceMembers(
  workspaceId?: string
): Promise<WorkspaceMember[]> {
  if (isSupabaseConfigured()) {
    const { getWorkspaceMembers: getSupabaseMembers } = await import(
      "./supabase/queries"
    );
    const wsId = workspaceId ?? (await getWorkspace()).id;
    return getSupabaseMembers(wsId);
  }
  return mockMembers.filter(
    (m) => !workspaceId || m.workspaceId === workspaceId
  );
}

export async function getChannels(workspaceId?: string): Promise<Channel[]> {
  if (isSupabaseConfigured()) {
    const { getChannels: getSupabaseChannels } = await import(
      "./supabase/queries"
    );
    const wsId = workspaceId ?? (await getWorkspace()).id;
    return getSupabaseChannels(wsId);
  }
  return mockChannels.filter(
    (c) => !workspaceId || c.workspaceId === workspaceId
  );
}

export async function getMessages(
  channelId: string,
  options?: { parentId?: string | null; limit?: number }
): Promise<Message[]> {
  if (isSupabaseConfigured()) {
    const { getMessages: getSupabaseMessages } = await import(
      "./supabase/queries"
    );
    return getSupabaseMessages(channelId, options);
  }
  const messages = mockMessages[channelId] ?? [];
  if (options?.parentId) {
    return messages.filter((m) => m.parentMessageId === options.parentId);
  }
  if (options?.parentId === undefined) {
    return messages.filter((m) => !m.parentMessageId);
  }
  return messages;
}

export async function getThreadReplies(
  parentMessageId: string
): Promise<Message[]> {
  if (isSupabaseConfigured()) {
    const { getThreadReplies: getSupabaseReplies } = await import(
      "./supabase/queries"
    );
    return getSupabaseReplies(parentMessageId);
  }
  return Object.values(mockMessages)
    .flat()
    .filter((m) => m.parentMessageId === parentMessageId);
}

export async function getChannelUnreadCounts(): Promise<
  Record<string, number>
> {
  if (isSupabaseConfigured()) {
    const { getChannelUnreadCounts: getSupabaseUnread } = await import(
      "./supabase/queries"
    );
    const user = await getCurrentUser();
    const workspace = await getWorkspace();
    if (!user) return {};
    return getSupabaseUnread(user.id, workspace.id);
  }
  return { ideas: 2 };
}

export async function getDashboardData(): Promise<DashboardData> {
  if (isSupabaseConfigured()) {
    const { getDashboardData: getSupabaseDashboard } = await import(
      "./supabase/queries"
    );
    return getSupabaseDashboard();
  }

  const today = new Date().toISOString().split("T")[0];
  const recentMessages = Object.entries(mockMessages).flatMap(
    ([channelName, messages]) => {
      const last = messages[messages.length - 1];
      return last ? [{ ...last, channelName }] : [];
    }
  );

  return {
    workspaces: mockWorkspaces,
    recentMessages: recentMessages.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    todaysTasks: mockProjects
      .flatMap((p) => p.tasks)
      .filter((t) => t.dueDate === today),
    upcomingEvents: mockEvents.filter((e) => e.date >= today).slice(0, 4),
    activeProjects: mockProjects.filter((p) => p.status === "active"),
  };
}

export async function getProjects(): Promise<Project[]> {
  if (isSupabaseConfigured()) {
    const { getProjects: getSupabaseProjects } = await import(
      "./supabase/queries"
    );
    return getSupabaseProjects();
  }
  return mockProjects;
}

export async function getProject(projectId: string): Promise<Project | null> {
  const projects = await getProjects();
  return projects.find((p) => p.id === projectId) ?? null;
}

export async function getEvents(): Promise<PlannerEvent[]> {
  if (isSupabaseConfigured()) {
    const { getEvents: getSupabaseEvents } = await import("./supabase/queries");
    const workspace = await getWorkspace();
    return getSupabaseEvents(workspace.id);
  }
  return mockEvents;
}

export async function getWorkspace(): Promise<Workspace> {
  if (isSupabaseConfigured()) {
    const {
      getSharedWorkspace,
      joinSharedWorkspace,
    } = await import("./supabase/queries");
    let shared = await getSharedWorkspace();
    if (!shared) {
      await joinSharedWorkspace();
      shared = await getSharedWorkspace();
    }
    if (shared) return shared;
  }
  const workspaces = await getWorkspaces();
  return workspaces[0] ?? mockWorkspace;
}

export { mockUsers };
