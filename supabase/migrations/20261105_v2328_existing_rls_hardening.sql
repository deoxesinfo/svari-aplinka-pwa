-- ŠA V2.3.28: refuse forbidden module reads even through existing worker assignment policies.
-- Preserves existing admin permissions, jobs, people, and R2 objects.
do $sa_acl$
declare r record; predicate text;
begin
 for r in select * from (values
  ('sa_addresses','addresses_view','addresses','view'),
  ('sa_jobs','jobs_view','jobs','view'),
  ('sa_people','people_view','people','view'),
  ('sa_photo_metadata','photos_view','photos','view'),
  ('sa_address_assignments','assignment_view','calendar','view'),
  ('sa_work_schedules','work_schedule_read','calendar','view'),
  ('sa_notifications','notification_view','messages','view'),
  ('sa_staff_messages','sa_staff_msg_recipient_read','messages','view'),
  ('sa_staff_message_receipts','sa_staff_receipt_own_read','messages','view')
 ) as v(tab,policy,module,level) loop
   select pg_get_expr(p.polqual,p.polrelid) into predicate
   from pg_policy p join pg_class c on p.polrelid=c.oid join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname=r.tab and p.polname=r.policy;
   if predicate is null then
     raise exception 'Expected existing policy missing: %.%',r.tab,r.policy;
   end if;
   if predicate like '%private.sa_has_permission%' then continue; end if;
   execute format('alter policy %I on public.%I using ((%s) and private.sa_has_permission(organization_id,%L,%L))',
      r.policy,r.tab,predicate,r.module,r.level);
 end loop;
 -- R2 metadata creation by existing workers must also honor photos:edit.
 select pg_get_expr(p.polwithcheck,p.polrelid) into predicate
 from pg_policy p join pg_class c on p.polrelid=c.oid join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relname='sa_photo_metadata' and p.polname='sa_photos_worker_assigned_gps_insert';
 if predicate is null then raise exception 'Required worker-photo insert policy missing'; end if;
 if predicate not like '%private.sa_has_permission%' then
   execute format('alter policy sa_photos_worker_assigned_gps_insert on public.sa_photo_metadata with check ((%s) and private.sa_has_permission(organization_id,%L,%L))',
      predicate,'photos','edit');
 end if;
end $sa_acl$;

-- A worker without jobs:edit must not complete a job using a SECURITY DEFINER RPC.
do $sa_acl$
declare old_def text; new_def text;
begin
 select pg_get_functiondef(p.oid) into old_def
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname='sa_complete_assigned_job';
 if old_def is null then raise exception 'Missing completion RPC'; end if;
 new_def:=replace(old_def,
    'IF private.sa_my_role(p_org) <> ''worker'' THEN',
    'IF private.sa_my_role(p_org) <> ''worker'' OR NOT private.sa_has_permission(p_org,''jobs'',''edit'') THEN');
 if new_def=old_def and old_def not like '%sa_has_permission%' then
   raise exception 'Unexpected completion function format';
 end if;
 if new_def<>old_def then execute new_def; end if;
end $sa_acl$;
