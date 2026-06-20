-- DMF Planner foundation schema
-- Run in Supabase SQL editor or via CLI

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select" on public.profiles
  for select using (true);

create policy "profiles_insert" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update" on public.profiles
  for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Workspaces
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.workspaces enable row level security;

-- Workspace members
create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

alter table public.workspace_members enable row level security;

-- Helper: is workspace member
create or replace function public.is_workspace_member(ws_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id and user_id = auth.uid()
  );
$$;

create policy "workspaces_select" on public.workspaces
  for select using (public.is_workspace_member(id));

create policy "workspaces_insert" on public.workspaces
  for insert with check (auth.uid() = created_by);

create policy "workspaces_update" on public.workspaces
  for update using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = id and user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "workspace_members_select" on public.workspace_members
  for select using (public.is_workspace_member(workspace_id));

create policy "workspace_members_insert" on public.workspace_members
  for insert with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner', 'admin')
    )
  );

-- Channels
create table if not exists public.channels (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  type text not null default 'public' check (type in ('public', 'private', 'dm')),
  is_dm boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.channels enable row level security;

create table if not exists public.channel_members (
  channel_id text not null references public.channels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (channel_id, user_id)
);

alter table public.channel_members enable row level security;

create or replace function public.can_access_channel(ch_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.channels c
    where c.id = ch_id
      and public.is_workspace_member(c.workspace_id)
      and (
        c.type = 'public'
        or exists (
          select 1 from public.channel_members cm
          where cm.channel_id = ch_id and cm.user_id = auth.uid()
        )
      )
  );
$$;

create policy "channels_select" on public.channels
  for select using (public.can_access_channel(id));

create policy "channels_insert" on public.channels
  for insert with check (public.is_workspace_member(workspace_id));

create policy "channel_members_select" on public.channel_members
  for select using (public.can_access_channel(channel_id));

-- Messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_id text not null references public.channels(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  parent_message_id uuid references public.messages(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "messages_select" on public.messages
  for select using (public.can_access_channel(channel_id));

create policy "messages_insert" on public.messages
  for insert with check (
    auth.uid() = author_id and public.can_access_channel(channel_id)
  );

create policy "messages_update" on public.messages
  for update using (auth.uid() = author_id);

-- Message attachments
create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  file_size int,
  created_at timestamptz not null default now()
);

alter table public.message_attachments enable row level security;

create policy "attachments_select" on public.message_attachments
  for select using (
    exists (
      select 1 from public.messages m
      where m.id = message_id and public.can_access_channel(m.channel_id)
    )
  );

create policy "attachments_insert" on public.message_attachments
  for insert with check (
    exists (
      select 1 from public.messages m
      where m.id = message_id
        and m.author_id = auth.uid()
        and public.can_access_channel(m.channel_id)
    )
  );

-- Realtime for messages
alter publication supabase_realtime add table public.messages;

-- Seed default channels helper
create or replace function public.seed_default_channels(ws_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.channels (id, workspace_id, name, type, is_dm) values
    ('general', ws_id, 'general', 'public', false),
    ('ideas', ws_id, 'ideas', 'public', false),
    ('scripts', ws_id, 'scripts', 'public', false),
    ('events', ws_id, 'events', 'public', false)
  on conflict (id) do nothing;
end;
$$;

-- Onboarding: create workspace after signup
create or replace function public.create_workspace_for_user(
  ws_name text,
  ws_slug text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  insert into public.workspaces (name, slug, created_by)
  values (ws_name, ws_slug, auth.uid())
  returning id into new_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_id, auth.uid(), 'owner');

  perform public.seed_default_channels(new_id);
  return new_id;
end;
$$;

-- Storage bucket for chat attachments
insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', false)
on conflict (id) do nothing;

create policy "chat_attachments_select" on storage.objects
  for select using (
    bucket_id = 'chat-attachments' and auth.role() = 'authenticated'
  );

create policy "chat_attachments_insert" on storage.objects
  for insert with check (
    bucket_id = 'chat-attachments' and auth.role() = 'authenticated'
  );

create policy "chat_attachments_update" on storage.objects
  for update using (
    bucket_id = 'chat-attachments' and auth.role() = 'authenticated'
  );
