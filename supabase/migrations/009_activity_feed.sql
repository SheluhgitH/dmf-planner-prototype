-- Workspace activity timeline
create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  type text not null check (type in (
    'task_created', 'task_from_message', 'event_rsvp', 'event_shared',
    'mention', 'project_created', 'channel_created'
  )),
  title text not null,
  body text,
  link text,
  created_at timestamptz not null default now()
);

alter table public.activity_events enable row level security;

create policy "activity_events_select" on public.activity_events
  for select using (public.is_workspace_member(workspace_id));

create policy "activity_events_insert" on public.activity_events
  for insert with check (public.is_workspace_member(workspace_id));

create index if not exists activity_events_workspace_created_idx
  on public.activity_events (workspace_id, created_at desc);
