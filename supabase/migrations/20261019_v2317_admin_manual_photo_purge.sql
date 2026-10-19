-- Švari Aplinka V2.3.17: administrator-only metadata finalization.
-- This migration ONLY creates a secure RPC. It does not DELETE any existing row.
-- Cloudflare Worker must confirm deletion of BOTH EU R2 blobs before calling it.
begin;

create or replace function public.sa_storage_finalize_photo_purge(p_org uuid,p_photo uuid)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
declare photo_deleted uuid;
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.sa_memberships m
    where m.organization_id=p_org and m.user_id=(select auth.uid())
      and m.active=true and m.role='admin'
  ) then
    raise exception 'admin membership required' using errcode='42501';
  end if;

  -- Only a previously tombstoned, exactly scoped photo is eligible.
  -- No cascade/bulk deletion, and no exposed table-wide DELETE grant.
  delete from public.sa_photo_metadata p
  where p.organization_id=p_org and p.id=p_photo
    and p.object_key = 'sa/' || p_org::text || '/' || p_photo::text
    and nullif(p.data->>'trashedAt','') is not null
    and nullif(p.data->>'purgingAt','') is not null
  returning p.id into photo_deleted;
  return photo_deleted is not null;
end;
$$;

revoke all on function public.sa_storage_finalize_photo_purge(uuid,uuid) from public, anon;
grant execute on function public.sa_storage_finalize_photo_purge(uuid,uuid) to authenticated;

commit;
