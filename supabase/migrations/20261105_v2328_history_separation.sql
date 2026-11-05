-- History is audit data, distinct from the static GitHub changelog.
-- Granting 'Pakeitimai' must not accidentally expose private 'Istorija'.
drop policy if exists sa_acl_manager_history_select on public.sa_activity_log;
create policy sa_acl_manager_history_select on public.sa_activity_log
 for select to authenticated using (
  private.sa_my_role(organization_id)='manager'
  and private.sa_has_permission(organization_id,'history','view')
 );
