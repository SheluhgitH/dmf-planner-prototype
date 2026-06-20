import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getProjects } from "@/lib/data/provider";
import { CreateProjectButton } from "@/components/projects/create-project-button";

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Projects</h1>
          <p className="text-zinc-400">Manage tasks, scripts, and deadlines.</p>
        </div>
        <CreateProjectButton />
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 px-6 py-16 text-center">
          <h2 className="text-lg font-semibold text-zinc-200">No projects yet</h2>
          <p className="mt-2 max-w-sm text-sm text-zinc-500">
            Create your first project to track scripts, shoots, and deadlines on a Kanban board.
          </p>
          <div className="mt-6">
            <CreateProjectButton />
          </div>
        </div>
      ) : (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => {
          const done = project.tasks.filter((t) => t.status === "done").length;
          return (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="h-full transition-colors hover:border-violet-500/50">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <Badge
                      variant={
                        project.status === "active" ? "success" : "secondary"
                      }
                    >
                      {project.status}
                    </Badge>
                  </div>
                  <CardDescription>{project.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-zinc-400">
                    {done}/{project.tasks.length} tasks complete
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
      )}
    </div>
  );
}
