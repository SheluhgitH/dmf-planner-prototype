export type WorkspaceRole = "owner" | "admin" | "member";

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
}

export interface WorkspaceMember {
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
  user: User;
}

export interface Channel {
  id: string;
  workspaceId: string;
  name: string;
  type: "public" | "private" | "dm";
  isDm: boolean;
}

export interface MessageAttachment {
  id: string;
  fileName: string;
  mimeType?: string;
  fileSize?: number;
  storagePath?: string;
  url?: string;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

export interface Message {
  id: string;
  channelId: string;
  authorId: string;
  body: string;
  createdAt: string;
  author?: User;
  parentMessageId?: string;
  replyCount?: number;
  attachments?: MessageAttachment[];
  reactions?: MessageReaction[];
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  dueDate?: string;
  assigneeId?: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  status: "active" | "paused" | "completed";
  tasks: Task[];
}

export interface PlannerEvent {
  id: string;
  workspaceId: string;
  title: string;
  date: string;
  time?: string;
  location?: string;
}

export interface DashboardData {
  workspaces: Workspace[];
  recentMessages: (Message & { channelName: string })[];
  todaysTasks: Task[];
  upcomingEvents: PlannerEvent[];
  activeProjects: Project[];
}
