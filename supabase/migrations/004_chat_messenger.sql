-- Message reactions
create table if not exists public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

alter table public.message_reactions enable row level security;

create policy "reactions_select" on public.message_reactions
  for select using (
    exists (
      select 1 from public.messages m
      where m.id = message_id and public.can_access_channel(m.channel_id)
    )
  );

create policy "reactions_insert" on public.message_reactions
  for insert with check (
    auth.uid() = user_id and exists (
      select 1 from public.messages m
      where m.id = message_id and public.can_access_channel(m.channel_id)
    )
  );

create policy "reactions_delete" on public.message_reactions
  for delete using (auth.uid() = user_id);

-- Channel read receipts
create table if not exists public.channel_reads (
  channel_id text not null references public.channels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (channel_id, user_id)
);

alter table public.channel_reads enable row level security;

create policy "channel_reads_select" on public.channel_reads
  for select using (
    auth.uid() = user_id and public.can_access_channel(channel_id)
  );

create policy "channel_reads_insert" on public.channel_reads
  for insert with check (
    auth.uid() = user_id and public.can_access_channel(channel_id)
  );

create policy "channel_reads_update" on public.channel_reads
  for update using (
    auth.uid() = user_id and public.can_access_channel(channel_id)
  );

-- Realtime for attachments and reactions
alter publication supabase_realtime add table public.message_attachments;
alter publication supabase_realtime add table public.message_reactions;

-- Storage path helper: {workspace_id}/{channel_id}/{message_id}/{file_name}
create or replace function public.can_access_chat_attachment_path(path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when split_part(path, '/', 1) = '' then false
    when split_part(path, '/', 2) = '' then false
    else public.can_access_channel(split_part(path, '/', 2))
  end;
$$;

-- Replace overly permissive storage policies
drop policy if exists "chat_attachments_select" on storage.objects;
drop policy if exists "chat_attachments_insert" on storage.objects;
drop policy if exists "chat_attachments_update" on storage.objects;

create policy "chat_attachments_select" on storage.objects
  for select using (
    bucket_id = 'chat-attachments'
    and public.can_access_chat_attachment_path(name)
  );

create policy "chat_attachments_insert" on storage.objects
  for insert with check (
    bucket_id = 'chat-attachments'
    and public.can_access_chat_attachment_path(name)
  );

create policy "chat_attachments_update" on storage.objects
  for update using (
    bucket_id = 'chat-attachments'
    and public.can_access_chat_attachment_path(name)
  );
