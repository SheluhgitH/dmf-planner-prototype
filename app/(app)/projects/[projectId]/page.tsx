import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "@/components/projects/kanban-board";
import { AddTaskButton } from "@/components/projects/add-task-button";
import { getProject } from "@/lib/data/provider";
import { ArrowLeft } from "lucide-react";

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
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-100">{project.name}</h1>
            <Badge variant={project.status === "active" ? "success" : "secondary"}>
              {project.status}
            </Badge>
          </div>
          <AddTaskButton projectId={project.id} />
        </div>
        <p className="mt-1 text-zinc-400">{project.description}</p>
      </div>

      <KanbanBoard project={project} />
    </div>
  );
}
