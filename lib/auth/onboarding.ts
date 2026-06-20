"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/data/supabase/server";

export async function joinSharedWorkspace() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Please sign in before joining the workspace." };
  }

  const { data, error } = await supabase.rpc("join_shared_workspace");

  if (error) return { error: error.message };
  if (!data) return { error: "Failed to join workspace" };

  redirect("/dashboard");
}
