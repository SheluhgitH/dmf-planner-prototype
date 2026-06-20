"use server";

import { getProjects } from "@/lib/data/provider";

export async function getProjectsForAiAction(): Promise<{
  projects?: { id: string; name: string }[];
  error?: string;
}> {
  try {
    const projects = await getProjects();
    return {
      projects: projects.map((p) => ({ id: p.id, name: p.name })),
    };
  } catch {
    return { projects: [] };
  }
}
