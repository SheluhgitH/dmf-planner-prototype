export type MessageIntent = "task" | "event" | "script";

export type ChannelType = "scripts" | "ideas" | "events" | "general" | "project";

export type SummaryFocus = "all" | "decisions" | "actions";

export type RewriteMode = "polish" | "tighten" | "grammar" | "stage_directions";

export type ExtractedTask = {
  title: string;
  assignee?: string;
  dueDate?: string;
  assigneeId?: string;
  selected?: boolean;
};

export type ExtractedBeat = {
  scene: string;
  characters?: string;
  notes?: string;
  suggestedTask?: string;
  priority?: string;
};

export type InitProgress = {
  text: string;
  progress: number;
};

export type PolishMode =
  | "shorten"
  | "clarify"
  | "professional"
  | "grammar"
  | "emoji";

export type AiContext = {
  transcript: string;
  channelName: string;
  channelType: ChannelType;
  memberNames: string[];
  linkedProject?: {
    id: string;
    name: string;
    tasks: { title: string; status: string }[];
  };
  upcomingEvents?: { title: string; date: string }[];
  messageCount: number;
  dateRange?: { from: string; to: string };
};

export type AiMember = {
  id: string;
  displayName: string;
};
