export type MessageIntent = "task" | "event" | "script";

export type ExtractedTask = {
  title: string;
  assignee?: string;
  dueDate?: string;
};

export type ExtractedBeat = {
  scene: string;
  notes?: string;
  suggestedTask?: string;
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
