-- Events
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  date date not null,
  time text,
  location text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;

create policy "events_select" on public.events
  for select using (public.is_workspace_member(workspace_id));

create policy "events_insert" on public.events
  for insert with check (
    auth.uid() = created_by and public.is_workspace_member(workspace_id)
  );

create policy "events_update" on public.events
  for update using (
    auth.uid() = created_by and public.is_workspace_member(workspace_id)
  );

create policy "events_delete" on public.events
  for delete using (
    auth.uid() = created_by and public.is_workspace_member(workspace_id)
  );

-- Event RSVPs
create table if not exists public.event_rsvps (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'going' check (status in ('going', 'not_going', 'maybe')),
  responded_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

alter table public.event_rsvps enable row level security;

create policy "event_rsvps_select" on public.event_rsvps
  for select using (
    exists (
      select 1 from public.events e
      where e.id = event_id and public.is_workspace_member(e.workspace_id)
    )
  );

create policy "event_rsvps_insert" on public.event_rsvps
  for insert with check (
    auth.uid() = user_id and exists (
      select 1 from public.events e
      where e.id = event_id and public.is_workspace_member(e.workspace_id)
    )
  );

create policy "event_rsvps_update" on public.event_rsvps
  for update using (
    auth.uid() = user_id and exists (
      select 1 from public.events e
      where e.id = event_id and public.is_workspace_member(e.workspace_id)
    )
  );

create policy "event_rsvps_delete" on public.event_rsvps
  for delete using (
    auth.uid() = user_id and exists (
      select 1 from public.events e
      where e.id = event_id and public.is_workspace_member(e.workspace_id)
    )
  );