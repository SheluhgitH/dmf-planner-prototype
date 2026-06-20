"use server";

import { createClient } from "@/lib/data/supabase/server";
import { sendMessage } from "@/lib/data/supabase/queries";
import type { Message, MessageAttachment } from "@/lib/data/types";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function sendMessageAction(
  channelId: string,
  body: string,
  parentMessageId?: string
): Promise<{ message?: Message; error?: string }> {
  const { message, error } = await sendMessage(
    channelId,
    body.trim(),
    parentMessageId
  );
  if (error) return { error };
  if (!message) return { error: "Failed to send message" };

  return { message };
}

export async function uploadChatAttachmentAction(
  workspaceId: string,
  channelId: string,
  messageId: string,
  formData: FormData
): Promise<{ attachment?: MessageAttachment; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const file = formData.get("file") as File | null;
  if (!file) return { error: "No file provided" };
  if (file.size > MAX_FILE_SIZE) return { error: "File must be under 10 MB" };

  const storagePath = `${workspaceId}/${channelId}/${messageId}/${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("chat-attachments")
    .upload(storagePath, file, { upsert: false });

  if (uploadError) return { error: uploadError.message };

  const { data, error } = await supabase
    .from("message_attachments")
    .insert({
      message_id: messageId,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type || null,
      file_size: file.size,
    })
    .select("id, storage_path, file_name, mime_type, file_size")
    .single();

  if (error || !data) return { error: error?.message ?? "Failed to save attachment" };

  const { data: signed } = await supabase.storage
    .from("chat-attachments")
    .createSignedUrl(storagePath, 86400);

  return {
    attachment: {
      id: data.id,
      fileName: data.file_name,
      mimeType: data.mime_type ?? undefined,
      fileSize: data.file_size ?? undefined,
      storagePath: data.storage_path,
      url: signed?.signedUrl,
    },
  };
}

export async function addReactionAction(
  messageId: string,
  emoji: string,
  channelId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("message_reactions").insert({
    message_id: messageId,
    user_id: user.id,
    emoji,
  });

  if (error) return { error: error.message };
  return {};
}

export async function removeReactionAction(
  messageId: string,
  emoji: string,
  channelId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("message_reactions")
    .delete()
    .eq("message_id", messageId)
    .eq("user_id", user.id)
    .eq("emoji", emoji);

  if (error) return { error: error.message };
  return {};
}

export async function markChannelReadAction(
  channelId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("channel_reads").upsert(
    {
      channel_id: channelId,
      user_id: user.id,
      last_read_at: new Date().toISOString(),
    },
    { onConflict: "channel_id,user_id" }
  );

  if (error) return { error: error.message };
  return {};
}

export async function getChannelMessagesAction(
  channelId: string,
  limit = 100
): Promise<{ messages?: Message[]; error?: string }> {
  const { getMessages } = await import("@/lib/data/supabase/queries");
  try {
    const messages = await getMessages(channelId, { limit });
    return { messages };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load messages";
    return { error: message };
  }
}

export async function getOlderMessagesAction(
  channelId: string,
  beforeMessageId: string,
  limit = 50
): Promise<{ messages?: Message[]; error?: string }> {
  const { getMessages } = await import("@/lib/data/supabase/queries");
  try {
    const messages = await getMessages(channelId, { limit, beforeMessageId });
    return { messages };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load older messages";
    return { error: message };
  }
}

export async function getThreadRepliesAction(
  parentMessageId: string
): Promise<{ replies?: Message[]; error?: string }> {
  const { getThreadReplies } = await import("@/lib/data/supabase/queries");
  const replies = await getThreadReplies(parentMessageId);
  return { replies };
}

export async function editMessageAction(
  messageId: string,
  body: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("messages")
    .update({ body: body.trim() })
    .eq("id", messageId)
    .eq("author_id", user.id);

  if (error) return { error: error.message };
  return {};
}

export async function deleteMessageAction(
  messageId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("messages")
    .delete()
    .eq("id", messageId)
    .eq("author_id", user.id);

  if (error) return { error: error.message };
  return {};
}

export async function searchChannelMessagesAction(
  channelId: string,
  query: string
): Promise<{ messages?: Message[]; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .select("id, channel_id, author_id, body, parent_message_id, created_at")
    .eq("channel_id", channelId)
    .ilike("body", `%${query}%`)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return { error: error.message };

  const { getCurrentUser } = await import("@/lib/data/supabase/queries");
  const currentUser = await getCurrentUser();

  return {
    messages: (data ?? []).map((row) => ({
      id: row.id,
      channelId: row.channel_id,
      authorId: row.author_id,
      body: row.body,
      createdAt: row.created_at,
      parentMessageId: row.parent_message_id ?? undefined,
      author: currentUser ?? undefined,
    })),
  };
}
