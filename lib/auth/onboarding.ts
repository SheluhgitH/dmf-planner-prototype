"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/data/supabase/server";

export async function createWorkspace(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Workspace name is required" };

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Please sign in and confirm your email before creating a workspace." };
  }

  const { data, error } = await supabase.rpc("create_workspace_for_user", {
    ws_name: name,
    ws_slug: slug || "workspace",
  });

  if (error) return { error: error.message };
  if (!data) return { error: "Failed to create workspace" };

  redirect("/dashboard");
}
