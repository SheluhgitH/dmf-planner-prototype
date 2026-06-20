import { createClient } from "./server";
import type {
  Channel,
  DashboardData,
  Message,
  MessageAttachment,
  MessageReaction,
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

export const SHARED_WORKSPACE_SLUG = "dmf-studio";

export async function joinSharedWorkspace(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_shared_workspace");
  if (error || !data) return null;
  return data as string;
}

export async function getSharedWorkspace(): Promise<Workspace | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workspaces")
    .select("id, name, slug")
    .eq("slug", SHARED_WORKSPACE_SLUG)
    .maybeSingle();

  if (!data) return null;
  return { id: data.id, name: data.name, slug: data.slug };
}

export async function getWorkspaces(): Promise<Workspace[]> {
  const shared = await getSharedWorkspace();
  if (shared) return [shared];

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

function mapChannelRows(
  data: {
    id: string;
    workspace_id: string;
    name: string;
    type: string;
    is_dm: boolean;
  }[]
): Channel[] {
  return data.map((c) => ({
    id: c.id,
    workspaceId: c.workspace_id,
    name: c.name,
    type: c.type as Channel["type"],
    isDm: c.is_dm,
  }));
}

export async function getChannels(workspaceId: string): Promise<Channel[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("channels")
    .select("id, workspace_id, name, type, is_dm")
    .eq("workspace_id", workspaceId)
    .order("name");

  if (data?.length) return mapChannelRows(data);

  const { data: general } = await supabase
    .from("channels")
    .select("workspace_id")
    .eq("id", "general")
    .maybeSingle();

  if (general?.workspace_id && general.workspace_id !== workspaceId) {
    const { data: fallback } = await supabase
      .from("channels")
      .select("id, workspace_id, name, type, is_dm")
      .eq("workspace_id", general.workspace_id)
      .order("name");
    return mapChannelRows(fallback ?? []);
  }

  return [];
}

type MessageRow = {
  id: string;
  channel_id: string;
  author_id: string;
  body: string;
  parent_message_id: string | null;
  created_at: string;
  profiles: { display_name: string; avatar_url: string | null } | { display_name: string; avatar_url: string | null }[] | null;
  message_attachments?: {
    id: string;
    storage_path: string;
    file_name: string;
    mime_type: string | null;
    file_size: number | null;
  }[];
  message_reactions?: { emoji: string; user_id: string }[];
};

function getProfile(raw: MessageRow["profiles"]) {
  return (Array.isArray(raw) ? raw[0] : raw) as {
    display_name: string;
    avatar_url: string | null;
  } | null;
}

function aggregateReactions(
  reactions: { emoji: string; user_id: string }[] | undefined,
  currentUserId?: string
): MessageReaction[] {
  if (!reactions?.length) return [];
  const map = new Map<string, { count: number; reactedByMe: boolean }>();
  for (const r of reactions) {
    const existing = map.get(r.emoji) ?? { count: 0, reactedByMe: false };
    existing.count += 1;
    if (currentUserId && r.user_id === currentUserId) existing.reactedByMe = true;
    map.set(r.emoji, existing);
  }
  return Array.from(map.entries()).map(([emoji, data]) => ({
    emoji,
    count: data.count,
    reactedByMe: data.reactedByMe,
  }));
}

async function mapMessageRow(
  m: MessageRow,
  replyCounts: Record<string, number>,
  currentUserId?: string,
  signedUrls?: Record<string, string>
): Promise<Message> {
  const profile = getProfile(m.profiles);
  const attachments: MessageAttachment[] = (m.message_attachments ?? []).map(
    (a) => ({
      id: a.id,
      fileName: a.file_name,
      mimeType: a.mime_type ?? undefined,
      fileSize: a.file_size ?? undefined,
      storagePath: a.storage_path,
      url: signedUrls?.[a.storage_path],
    })
  );

  return {
    id: m.id,
    channelId: m.channel_id,
    authorId: m.author_id,
    body: m.body,
    createdAt: m.created_at,
    parentMessageId: m.parent_message_id ?? undefined,
    replyCount: replyCounts[m.id] ?? 0,
    attachments,
    reactions: aggregateReactions(m.message_reactions, currentUserId),
    author: {
      id: m.author_id,
      email: "",
      displayName: profile?.display_name ?? "Member",
      avatarUrl: profile?.avatar_url ?? undefined,
    },
  };
}

async function getSignedUrls(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paths: string[]
): Promise<Record<string, string>> {
  const urls: Record<string, string> = {};
  await Promise.all(
    paths.map(async (path) => {
      const { data } = await supabase.storage
        .from("chat-attachments")
        .createSignedUrl(path, 3600);
      if (data?.signedUrl) urls[path] = data.signedUrl;
    })
  );
  return urls;
}

export async function getMessages(
  channelId: string,
  options?: { parentId?: string | null; limit?: number }
): Promise<Message[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase
    .from("messages")
    .select(
      `id, channel_id, author_id, body, parent_message_id, created_at,
       profiles(display_name, avatar_url),
       message_attachments(id, storage_path, file_name, mime_type, file_size),
       message_reactions(emoji, user_id)`
    )
    .eq("channel_id", channelId)
    .order("created_at", { ascending: true });

  if (options?.parentId === undefined) {
    query = query.is("parent_message_id", null);
  } else if (options.parentId) {
    query = query.eq("parent_message_id", options.parentId);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data } = await query;
  const rows = (data ?? []) as MessageRow[];

  const { data: replyData } = await supabase
    .from("messages")
    .select("parent_message_id")
    .eq("channel_id", channelId)
    .not("parent_message_id", "is", null);

  const replyCounts: Record<string, number> = {};
  for (const r of replyData ?? []) {
    if (r.parent_message_id) {
      replyCounts[r.parent_message_id] =
        (replyCounts[r.parent_message_id] ?? 0) + 1;
    }
  }

  const allPaths = rows.flatMap((m) =>
    (m.message_attachments ?? []).map((a) => a.storage_path)
  );
  const signedUrls = await getSignedUrls(supabase, allPaths);

  return Promise.all(
    rows.map((m) => mapMessageRow(m, replyCounts, user?.id, signedUrls))
  );
}

export async function getThreadReplies(
  parentMessageId: string
): Promise<Message[]> {
  const supabase = await createClient();
  const { data: parent } = await supabase
    .from("messages")
    .select("channel_id")
    .eq("id", parentMessageId)
    .single();

  if (!parent) return [];
  return getMessages(parent.channel_id, { parentId: parentMessageId });
}

export async function getChannelUnreadCounts(
  userId: string,
  workspaceId: string
): Promise<Record<string, number>> {
  const supabase = await createClient();
  const channels = await getChannels(workspaceId);
  const counts: Record<string, number> = {};

  const { data: reads } = await supabase
    .from("channel_reads")
    .select("channel_id, last_read_at")
    .eq("user_id", userId);

  const readMap = new Map(
    (reads ?? []).map((r) => [r.channel_id, r.last_read_at])
  );

  for (const channel of channels) {
    const lastRead = readMap.get(channel.id);
    let query = supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("channel_id", channel.id)
      .neq("author_id", userId);

    if (lastRead) {
      query = query.gt("created_at", lastRead);
    }

    const { count } = await query;
    if (count && count > 0) counts[channel.id] = count;
  }

  return counts;
}

export async function getMessageAttachmentUrl(
  storagePath: string
): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.storage
    .from("chat-attachments")
    .createSignedUrl(storagePath, 3600);
  return data?.signedUrl ?? null;
}

export async function sendMessage(
  channelId: string,
  body: string,
  parentMessageId?: string
): Promise<{ message?: Message; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("messages")
    .insert({
      channel_id: channelId,
      author_id: user.id,
      body,
      parent_message_id: parentMessageId ?? null,
    })
    .select("id, channel_id, author_id, body, parent_message_id, created_at")
    .single();

  if (error) return { error: error.message };
  if (!data) return { error: "Failed to send message" };

  const currentUser = await getCurrentUser();
  return {
    message: {
      id: data.id,
      channelId: data.channel_id,
      authorId: data.author_id,
      body: data.body,
      createdAt: data.created_at,
      parentMessageId: data.parent_message_id ?? undefined,
      author: currentUser ?? undefined,
    },
  };
}

export async function getDashboardData(): Promise<DashboardData> {
  const workspace = (await getSharedWorkspace()) ?? (await getWorkspaces())[0];
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
  const today = new Date().toISOString().split("T")[0];

  for (const channel of channels.slice(0, 4)) {
    const messages = await getMessages(channel.id);
    const last = messages[messages.length - 1];
    if (last) {
      recentMessages.push({ ...last, channelName: channel.name });
    }
  }

  const events = await getEvents(workspace.id);
  const upcomingEvents = events
    .filter((e) => e.date >= today)
    .slice(0, 4);

  return {
    workspaces: [workspace],
    recentMessages: recentMessages.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    todaysTasks: [],
    upcomingEvents,
    activeProjects: [],
  };
}

export async function getProjects(): Promise<Project[]> {
  return [];
}

export async function getEvents(workspaceId?: string): Promise<PlannerEvent[]> {
  const supabase = await createClient();
  let query = supabase
    .from("events")
    .select("id, workspace_id, title, date, time, location")
    .order("date")
    .order("time");

  if (workspaceId) {
    query = query.eq("workspace_id", workspaceId);
  }

  const { data } = await query;

  return (data ?? []).map((row) => ({
    id: row.id,
    workspaceId: row.workspace_id,
    title: row.title,
    date: row.date,
    time: row.time ?? undefined,
    location: row.location ?? undefined,
  }));
}

export async function signIn(email: string, password: string) {
  const supabase = await createClient();
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(
  email: string,
  password: string,
  displayName: string
) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  return { data, error };
}

export async function signOut() {
  const supabase = await createClient();
  return supabase.auth.signOut();
}
