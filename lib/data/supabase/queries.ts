import { createClient } from "./server";
import type {
  Channel,
  DashboardData,
  Message,
  PlannerEvent,
  Project,
  User,
  Workspace,
  WorkspaceMember,
} from "../types";

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? "",
    displayName: profile?.display_name ?? user.email?.split("@")[0] ?? "User",
    avatarUrl: profile?.avatar_url ?? undefined,
  };
}

export async function getWorkspaces(): Promise<Workspace[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workspaces")
    .select("id, name, slug")
    .order("name");
  return data ?? [];
}

export async function getWorkspaceMembers(
  workspaceId: string
): Promise<WorkspaceMember[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workspace_members")
    .select(
      "user_id, workspace_id, role, profiles(id, display_name, avatar_url)"
    )
    .eq("workspace_id", workspaceId);

  return (data ?? []).map((row) => {
    const raw = row.profiles;
    const profile = (Array.isArray(raw) ? raw[0] : raw) as {
      id: string;
      display_name: string;
      avatar_url: string | null;
    } | null;
    return {
      userId: row.user_id,
      workspaceId: row.workspace_id,
      role: row.role,
      user: {
        id: row.user_id,
        email: "",
        displayName: profile?.display_name ?? "Member",
        avatarUrl: profile?.avatar_url ?? undefined,
      },
    };
  });
}

export async function getChannels(workspaceId: string): Promise<Channel[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("channels")
    .select("id, workspace_id, name, type, is_dm")
    .eq("workspace_id", workspaceId)
    .order("name");
  return (data ?? []).map((c) => ({
    id: c.id,
    workspaceId: c.workspace_id,
    name: c.name,
    type: c.type,
    isDm: c.is_dm,
  }));
}

export async function getMessages(channelId: string): Promise<Message[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select(
      "id, channel_id, author_id, body, created_at, profiles(display_name, avatar_url)"
    )
    .eq("channel_id", channelId)
    .order("created_at", { ascending: true });

  return (data ?? []).map((m) => {
    const raw = m.profiles;
    const profile = (Array.isArray(raw) ? raw[0] : raw) as {
      display_name: string;
      avatar_url: string | null;
    } | null;
    return {
      id: m.id,
      channelId: m.channel_id,
      authorId: m.author_id,
      body: m.body,
      createdAt: m.created_at,
      author: {
        id: m.author_id,
        email: "",
        displayName: profile?.display_name ?? "Member",
        avatarUrl: profile?.avatar_url ?? undefined,
      },
    };
  });
}

export async function sendMessage(
  channelId: string,
  body: string
): Promise<Message | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("messages")
    .insert({ channel_id: channelId, author_id: user.id, body })
    .select("id, channel_id, author_id, body, created_at")
    .single();

  if (error || !data) return null;
  const currentUser = await getCurrentUser();
  return {
    id: data.id,
    channelId: data.channel_id,
    authorId: data.author_id,
    body: data.body,
    createdAt: data.created_at,
    author: currentUser ?? undefined,
  };
}

export async function getDashboardData(): Promise<DashboardData> {
  const workspaces = await getWorkspaces();
  const workspace = workspaces[0];
  if (!workspace) {
    return {
      workspaces: [],
      recentMessages: [],
      todaysTasks: [],
      upcomingEvents: [],
      activeProjects: [],
    };
  }

  const channels = await getChannels(workspace.id);
  const recentMessages: DashboardData["recentMessages"] = [];

  for (const channel of channels.slice(0, 4)) {
    const messages = await getMessages(channel.id);
    const last = messages[messages.length - 1];
    if (last) {
      recentMessages.push({ ...last, channelName: channel.name });
    }
  }

  return {
    workspaces,
    recentMessages: recentMessages.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    todaysTasks: [],
    upcomingEvents: [],
    activeProjects: [],
  };
}

export async function getProjects(): Promise<Project[]> {
  return [];
}

export async function getEvents(): Promise<PlannerEvent[]> {
  return [];
}

export async function signIn(email: string, password: string) {
  const supabase = await createClient();
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(email: string, password: string, displayName: string) {
  const supabase = await createClient();
  return supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
}

export async function signOut() {
  const supabase = await createClient();
  return supabase.auth.signOut();
}
