import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getProject } from "@/lib/data/provider";
import { ArrowLeft } from "lucide-react";

const columns = [
  { id: "todo", label: "To Do", status: "todo" as const },
  { id: "in_progress", label: "In Progress", status: "in_progress" as const },
  { id: "done", label: "Done", status: "done" as const },
];

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await getProject(projectId);
  if (!project) notFound();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b border-zinc-800 px-6 py-4">
        <Link href="/projects">
          <Button variant="ghost" size="sm" className="mb-2 -ml-2">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Projects
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-zinc-100">{project.name}</h1>
          <Badge variant={project.status === "active" ? "success" : "secondary"}>
            {project.status}
          </Badge>
        </div>
        <p className="mt-1 text-zinc-400">{project.description}</p>
      </div>

      <div className="flex flex-1 gap-4 overflow-x-auto p-6">
        {columns.map((col) => (
          <div
            key={col.id}
            className="flex w-72 shrink-0 flex-col rounded-xl border border-zinc-800 bg-zinc-900/30"
          >
            <div className="border-b border-zinc-800 px-4 py-3">
              <h2 className="text-sm font-semibold text-zinc-300">{col.label}</h2>
              <span className="text-xs text-zinc-500">
                {project.tasks.filter((t) => t.status === col.status).length}{" "}
                tasks
              </span>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {project.tasks
                .filter((t) => t.status === col.status)
                .map((task) => (
                  <div
                    key={task.id}
                    className="rounded-lg border border-zinc-800 bg-zinc-900 p-3"
                  >
                    <p className="text-sm font-medium text-zinc-200">
                      {task.title}
                    </p>
                    {task.dueDate && (
                      <p className="mt-1 text-xs text-zinc-500">
                        Due {task.dueDate}
                      </p>
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
