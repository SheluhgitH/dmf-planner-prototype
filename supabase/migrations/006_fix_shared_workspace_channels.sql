-- Fix shared workspace: align dmf-studio with the workspace that owns #general

create or replace function public.ensure_shared_workspace()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  ws_id uuid;
  channel_ws uuid;
  orphan_ws uuid;
begin
  select workspace_id into channel_ws
  from public.channels
  where id = 'general'
  limit 1;

  if channel_ws is not null then
    select id into orphan_ws
    from public.workspaces
    where slug = 'dmf-studio' and id <> channel_ws
    limit 1;

    if orphan_ws is not null then
      insert into public.workspace_members (workspace_id, user_id, role)
      select channel_ws, user_id, role
      from public.workspace_members
      where workspace_id = orphan_ws
      on conflict (workspace_id, user_id) do nothing;

      update public.workspaces
      set slug = slug || '-legacy-' || left(id::text, 8)
      where id = orphan_ws;
    end if;

    update public.workspaces
    set slug = 'dmf-studio', name = 'DMF Studio'
    where id = channel_ws;

    return channel_ws;
  end if;

  select id into ws_id from public.workspaces where slug = 'dmf-studio' limit 1;

  if ws_id is not null then
    return ws_id;
  end if;

  insert into public.workspaces (name, slug, created_by)
  values ('DMF Studio', 'dmf-studio', auth.uid())
  returning id into ws_id;

  perform public.seed_default_channels(ws_id);
  return ws_id;
end;
$$;

grant execute on function public.ensure_shared_workspace() to authenticated;
