"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/data/supabase/server";

export async function createEventAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "User not authenticated" };
  }

  const workspace = await supabase
    .from("workspaces")
    .select("id")
    .eq("slug", "dmf-studio")
    .maybeSingle();
  if (!workspace.data) {
    await supabase.rpc("join_shared_workspace");
    const retry = await supabase
      .from("workspaces")
      .select("id")
      .eq("slug", "dmf-studio")
      .maybeSingle();
    if (!retry.data) {
      return { error: "No workspace found" };
    }
    workspace.data = retry.data;
  }

  const title = formData.get("title") as string;
  const date = formData.get("date") as string;
  const time = formData.get("time") as string;
  const location = formData.get("location") as string;

  const { error } = await supabase.from("events").insert({
    workspace_id: workspace.data.id,
    title,
    date,
    time: time || null,
    location: location || null,
    created_by: user.id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/events");
  redirect("/events");
}

export async function deleteEventAction(eventId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "User not authenticated" };
  }

  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", eventId)
    .eq("created_by", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/events");
}
