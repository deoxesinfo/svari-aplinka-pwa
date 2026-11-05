-- ŠA V2.3.28: SECURITY DEFINER message actions respect module edit rights.
-- Existing function logic is preserved; only a fail-closed permission precondition is prepended.
do $sa_acl$
declare r record; old_def text; new_def text; prefix text;
begin
 for r in select * from (values
   ('sa_ack_staff_message'),('sa_hide_staff_message'),
   ('sa_purge_own_staff_message'),('sa_reply_staff_message')
 ) as v(proname) loop
   select pg_get_functiondef(p.oid) into old_def
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname=r.proname;
   if old_def is null then raise exception 'Missing message RPC: %',r.proname; end if;
   if old_def like '%private.sa_has_permission%' then continue; end if;
   prefix:=E'\nbegin\n';
   if position(prefix in old_def)=0 then raise exception 'Unexpected RPC body: %',r.proname; end if;
   new_def:=regexp_replace(old_def,E'\nbegin\n',
       E'\nbegin\n  if not private.sa_has_permission(p_org,\'messages\',\'edit\') then raise exception \'ACCESS_DENIED\' using errcode=\'42501\'; end if;\n');
   if new_def=old_def then raise exception 'Failed to strengthen RPC: %',r.proname; end if;
   execute new_def;
 end loop;
end $sa_acl$;

-- Prevent a user with no Messages permission from mutating notification state.
do $sa_acl$
declare predicate text; check_expression text;
begin
 select pg_get_expr(p.polqual,p.polrelid),pg_get_expr(p.polwithcheck,p.polrelid)
 into predicate,check_expression
 from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relname='sa_notifications' and p.polname='notification_read';
 if predicate is null or check_expression is null then raise exception 'Missing notification UPDATE policy'; end if;
 if predicate not like '%private.sa_has_permission%' then
  execute format('alter policy notification_read on public.sa_notifications using ((%s) and private.sa_has_permission(organization_id,%L,%L)) with check ((%s) and private.sa_has_permission(organization_id,%L,%L))',
    predicate,'messages','edit',check_expression,'messages','edit');
 end if;
end $sa_acl$;
