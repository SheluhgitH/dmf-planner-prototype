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

  await supabase.rpc("join_shared_workspace");

  const { data: channel } = await supabase
    .from("channels")
    .select("workspace_id")
    .eq("id", "general")
    .maybeSingle();

  if (channel?.workspace_id) {
    const { data } = await supabase
      .from("workspaces")
      .select("id, name, slug")
      .eq("id", channel.workspace_id)
      .maybeSingle();
    if (data) {
      return { id: data.id, name: data.name, slug: data.slug };
    }
  }

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
  message_attachments?: {
    id: string;
    storage_path: string;
    file_name: string;
    mime_type: string | null;
    file_size: number | null;
  }[];
  message_reactions?: { emoji: string; user_id: string }[];
};

type ProfileRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
};

async function fetchProfileMap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  authorIds: string[]
): Promise<Map<string, ProfileRow>> {
  const map = new Map<string, ProfileRow>();
  if (!authorIds.length) return map;

  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", authorIds);

  for (const profile of data ?? []) {
    map.set(profile.id, profile);
  }
  return map;
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
  profileMap: Map<string, ProfileRow>,
  currentUserId?: string,
  signedUrls?: Record<string, string>
): Promise<Message> {
  const profile = profileMap.get(m.author_id);
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

async function queryMessageRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  channelId: string,
  options: {
    parentId?: string | null;
    limit?: number;
    beforeMessageId?: string;
  }
): Promise<MessageRow[]> {
  const isChannelFeed = options.parentId === undefined;
  const richSelect = `id, channel_id, author_id, body, parent_message_id, created_at,
       message_attachments(id, storage_path, file_name, mime_type, file_size),
       message_reactions(emoji, user_id)`;
  const baseSelect =
    "id, channel_id, author_id, body, parent_message_id, created_at";

  let beforeCreatedAt: string | null = null;
  if (isChannelFeed && options.beforeMessageId) {
    const { data: beforeMessage } = await supabase
      .from("messages")
      .select("created_at")
      .eq("id", options.beforeMessageId)
      .single();
    beforeCreatedAt = beforeMessage?.created_at ?? null;
  }

  const run = async (select: string) => {
    let q = supabase.from("messages").select(select).eq("channel_id", channelId);

    if (isChannelFeed) {
      q = q.is("parent_message_id", null);
      if (beforeCreatedAt) {
        q = q.lt("created_at", beforeCreatedAt);
      }
      q = q.order("created_at", { ascending: false });
      if (options.limit) {
        q = q.limit(options.limit);
      }
    } else {
      q = q.order("created_at", { ascending: true });
      if (options.parentId) {
        q = q.eq("parent_message_id", options.parentId);
      }
      if (options.limit) {
        q = q.limit(options.limit);
      }
    }

    return q;
  };

  let { data, error } = await run(richSelect);
  if (error) {
    console.error("getMessages rich query failed:", error.message);
    ({ data, error } = await run(baseSelect));
  }
  if (error) {
    console.error("getMessages failed:", error.message);
    return [];
  }

  const rows = (data ?? []) as unknown as MessageRow[];
  if (isChannelFeed && (options.limit || options.beforeMessageId)) {
    return [...rows].reverse();
  }
  return rows;
}

export async function getMessages(
  channelId: string,
  options?: {
    parentId?: string | null;
    limit?: number;
    beforeMessageId?: string;
  }
): Promise<Message[]> {
  const supabase = await createClient();
  await joinSharedWorkspace();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rows = await queryMessageRows(supabase, channelId, options ?? {});

  const authorIds = [...new Set(rows.map((row) => row.author_id))];
  const profileMap = await fetchProfileMap(supabase, authorIds);

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
    rows.map((m) =>
      mapMessageRow(m, replyCounts, profileMap, user?.id, signedUrls)
    )
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
      .is("parent_message_id", null)
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

  await joinSharedWorkspace();

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

  // Parse @mentions and create notifications
  const mentionPattern = /@([\w.-]+)/g;
  const mentions = [...body.matchAll(mentionPattern)].map((m) => m[1].toLowerCase());
  if (mentions.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name");
    for (const profile of profiles ?? []) {
      const name = profile.display_name.toLowerCase();
      if (mentions.some((m) => name.includes(m) || m.includes(name.replace(/\s/g, "")))) {
        await supabase.from("message_mentions").insert({
          message_id: data.id,
          mentioned_user_id: profile.id,
        });
        if (profile.id !== user.id) {
          await supabase.from("notifications").insert({
            user_id: profile.id,
            type: "mention",
            title: `${currentUser?.displayName ?? "Someone"} mentioned you`,
            body: body.slice(0, 120),
            link: `/chat/${channelId}`,
          });
        }
      }
    }
  }

  // Notify thread parent author on reply
  if (parentMessageId) {
    const { data: parent } = await supabase
      .from("messages")
      .select("author_id")
      .eq("id", parentMessageId)
      .single();
    if (parent && parent.author_id !== user.id) {
      await supabase.from("notifications").insert({
        user_id: parent.author_id,
        type: "thread_reply",
        title: `${currentUser?.displayName ?? "Someone"} replied in a thread`,
        body: body.slice(0, 120),
        link: `/chat/${channelId}`,
      });
    }
  }

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
  const user = await getCurrentUser();
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  if (!workspace) {
    return {
      workspaces: [],
      recentMessages: [],
      todaysTasks: [],
      upcomingEvents: [],
      activeProjects: [],
      unreadMentions: 0,
      assignedTasksDueSoon: [],
      eventReminders: [],
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

  const events = await getEvents(workspace.id, user?.id);
  const upcomingEvents = events
    .filter((e) => e.date >= today)
    .slice(0, 4);

  const eventReminders = events.filter(
    (e) => e.date === today || e.date === tomorrow
  );

  const projects = await getProjects();
  const allTasks = projects.flatMap((p) =>
    p.tasks.map((t) => ({ ...t, projectName: p.name }))
  );
  const todaysTasks = allTasks.filter((t) => t.dueDate === today);
  const assignedTasksDueSoon = allTasks.filter(
    (t) =>
      t.assigneeId === user?.id &&
      t.status !== "done" &&
      t.dueDate &&
      t.dueDate <= tomorrow
  );

  let unreadMentions = 0;
  if (user) {
    const supabase = await createClient();
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false);
    unreadMentions = count ?? 0;
  }

  return {
    workspaces: [workspace],
    recentMessages: recentMessages.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    todaysTasks,
    upcomingEvents,
    activeProjects: projects.filter((p) => p.status === "active"),
    unreadMentions,
    assignedTasksDueSoon,
    eventReminders,
  };
}

export async function getProjects(): Promise<Project[]> {
  const supabase = await createClient();
  const workspace = await getSharedWorkspace();
  if (!workspace) return [];

  const { data: projectRows } = await supabase
    .from("projects")
    .select("id, workspace_id, name, description, status")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false });

  if (!projectRows?.length) return [];

  const projectIds = projectRows.map((p) => p.id);
  const { data: taskRows } = await supabase
    .from("tasks")
    .select("id, project_id, title, status, due_date, assignee_id, source_message_id, source_channel_id")
    .in("project_id", projectIds);

  const tasksByProject = new Map<string, Project["tasks"]>();
  for (const row of taskRows ?? []) {
    const list = tasksByProject.get(row.project_id) ?? [];
    list.push({
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      status: row.status,
      dueDate: row.due_date ?? undefined,
      assigneeId: row.assignee_id ?? undefined,
      sourceMessageId: row.source_message_id ?? undefined,
      sourceChannelId: row.source_channel_id ?? undefined,
    });
    tasksByProject.set(row.project_id, list);
  }

  return projectRows.map((p) => ({
    id: p.id,
    workspaceId: p.workspace_id,
    name: p.name,
    description: p.description,
    status: p.status,
    tasks: tasksByProject.get(p.id) ?? [],
  }));
}

export async function getEvents(
  workspaceId?: string,
  userId?: string
): Promise<PlannerEvent[]> {
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
  const eventIds = (data ?? []).map((e) => e.id);

  let rsvpMap = new Map<string, { myRsvp?: string; going: number; maybe: number }>();
  if (eventIds.length > 0) {
    const { data: rsvps } = await supabase
      .from("event_rsvps")
      .select("event_id, user_id, status")
      .in("event_id", eventIds);

    for (const id of eventIds) {
      const eventRsvps = (rsvps ?? []).filter((r) => r.event_id === id);
      rsvpMap.set(id, {
        myRsvp: userId
          ? eventRsvps.find((r) => r.user_id === userId)?.status
          : undefined,
        going: eventRsvps.filter((r) => r.status === "going").length,
        maybe: eventRsvps.filter((r) => r.status === "maybe").length,
      });
    }
  }

  return (data ?? []).map((row) => {
    const rsvp = rsvpMap.get(row.id);
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      title: row.title,
      date: row.date,
      time: row.time ?? undefined,
      location: row.location ?? undefined,
      myRsvp: rsvp?.myRsvp as PlannerEvent["myRsvp"],
      goingCount: rsvp?.going ?? 0,
      maybeCount: rsvp?.maybe ?? 0,
    };
  });
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
