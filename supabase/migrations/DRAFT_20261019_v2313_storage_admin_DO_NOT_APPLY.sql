-- Švari Aplinka V2.3.13 — REVIEW ONLY; DO NOT APPLY BEFORE SEPARATE DEPLOY APPROVAL
-- No photo files or existing rows are removed by this migration.
-- Run via Supabase reviewed migration after deploying and testing the matching Worker.
begin;

create or replace function public.sa_storage_usage(p_org uuid)
returns table(database_bytes bigint, document_bytes bigint, document_files bigint)
language plpgsql security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.sa_memberships m
    where m.organization_id = p_org
      and m.user_id = (select auth.uid())
      and m.active = true and m.role = 'admin'
  ) then
    raise exception 'admin membership required' using errcode='42501';
  end if;
  -- Project totals, not tenant totals. Database size includes PG system tables.
  return query
    select pg_catalog.pg_database_size(pg_catalog.current_database())::bigint,
      coalesce(sum(case
        when o.metadata->>'size' ~ '^[0-9]{1,18}$'
          then (o.metadata->>'size')::bigint
        else 0 end),0)::bigint,
      count(o.id)::bigint
    from storage.objects o
    where coalesce(o.is_delete_marker,false) = false;
end;
$$;
revoke all on function public.sa_storage_usage(uuid) from public, anon;
grant execute on function public.sa_storage_usage(uuid) to authenticated;

-- Avoid granting blanket DELETE on sa_photo_metadata. A secure RPC allows
-- deletion of ONE tombstoned row only after Worker has deleted the R2 bytes.
create or replace function public.sa_storage_finalize_photo_purge(p_org uuid,p_photo uuid)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
declare photo_deleted uuid;
begin
  if not exists (
    select 1 from public.sa_memberships m
    where m.organization_id=p_org
      and m.user_id=(select auth.uid())
      and m.active=true and m.role='admin'
  ) then
    raise exception 'admin membership required' using errcode='42501';
  end if;
  delete from public.sa_photo_metadata p
  where p.organization_id=p_org and p.id=p_photo
    and coalesce(p.data->>'trashedAt','') <> ''
    and coalesce(p.data->>'purgingAt','') <> ''
  returning p.id into photo_deleted;
  return photo_deleted is not null;
end;
$$;
revoke all on function public.sa_storage_finalize_photo_purge(uuid,uuid) from public, anon;
grant execute on function public.sa_storage_finalize_photo_purge(uuid,uuid) to authenticated;

commit;
