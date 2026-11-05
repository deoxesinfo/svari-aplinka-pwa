-- ŠA V2.3.31: invite activation cannot unlock company data until a password is set.
-- Existing invited/active accounts keep their access. Only new invitations are activation_required.
alter table public.sa_account_directory
 add column if not exists activation_required boolean not null default false,
 add column if not exists activation_completed_at timestamptz;

create or replace function private.sa_activation_ok(p_org uuid,p_user uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select not exists (
   select 1 from public.sa_account_directory d
   where d.organization_id=p_org and d.user_id=p_user
     and d.activation_required and d.activation_completed_at is null
 );
$$;
revoke all on function private.sa_activation_ok(uuid,uuid) from public,anon;
grant execute on function private.sa_activation_ok(uuid,uuid) to authenticated;

create or replace function private.sa_my_role(p_org uuid)
returns text language sql stable security definer set search_path=''
as $$
 select m.role from public.sa_memberships m
 where m.organization_id=p_org and m.user_id=(select auth.uid()) and m.active
   and (m.role='admin' or private.sa_activation_ok(m.organization_id,m.user_id))
 limit 1;
$$;

create or replace function private.sa_has_permission(p_org uuid,p_module text,p_level text default 'view')
returns boolean language sql stable security definer set search_path=''
as $$
 select coalesce((
  select m.role='admin' or (m.role in ('manager','worker') and exists(
    select 1 from public.sa_user_permissions p
    where p.organization_id=m.organization_id and p.user_id=m.user_id
      and p.module=p_module
      and (p.access='edit' or (p_level='view' and p.access='view'))
  ))
  from public.sa_memberships m
  where m.organization_id=p_org and m.user_id=(select auth.uid()) and m.active
    and (m.role='admin' or private.sa_activation_ok(m.organization_id,m.user_id))
  limit 1
 ),false);
$$;

-- Invited users may read their own activation flag before they receive data rights.
drop policy if exists sa_account_directory_admin_or_self_read on public.sa_account_directory;
create policy sa_account_directory_admin_or_self_read on public.sa_account_directory
 for select to authenticated
 using (user_id=(select auth.uid()) or private.sa_my_role(organization_id)='admin');

-- This narrow, authenticated RPC marks a user's invitation complete ONLY if
-- Supabase Auth confirms the account has actually received a password.
create or replace function public.sa_finish_invite_activation()
returns boolean language plpgsql security definer set search_path=''
as $$
declare
 v_uid uuid := (select auth.uid());
begin
 if v_uid is null then return false; end if;
 if not exists (
   select 1 from auth.users u
   where u.id=v_uid and u.email_confirmed_at is not null
     and u.encrypted_password is not null and length(u.encrypted_password)>0
 ) then return false; end if;
 update public.sa_account_directory d
 set activation_completed_at=now()
 where d.user_id=v_uid and d.activation_required and d.activation_completed_at is null
   and exists(select 1 from public.sa_memberships m where m.user_id=v_uid
     and m.organization_id=d.organization_id and m.active and m.role<>'admin');
 return exists(select 1 from public.sa_account_directory d
  where d.user_id=v_uid and d.activation_required and d.activation_completed_at is not null);
end;
$$;
revoke all on function public.sa_finish_invite_activation() from public,anon;
grant execute on function public.sa_finish_invite_activation() to authenticated;
