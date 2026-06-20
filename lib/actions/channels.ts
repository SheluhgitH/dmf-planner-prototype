"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/data/supabase/server";
import { SHARED_WORKSPACE_SLUG } from "@/lib/data/supabase/queries";
import { logActivityEvent } from "@/lib/actions/activity";
import type { Channel } from "@/lib/data/types";

function dmChannelId(userA: string, userB: string) {
  const [a, b] = [userA, userB].sort();
  return `dm-${a}-${b}`;
}

export async function getOrCreateDmChannelAction(
  otherUserId: string
): Promise<{ channel?: Channel; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  if (user.id === otherUserId) return { error: "Cannot DM yourself" };

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("slug", SHARED_WORKSPACE_SLUG)
    .maybeSingle();

  if (!workspace) return { error: "No workspace found" };

  const channelId = dmChannelId(user.id, otherUserId);

  const { data: existing } = await supabase
    .from("channels")
    .select("id, workspace_id, name, type, is_dm")
    .eq("id", channelId)
    .maybeSingle();

  if (existing) {
    return {
      channel: {
        id: existing.id,
        workspaceId: existing.workspace_id,
        name: existing.name,
        type: existing.type,
        isDm: existing.is_dm,
      },
    };
  }

  const { data: otherProfile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", otherUserId)
    .maybeSingle();

  const dmName = otherProfile?.display_name ?? "Direct Message";

  const { data: channel, error } = await supabase
    .from("channels")
    .insert({
      id: channelId,
      workspace_id: workspace.id,
      name: dmName,
      type: "dm",
      is_dm: true,
    })
    .select("id, workspace_id, name, type, is_dm")
    .single();

  if (error || !channel) return { error: error?.message ?? "Failed to create DM" };

  await supabase.from("channel_members").insert([
    { channel_id: channelId, user_id: user.id },
    { channel_id: channelId, user_id: otherUserId },
  ]);

  revalidatePath("/chat");
  return {
    channel: {
      id: channel.id,
      workspaceId: channel.workspace_id,
      name: channel.name,
      type: channel.type,
      isDm: channel.is_dm,
    },
  };
}

export async function createChannelAction(
  name: string,
  type: "public" | "private" = "public"
): Promise<{ channel?: Channel; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("slug", SHARED_WORKSPACE_SLUG)
    .maybeSingle();

  if (!workspace) return { error: "No workspace found" };

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const channelId = `${slug}-${Date.now().toString(36)}`;

  const { data: channel, error } = await supabase
    .from("channels")
    .insert({
      id: channelId,
      workspace_id: workspace.id,
      name: name.trim(),
      type,
      is_dm: false,
    })
    .select("id, workspace_id, name, type, is_dm")
    .single();

  if (error || !channel) return { error: error?.message ?? "Failed to create channel" };

  if (type === "private") {
    await supabase.from("channel_members").insert({
      channel_id: channelId,
      user_id: user.id,
    });
  }

  await logActivityEvent({
    type: "channel_created",
    title: `Created channel #${channel.name}`,
    link: `/chat/${channelId}`,
  });

  revalidatePath("/chat");
  return {
    channel: {
      id: channel.id,
      workspaceId: channel.workspace_id,
      name: channel.name,
      type: channel.type,
      isDm: channel.is_dm,
    },
  };
}
