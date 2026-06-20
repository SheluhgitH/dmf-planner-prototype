-- Shared workspace: single "DMF Studio" hub for all users

create or replace function public.ensure_shared_workspace()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  ws_id uuid;
begin
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

create or replace function public.join_shared_workspace()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  ws_id uuid;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  ws_id := public.ensure_shared_workspace();

  insert into public.workspace_members (workspace_id, user_id, role)
  values (ws_id, uid, 'member')
  on conflict (workspace_id, user_id) do nothing;

  return ws_id;
end;
$$;

grant execute on function public.ensure_shared_workspace() to authenticated;
grant execute on function public.join_shared_workspace() to authenticated;
