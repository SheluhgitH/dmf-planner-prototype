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
    return getSupabaseMembers(workspaceId ?? "");
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
    return getSupabaseChannels(workspaceId ?? "");
  }
  return mockChannels.filter(
    (c) => !workspaceId || c.workspaceId === workspaceId
  );
}

export async function getMessages(channelId: string): Promise<Message[]> {
  if (isSupabaseConfigured()) {
    const { getMessages: getSupabaseMessages } = await import(
      "./supabase/queries"
    );
    return getSupabaseMessages(channelId);
  }
  return mockMessages[channelId] ?? [];
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
    return getSupabaseEvents();
  }
  return mockEvents;
}

export async function getWorkspace(): Promise<Workspace> {
  const workspaces = await getWorkspaces();
  return workspaces[0] ?? mockWorkspace;
}

export { mockUsers };
