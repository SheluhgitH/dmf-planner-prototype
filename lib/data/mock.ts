import type {
  Channel,
  Message,
  PlannerEvent,
  Project,
  User,
  Workspace,
  WorkspaceMember,
} from "./types";

export const mockCurrentUser: User = {
  id: "user-1",
  email: "you@dmfstudio.com",
  displayName: "You",
  avatarUrl: undefined,
};

export const mockUsers: User[] = [
  mockCurrentUser,
  {
    id: "user-2",
    email: "alex@dmfstudio.com",
    displayName: "Alex Rivera",
  },
  {
    id: "user-3",
    email: "jordan@dmfstudio.com",
    displayName: "Jordan Lee",
  },
  {
    id: "user-4",
    email: "sam@dmfstudio.com",
    displayName: "Sam Chen",
  },
];

export const mockWorkspace: Workspace = {
  id: "ws-1",
  name: "DMF Studio",
  slug: "dmf-studio",
};

export const mockWorkspaces: Workspace[] = [mockWorkspace];

export const mockMembers: WorkspaceMember[] = mockUsers.map((user, i) => ({
  userId: user.id,
  workspaceId: mockWorkspace.id,
  role: i === 0 ? "owner" : i === 1 ? "admin" : "member",
  user,
}));

export const mockChannels: Channel[] = [
  {
    id: "general",
    workspaceId: mockWorkspace.id,
    name: "general",
    type: "public",
    isDm: false,
  },
  {
    id: "ideas",
    workspaceId: mockWorkspace.id,
    name: "ideas",
    type: "public",
    isDm: false,
  },
  {
    id: "scripts",
    workspaceId: mockWorkspace.id,
    name: "scripts",
    type: "public",
    isDm: false,
  },
  {
    id: "events",
    workspaceId: mockWorkspace.id,
    name: "events",
    type: "public",
    isDm: false,
  },
];

const withAuthor = (msg: Omit<Message, "author">): Message => ({
  ...msg,
  author: mockUsers.find((u) => u.id === msg.authorId),
});

export const mockMessages: Record<string, Message[]> = {
  general: [
    withAuthor({
      id: "m1",
      channelId: "general",
      authorId: "user-2",
      body: "Morning team — sprint planning at 2pm today.",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    }),
    withAuthor({
      id: "m2",
      channelId: "general",
      authorId: "user-3",
      body: "Got it. I'll have the shot list ready before then.",
      createdAt: new Date(Date.now() - 2400000).toISOString(),
    }),
    withAuthor({
      id: "m3",
      channelId: "general",
      authorId: "user-4",
      body: "Uploaded the latest B-roll selects to the project folder.",
      createdAt: new Date(Date.now() - 900000).toISOString(),
    }),
  ],
  ideas: [
    withAuthor({
      id: "m4",
      channelId: "ideas",
      authorId: "user-2",
      body: "What if we do a behind-the-scenes series for the new campaign?",
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    }),
    withAuthor({
      id: "m5",
      channelId: "ideas",
      authorId: "user-1",
      body: "Love it — short-form, authentic, low production overhead.",
      createdAt: new Date(Date.now() - 5400000).toISOString(),
    }),
  ],
  scripts: [
    withAuthor({
      id: "m6",
      channelId: "scripts",
      authorId: "user-3",
      body: "Draft v2 of the product launch script is ready for review.",
      createdAt: new Date(Date.now() - 1800000).toISOString(),
    }),
  ],
  events: [
    withAuthor({
      id: "m7",
      channelId: "events",
      authorId: "user-4",
      body: "Client review moved to Thursday 3pm — calendar updated.",
      createdAt: new Date(Date.now() - 10800000).toISOString(),
    }),
  ],
};

export const mockProjects: Project[] = [
  {
    id: "proj-1",
    workspaceId: mockWorkspace.id,
    name: "Product Launch Campaign",
    description: "Q2 launch video series and social cutdowns",
    status: "active",
    tasks: [
      {
        id: "t1",
        projectId: "proj-1",
        title: "Finalize hero script",
        status: "in_progress",
        dueDate: new Date().toISOString().split("T")[0],
        assigneeId: "user-3",
      },
      {
        id: "t2",
        projectId: "proj-1",
        title: "Book studio for shoot",
        status: "todo",
        dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
        assigneeId: "user-2",
      },
      {
        id: "t3",
        projectId: "proj-1",
        title: "Edit rough cut",
        status: "todo",
        dueDate: new Date(Date.now() + 86400000 * 5).toISOString().split("T")[0],
        assigneeId: "user-4",
      },
      {
        id: "t4",
        projectId: "proj-1",
        title: "Color grade approval",
        status: "done",
        assigneeId: "user-1",
      },
    ],
  },
  {
    id: "proj-2",
    workspaceId: mockWorkspace.id,
    name: "Podcast Season 3",
    description: "8-episode season with guest outreach",
    status: "active",
    tasks: [
      {
        id: "t5",
        projectId: "proj-2",
        title: "Record episode 4",
        status: "in_progress",
        dueDate: new Date().toISOString().split("T")[0],
        assigneeId: "user-2",
      },
      {
        id: "t6",
        projectId: "proj-2",
        title: "Guest confirmation — ep 5",
        status: "todo",
        dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
      },
    ],
  },
  {
    id: "proj-3",
    workspaceId: mockWorkspace.id,
    name: "Brand Refresh",
    description: "Visual identity update and style guide",
    status: "paused",
    tasks: [
      {
        id: "t7",
        projectId: "proj-3",
        title: "Logo concepts round 2",
        status: "todo",
      },
    ],
  },
];

const today = new Date();
const ymd = (offset: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offset);
  return d.toISOString().split("T")[0];
};

export const mockEvents: PlannerEvent[] = [
  {
    id: "e1",
    workspaceId: mockWorkspace.id,
    title: "Sprint Planning",
    date: ymd(0),
    time: "14:00",
    location: "Studio A",
  },
  {
    id: "e2",
    workspaceId: mockWorkspace.id,
    title: "Client Review — Launch Campaign",
    date: ymd(2),
    time: "15:00",
    location: "Zoom",
  },
  {
    id: "e3",
    workspaceId: mockWorkspace.id,
    title: "Podcast Recording",
    date: ymd(4),
    time: "10:00",
    location: "Studio B",
  },
  {
    id: "e4",
    workspaceId: mockWorkspace.id,
    title: "Team Offsite",
    date: ymd(10),
    time: "09:00",
    location: "Downtown",
  },
];

export function getMockUserById(id: string): User | undefined {
  return mockUsers.find((u) => u.id === id);
}
