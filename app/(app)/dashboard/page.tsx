import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDashboardData } from "@/lib/data/provider";
import { formatRelativeTime } from "@/lib/utils";
import { Calendar, CheckSquare, FolderKanban, MessageSquare } from "lucide-react";

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>
        <p className="text-zinc-400">Welcome back — here&apos;s what&apos;s happening today.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-violet-400" />
              Today&apos;s Tasks
            </CardTitle>
            <CardDescription>Due today across all projects</CardDescription>
          </CardHeader>
          <CardContent>
            {data.todaysTasks.length === 0 ? (
              <p className="text-sm text-zinc-500">No tasks due today.</p>
            ) : (
              <ul className="space-y-2">
                {data.todaysTasks.map((task) => (
                  <li
                    key={task.id}
                    className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-3 py-2 text-sm"
                  >
                    <span className="text-zinc-200">{task.title}</span>
                    <Badge variant="warning">{task.status.replace("_", " ")}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-violet-400" />
              Upcoming Events
            </CardTitle>
            <CardDescription>Next on the calendar</CardDescription>
          </CardHeader>
          <CardContent>
            {data.upcomingEvents.length === 0 ? (
              <p className="text-sm text-zinc-500">No upcoming events.</p>
            ) : (
              <ul className="space-y-2">
                {data.upcomingEvents.map((event) => (
                  <li
                    key={event.id}
                    className="rounded-lg bg-zinc-800/50 px-3 py-2 text-sm"
                  >
                    <p className="font-medium text-zinc-200">{event.title}</p>
                    <p className="text-xs text-zinc-500">
                      {event.date}
                      {event.time ? ` at ${event.time}` : ""}
                      {event.location ? ` · ${event.location}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-violet-400" />
              Recent Messages
            </CardTitle>
            <CardDescription>Latest across channels</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {data.recentMessages.slice(0, 5).map((msg) => (
                <li key={msg.id}>
                  <Link
                    href={`/chat/${msg.channelId}`}
                    className="block rounded-lg bg-zinc-800/50 px-3 py-2 transition-colors hover:bg-zinc-800"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-violet-300">
                        #{msg.channelName}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {formatRelativeTime(msg.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-zinc-300">{msg.body}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-violet-400" />
              Active Projects
            </CardTitle>
            <CardDescription>Currently in progress</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.activeProjects.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/projects/${project.id}`}
                    className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-3 py-2 transition-colors hover:bg-zinc-800"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-200">
                        {project.name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {project.tasks.length} tasks
                      </p>
                    </div>
                    <Badge variant="success">active</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
