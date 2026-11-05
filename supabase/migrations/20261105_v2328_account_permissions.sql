-- ŠA V2.3.28: additive per-user permissions and private account directory.
-- No existing users, jobs, addresses, photos, or memberships are modified.
create table if not exists public.sa_user_permissions (
  organization_id uuid not null,
  user_id uuid not null,
  module text not null check (module in (
    'overview','calendar','jobs','addresses','people','messages','analytics',
    'photos','storage','inspections','changes','history','account','settings'
  )),
  access text not null default 'none' check (access in ('none','view','edit')),
  updated_at timestamptz not null default now(),
  primary key (organization_id,user_id,module),
  foreign key (organization_id,user_id)
    references public.sa_memberships(organization_id,user_id) on delete cascade
);
alter table public.sa_user_permissions enable row level security;
revoke all on table public.sa_user_permissions from anon;
grant select,insert,update,delete on table public.sa_user_permissions to authenticated;

create table if not exists public.sa_account_directory (
  organization_id uuid not null,
  user_id uuid not null,
  email text not null check (length(email) between 3 and 254),
  display_name text not null default '' check (length(display_name) <= 120),
  invited_at timestamptz not null default now(),
  invited_by uuid,
  primary key (organization_id,user_id),
  foreign key (organization_id,user_id)
    references public.sa_memberships(organization_id,user_id) on delete cascade
);
create unique index if not exists sa_account_directory_email_org_unique
  on public.sa_account_directory(organization_id,lower(email));
alter table public.sa_account_directory enable row level security;
revoke all on table public.sa_account_directory from anon,authenticated;
grant select on table public.sa_account_directory to authenticated;

create or replace function private.sa_has_permission(
  p_org uuid, p_module text, p_level text default 'view'
) returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select m.role='admin'
      or (m.role in ('manager','worker') and exists (
        select 1 from public.sa_user_permissions p
        where p.organization_id=m.organization_id
          and p.user_id=m.user_id
          and p.module=p_module
          and (p.access='edit' or (p_level='view' and p.access='view'))
      ))
      from public.sa_memberships m
      where m.organization_id=p_org and m.user_id=(select auth.uid()) and m.active
      limit 1), false
  );
$$;
revoke all on function private.sa_has_permission(uuid,text,text) from public,anon;
grant execute on function private.sa_has_permission(uuid,text,text) to authenticated;

drop policy if exists sa_user_permissions_self_or_admin_read on public.sa_user_permissions;
create policy sa_user_permissions_self_or_admin_read on public.sa_user_permissions
  for select to authenticated using (
    (user_id=(select auth.uid()) and private.sa_my_role(organization_id) is not null)
    or private.sa_my_role(organization_id)='admin'
  );
drop policy if exists sa_user_permissions_admin_insert on public.sa_user_permissions;
create policy sa_user_permissions_admin_insert on public.sa_user_permissions
  for insert to authenticated with check (
    private.sa_my_role(organization_id)='admin'
    and exists (select 1 from public.sa_memberships m
      where m.organization_id=sa_user_permissions.organization_id
        and m.user_id=sa_user_permissions.user_id and m.active)
  );
drop policy if exists sa_user_permissions_admin_update on public.sa_user_permissions;
create policy sa_user_permissions_admin_update on public.sa_user_permissions
  for update to authenticated
  using (private.sa_my_role(organization_id)='admin')
  with check (private.sa_my_role(organization_id)='admin');
drop policy if exists sa_user_permissions_admin_delete on public.sa_user_permissions;
create policy sa_user_permissions_admin_delete on public.sa_user_permissions
  for delete to authenticated using (private.sa_my_role(organization_id)='admin');

drop policy if exists sa_account_directory_admin_or_self_read on public.sa_account_directory;
create policy sa_account_directory_admin_or_self_read on public.sa_account_directory
  for select to authenticated using (
    (user_id=(select auth.uid()) and private.sa_my_role(organization_id) is not null)
    or private.sa_my_role(organization_id)='admin'
  );

-- Explicit manager module permissions; destructive DELETE remains admin-only.
drop policy if exists sa_acl_manager_address_select on public.sa_addresses;
create policy sa_acl_manager_address_select on public.sa_addresses
 for select to authenticated using (
  private.sa_my_role(organization_id)='manager'
  and private.sa_has_permission(organization_id,'addresses','view'));
drop policy if exists sa_acl_manager_address_insert on public.sa_addresses;
create policy sa_acl_manager_address_insert on public.sa_addresses
 for insert to authenticated with check (
  private.sa_my_role(organization_id)='manager'
  and private.sa_has_permission(organization_id,'addresses','edit'));
drop policy if exists sa_acl_manager_address_update on public.sa_addresses;
create policy sa_acl_manager_address_update on public.sa_addresses
 for update to authenticated
 using (private.sa_my_role(organization_id)='manager' and private.sa_has_permission(organization_id,'addresses','edit'))
 with check (private.sa_my_role(organization_id)='manager' and private.sa_has_permission(organization_id,'addresses','edit'));

drop policy if exists sa_acl_manager_jobs_select on public.sa_jobs;
create policy sa_acl_manager_jobs_select on public.sa_jobs
 for select to authenticated using (
  private.sa_my_role(organization_id)='manager'
  and private.sa_has_permission(organization_id,'jobs','view'));
drop policy if exists sa_acl_manager_jobs_insert on public.sa_jobs;
create policy sa_acl_manager_jobs_insert on public.sa_jobs
 for insert to authenticated with check (
  private.sa_my_role(organization_id)='manager'
  and private.sa_has_permission(organization_id,'jobs','edit'));
drop policy if exists sa_acl_manager_jobs_update on public.sa_jobs;
create policy sa_acl_manager_jobs_update on public.sa_jobs
 for update to authenticated
 using (private.sa_my_role(organization_id)='manager' and private.sa_has_permission(organization_id,'jobs','edit'))
 with check (private.sa_my_role(organization_id)='manager' and private.sa_has_permission(organization_id,'jobs','edit'));

drop policy if exists sa_acl_manager_people_select on public.sa_people;
create policy sa_acl_manager_people_select on public.sa_people
 for select to authenticated using (
  private.sa_my_role(organization_id)='manager'
  and private.sa_has_permission(organization_id,'people','view'));
drop policy if exists sa_acl_manager_people_update on public.sa_people;
create policy sa_acl_manager_people_update on public.sa_people
 for update to authenticated
 using (private.sa_my_role(organization_id)='manager' and private.sa_has_permission(organization_id,'people','edit'))
 with check (private.sa_my_role(organization_id)='manager' and private.sa_has_permission(organization_id,'people','edit'));

drop policy if exists sa_acl_manager_photos_select on public.sa_photo_metadata;
create policy sa_acl_manager_photos_select on public.sa_photo_metadata
 for select to authenticated using (
  private.sa_my_role(organization_id)='manager'
  and private.sa_has_permission(organization_id,'photos','view'));
drop policy if exists sa_acl_manager_photos_insert on public.sa_photo_metadata;
create policy sa_acl_manager_photos_insert on public.sa_photo_metadata
 for insert to authenticated with check (
  private.sa_my_role(organization_id)='manager'
  and private.sa_has_permission(organization_id,'photos','edit'));

drop policy if exists sa_acl_manager_history_select on public.sa_activity_log;
create policy sa_acl_manager_history_select on public.sa_activity_log
 for select to authenticated using (
  private.sa_my_role(organization_id)='manager'
  and (private.sa_has_permission(organization_id,'history','view')
       or private.sa_has_permission(organization_id,'changes','view')));

drop policy if exists sa_acl_manager_schedules_select on public.sa_work_schedules;
create policy sa_acl_manager_schedules_select on public.sa_work_schedules
 for select to authenticated using (
  private.sa_my_role(organization_id)='manager'
  and private.sa_has_permission(organization_id,'calendar','view'));
drop policy if exists sa_acl_manager_schedules_update on public.sa_work_schedules;
create policy sa_acl_manager_schedules_update on public.sa_work_schedules
 for update to authenticated
 using (private.sa_my_role(organization_id)='manager' and private.sa_has_permission(organization_id,'calendar','edit'))
 with check (private.sa_my_role(organization_id)='manager' and private.sa_has_permission(organization_id,'calendar','edit'));
