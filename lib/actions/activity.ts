"use server";

import { createClient } from "@/lib/data/supabase/server";
import { SHARED_WORKSPACE_SLUG } from "@/lib/data/supabase/queries";

export async function logActivityEvent(input: {
  type: string;
  title: string;
  body?: string;
  link?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("slug", SHARED_WORKSPACE_SLUG)
    .maybeSingle();

  if (!workspace) return;

  await supabase.from("activity_events").insert({
    workspace_id: workspace.id,
    actor_id: user.id,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    link: input.link ?? null,
  });
}

export async function getActivityFeedAction(limit = 20) {
  const supabase = await createClient();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("slug", SHARED_WORKSPACE_SLUG)
    .maybeSingle();

  if (!workspace) return { events: [] };

  const { data } = await supabase
    .from("activity_events")
    .select("id, type, title, body, link, created_at, actor_id")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  return {
    events: (data ?? []).map((e) => ({
      id: e.id,
      type: e.type,
      title: e.title,
      body: e.body ?? undefined,
      link: e.link ?? undefined,
      createdAt: e.created_at,
    })),
  };
}
