-- Projects & tasks
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  description text not null default '',
  status text not null default 'active' check (status in ('active', 'paused', 'completed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "projects_select" on public.projects
  for select using (public.is_workspace_member(workspace_id));

create policy "projects_insert" on public.projects
  for insert with check (
    public.is_workspace_member(workspace_id) and auth.uid() = created_by
  );

create policy "projects_update" on public.projects
  for update using (public.is_workspace_member(workspace_id));

create policy "projects_delete" on public.projects
  for delete using (public.is_workspace_member(workspace_id));

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  due_date date,
  assignee_id uuid references auth.users(id) on delete set null,
  source_message_id uuid references public.messages(id) on delete set null,
  source_channel_id text references public.channels(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

create policy "tasks_select" on public.tasks
  for select using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and public.is_workspace_member(p.workspace_id)
    )
  );

create policy "tasks_insert" on public.tasks
  for insert with check (
    auth.uid() = created_by and exists (
      select 1 from public.projects p
      where p.id = project_id and public.is_workspace_member(p.workspace_id)
    )
  );

create policy "tasks_update" on public.tasks
  for update using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and public.is_workspace_member(p.workspace_id)
    )
  );

create policy "tasks_delete" on public.tasks
  for delete using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and public.is_workspace_member(p.workspace_id)
    )
  );

-- Mentions & notifications
create table if not exists public.message_mentions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  mentioned_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (message_id, mentioned_user_id)
);

alter table public.message_mentions enable row level security;

create policy "message_mentions_select" on public.message_mentions
  for select using (
    mentioned_user_id = auth.uid()
    or exists (
      select 1 from public.messages m
      join public.channels c on c.id = m.channel_id
      where m.id = message_id and public.is_workspace_member(c.workspace_id)
    )
  );

create policy "message_mentions_insert" on public.message_mentions
  for insert with check (
    exists (
      select 1 from public.messages m
      join public.channels c on c.id = m.channel_id
      where m.id = message_id and public.is_workspace_member(c.workspace_id)
    )
  );

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('mention', 'thread_reply', 'task_assigned', 'event_reminder')),
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "notifications_select" on public.notifications
  for select using (auth.uid() = user_id);

create policy "notifications_insert" on public.notifications
  for insert with check (true);

create policy "notifications_update" on public.notifications
  for update using (auth.uid() = user_id);

-- Full-text search on messages
create index if not exists messages_body_search_idx on public.messages
  using gin (to_tsvector('english', body));
