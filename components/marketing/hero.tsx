import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  FolderKanban,
  MessageSquare,
  Sparkles,
  Upload,
  Users,
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Team Workspaces",
    description: "Shared hubs for every project with roles and permissions.",
  },
  {
    icon: MessageSquare,
    title: "Real-Time Chat",
    description: "Channels and DMs with file attachments for your crew.",
  },
  {
    icon: FolderKanban,
    title: "Project Boards",
    description: "Kanban tasks, deadlines, and script folders in one place.",
  },
  {
    icon: Calendar,
    title: "Event Planning",
    description: "Calendars, RSVPs, and reminders so nothing slips.",
  },
  {
    icon: Upload,
    title: "File Sharing",
    description: "Upload scripts, PDFs, and videos for the whole team.",
  },
  {
    icon: Sparkles,
    title: "AI Tools",
    description: "Script rewrites, idea generation, and meeting summaries.",
  },
];

export function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24 text-center">
      <div className="mb-6 inline-flex items-center rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-300">
        Built for creative teams
      </div>
      <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-zinc-50 sm:text-6xl">
        DMF Planner — your team&apos;s central brain
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400">
        Plan projects, share scripts, message in real time, and level up together.
        One hub for everything your team needs to ship great work.
      </p>
      <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Link href="/dashboard">
          <Button size="lg">Open App</Button>
        </Link>
        <Link href="/login">
          <Button variant="outline" size="lg">
            Sign In
          </Button>
        </Link>
      </div>
    </section>
  );
}

export function FeatureGrid() {
  return (
    <section className="border-t border-zinc-800 bg-zinc-950/50 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="mb-12 text-center text-2xl font-semibold text-zinc-100">
          Everything your team needs
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
            >
              <feature.icon className="mb-4 h-8 w-8 text-violet-400" />
              <h3 className="mb-2 font-semibold text-zinc-100">{feature.title}</h3>
              <p className="text-sm text-zinc-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-zinc-800 py-8">
      <div className="mx-auto max-w-6xl px-6 text-center text-sm text-zinc-500">
        DMF Planner — DMF Studio
      </div>
    </footer>
  );
}
