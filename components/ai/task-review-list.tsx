"use client";

import type { AiMember, ExtractedTask } from "@/lib/ai/types";

export function TaskReviewList({
  tasks,
  members,
  onChange,
}: {
  tasks: ExtractedTask[];
  members: AiMember[];
  onChange: (tasks: ExtractedTask[]) => void;
}) {
  function updateTask(index: number, patch: Partial<ExtractedTask>) {
    onChange(tasks.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }

  const selectedCount = tasks.filter((t) => t.selected !== false).length;

  return (
    <div className="space-y-2 rounded-lg border border-zinc-800 p-3">
      <p className="text-sm text-zinc-300">
        Review extracted tasks ({selectedCount} selected):
      </p>
      <ul className="space-y-3">
        {tasks.map((task, index) => (
          <li
            key={`${task.title}-${index}`}
            className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 space-y-2"
          >
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={task.selected !== false}
                onChange={(e) =>
                  updateTask(index, { selected: e.target.checked })
                }
              />
              Include
            </label>
            <input
              value={task.title}
              onChange={(e) => updateTask(index, { title: e.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                type="date"
                value={task.dueDate ?? ""}
                onChange={(e) =>
                  updateTask(index, { dueDate: e.target.value || undefined })
                }
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              />
              {members.length > 0 && (
                <select
                  value={task.assigneeId ?? ""}
                  onChange={(e) => {
                    const member = members.find((m) => m.id === e.target.value);
                    updateTask(index, {
                      assigneeId: e.target.value || undefined,
                      assignee: member?.displayName,
                    });
                  }}
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.displayName}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function getSelectedTasks(tasks: ExtractedTask[]): ExtractedTask[] {
  return tasks.filter((t) => t.selected !== false && t.title.trim());
}
