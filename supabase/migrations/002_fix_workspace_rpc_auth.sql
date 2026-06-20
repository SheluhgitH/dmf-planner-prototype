create or replace function public.create_workspace_for_user(ws_name text, ws_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.workspaces (name, slug, created_by)
  values (ws_name, ws_slug, uid)
  returning id into new_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_id, uid, 'owner');

  perform public.seed_default_channels(new_id);
  return new_id;
end;
$$;

grant execute on function public.create_workspace_for_user(text, text) to authenticated;