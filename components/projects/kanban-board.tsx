"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Project, Task } from "@/lib/data/types";
import { updateTaskStatusAction } from "@/lib/actions/projects";
import { InlineError } from "@/components/ui/inline-error";
import { cn } from "@/lib/utils";

const columns = [
  { id: "todo", label: "To Do", status: "todo" as const },
  { id: "in_progress", label: "In Progress", status: "in_progress" as const },
  { id: "done", label: "Done", status: "done" as const },
];

export function KanbanBoard({ project }: { project: Project }) {
  const router = useRouter();
  const [tasks, setTasks] = useState(project.tasks);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function moveTask(taskId: string, status: Task["status"]) {
    const previous = tasks;
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status } : t))
    );
    setError(null);
    const { error: err } = await updateTaskStatusAction(taskId, project.id, status);
    if (err) {
      setTasks(previous);
      setError(err);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-1 flex-col">
      {error && (
        <div className="px-6 pt-4">
          <InlineError message={error} />
        </div>
      )}
      <div className="flex flex-1 gap-4 overflow-x-auto p-6">
        {columns.map((col) => (
          <div
            key={col.id}
            className="flex w-72 shrink-0 flex-col rounded-xl border border-zinc-800 bg-zinc-900/30"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const taskId = e.dataTransfer.getData("taskId");
              if (taskId) void moveTask(taskId, col.status);
              setDraggingId(null);
            }}
          >
            <div className="border-b border-zinc-800 px-4 py-3">
              <h2 className="text-sm font-semibold text-zinc-300">{col.label}</h2>
              <span className="text-xs text-zinc-500">
                {tasks.filter((t) => t.status === col.status).length} tasks
              </span>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {tasks
                .filter((t) => t.status === col.status)
                .map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("taskId", task.id);
                      setDraggingId(task.id);
                    }}
                    onDragEnd={() => setDraggingId(null)}
                    className={cn(
                      "cursor-grab rounded-lg border border-zinc-800 bg-zinc-900 p-3 active:cursor-grabbing",
                      draggingId === task.id && "opacity-50"
                    )}
                  >
                    <p className="text-sm font-medium text-zinc-200">{task.title}</p>
                    {task.dueDate && (
                      <p className="mt-1 text-xs text-zinc-500">Due {task.dueDate}</p>
                    )}
                    {task.sourceChannelId && task.sourceMessageId && (
                      <Link
                        href={`/chat/${task.sourceChannelId}?messageId=${task.sourceMessageId}`}
                        className="mt-1 block text-xs text-violet-400 hover:text-violet-300"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View in chat
                      </Link>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
