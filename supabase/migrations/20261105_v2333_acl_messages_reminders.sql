
-- ŠA V2.3.33: additive explicit delete access, safe messages and reminders.
-- Existing accounts, jobs, messages and photos remain intact.
alter table public.sa_user_permissions drop constraint if exists sa_user_permissions_access_check;
alter table public.sa_user_permissions add constraint sa_user_permissions_access_check
  check (access in ('none','view','edit','delete'));

create or replace function private.sa_has_permission(p_org uuid,p_module text,p_level text default 'view')
returns boolean language sql stable security definer set search_path=''
as $function$
 select coalesce((
   select m.role='admin' or
       (m.role in ('manager','worker') and exists(
         select 1 from public.sa_user_permissions p
         where p.organization_id=m.organization_id and p.user_id=m.user_id
         and p.module=p_module
         and (
           (p_level='view' and p.access in ('view','edit','delete')) or
           (p_level='edit' and p.access in ('edit','delete')) or
           (p_level='delete' and p.access='delete')
         )
       ))
   from public.sa_memberships m
   where m.organization_id=p_org and m.user_id=(select auth.uid()) and m.active
     and (m.role='admin' or private.sa_activation_ok(m.organization_id,m.user_id))
   limit 1
 ),false);
$function$;
revoke all on function private.sa_has_permission(uuid,text,text) from public,anon;
grant execute on function private.sa_has_permission(uuid,text,text) to authenticated;

-- The 'edit' level must NEVER silently authorize changing deletedAt.
create or replace function private.sa_enforce_soft_delete_permission()
returns trigger language plpgsql security invoker set search_path=''
as $function$
declare mod text;
begin
 mod:=case when TG_TABLE_NAME='sa_jobs' then 'jobs'
           when TG_TABLE_NAME='sa_addresses' then 'addresses'
           else null end;
 if mod is null then raise exception 'UNEXPECTED_TABLE' using errcode='42501'; end if;
 if coalesce(OLD.data->>'deletedAt','') is distinct from coalesce(NEW.data->>'deletedAt','')
    and not private.sa_has_permission(NEW.organization_id,mod,'delete')
 then raise exception 'DELETE_PERMISSION_REQUIRED' using errcode='42501'; end if;
 return NEW;
end;
$function$;
drop trigger if exists sa_acl_jobs_soft_delete on public.sa_jobs;
create trigger sa_acl_jobs_soft_delete before update of data on public.sa_jobs
 for each row execute function private.sa_enforce_soft_delete_permission();
drop trigger if exists sa_acl_addresses_soft_delete on public.sa_addresses;
create trigger sa_acl_addresses_soft_delete before update of data on public.sa_addresses
 for each row execute function private.sa_enforce_soft_delete_permission();

-- Members who are explicitly allowed to send messages can use the existing composer.
create or replace function public.sa_send_staff_message(
 p_org uuid,p_title text,p_body text,p_kind text,p_recipients uuid[],
 p_schedule timestamptz default null
)
returns uuid language plpgsql security definer set search_path=''
as $function$
declare v_id uuid;v_schedule timestamptz;v_member_count integer;
begin
 if not private.sa_has_permission(p_org,'messages','edit') then
   raise exception 'MESSAGE_EDIT_PERMISSION_REQUIRED' using errcode='42501';
 end if;
 if p_title is null or char_length(btrim(p_title)) not between 1 and 120
    or p_body is null or char_length(btrim(p_body)) not between 1 and 2000
    or p_kind not in ('info','read','response')
 then raise exception 'INVALID_MESSAGE' using errcode='22023'; end if;
 if p_recipients is null or cardinality(p_recipients) not between 1 and 50
    or (select count(distinct x) from unnest(p_recipients) x)<>cardinality(p_recipients)
 then raise exception 'INVALID_RECIPIENTS' using errcode='22023'; end if;
 select count(distinct m.user_id) into v_member_count
 from public.sa_memberships m
 left join public.sa_account_directory d
   on d.organization_id=m.organization_id and d.user_id=m.user_id
 where m.organization_id=p_org and m.user_id=any(p_recipients)
   and m.active and m.role in ('admin','manager','worker')
   and d.deleted_at is null
   and (d.activation_required is distinct from true or d.activation_completed_at is not null);
 if v_member_count<>cardinality(p_recipients) then
   raise exception 'RECIPIENT_NOT_ACTIVE' using errcode='42501'; end if;
 v_schedule:=coalesce(p_schedule,now());
 if v_schedule<now()-interval '1 minute' or v_schedule>now()+interval '90 days'
 then raise exception 'INVALID_SCHEDULE' using errcode='22023'; end if;
 if v_schedule<now() then v_schedule:=now();end if;
 insert into public.sa_staff_messages(organization_id,sender_id,title,body,kind,scheduled_for)
 values(p_org,(select auth.uid()),btrim(p_title),btrim(p_body),p_kind,v_schedule)
 returning id into v_id;
 insert into public.sa_staff_message_receipts(organization_id,message_id,recipient_id)
 select p_org,v_id,x from unnest(p_recipients) x;
 return v_id;
end;
$function$;
revoke all on function public.sa_send_staff_message(uuid,text,text,text,uuid[],timestamptz) from public,anon;
grant execute on function public.sa_send_staff_message(uuid,text,text,text,uuid[],timestamptz) to authenticated;

-- Let permitted senders list ONLY active company logins (not the personnel HR database).
create or replace function public.sa_list_message_recipients(p_org uuid)
returns table(user_id uuid,display_name text,account_role text)
language plpgsql stable security definer set search_path=''
as $function$
begin
 if not private.sa_has_permission(p_org,'messages','edit') then
   raise exception 'MESSAGE_EDIT_PERMISSION_REQUIRED' using errcode='42501';end if;
 return query
 select m.user_id,
    coalesce(nullif(btrim(d.display_name),''),nullif(btrim(split_part(d.email,'@',1)),''),'Naudotojas')::text,
    m.role::text
 from public.sa_memberships m
 left join public.sa_account_directory d
   on d.organization_id=m.organization_id and d.user_id=m.user_id
 where m.organization_id=p_org and m.active and m.role in ('admin','manager','worker')
   and d.deleted_at is null
   and (d.activation_required is distinct from true or d.activation_completed_at is not null)
 order by 2,1;
end;
$function$;
revoke all on function public.sa_list_message_recipients(uuid) from public,anon;
grant execute on function public.sa_list_message_recipients(uuid) to authenticated;

-- Only sender or administrator can inspect sent message and receipt history.
drop policy if exists sa_staff_msg_sender_read on public.sa_staff_messages;
create policy sa_staff_msg_sender_read on public.sa_staff_messages for select to authenticated
 using (sender_id=(select auth.uid()) and private.sa_has_permission(organization_id,'messages','edit'));
drop policy if exists sa_staff_receipt_sender_read on public.sa_staff_message_receipts;
create policy sa_staff_receipt_sender_read on public.sa_staff_message_receipts for select to authenticated
 using (private.sa_has_permission(organization_id,'messages','edit') and exists (
  select 1 from public.sa_staff_messages msg
  where msg.id=message_id and msg.organization_id=sa_staff_message_receipts.organization_id
    and msg.sender_id=(select auth.uid())
 ));
-- Correct the original receipt-correlation predicate; never expose others' messages.
drop policy if exists sa_staff_msg_recipient_read on public.sa_staff_messages;
create policy sa_staff_msg_recipient_read on public.sa_staff_messages for select to authenticated
 using (
   scheduled_for<=now() and private.sa_has_permission(organization_id,'messages','view') and exists (
     select 1 from public.sa_staff_message_receipts r
     where r.message_id=sa_staff_messages.id
       and r.organization_id=sa_staff_messages.organization_id
       and r.recipient_id=(select auth.uid()) and r.hidden_at is null
   )
 );

-- A read-only recipient may acknowledge their own message without gaining send rights.
do $fix_ack$
declare old_source text;new_source text;
begin
 select pg_get_functiondef(p.oid) into old_source
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname='sa_ack_staff_message';
 if old_source is null then raise exception 'ACK_RPC_NOT_FOUND';end if;
 if old_source like '%sa_has_permission(p_org,''messages'',''edit'')%' then
   new_source:=replace(old_source,
    'sa_has_permission(p_org,''messages'',''edit'')',
    'sa_has_permission(p_org,''messages'',''view'')');
   execute new_source;
 end if;
end $fix_ack$;

-- Each reminder has its own auditable ID; never send repeated push storms.
create table if not exists public.sa_message_reminders (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.sa_organizations(id) on delete restrict,
 message_id uuid not null references public.sa_staff_messages(id) on delete restrict,
 recipient_id uuid not null,
 sent_by uuid not null,
 created_at timestamptz not null default now()
);
create index if not exists sa_reminders_scope_idx on public.sa_message_reminders
 (organization_id,message_id,recipient_id,created_at desc);
alter table public.sa_message_reminders enable row level security;
revoke all on public.sa_message_reminders from anon,authenticated;
grant select on public.sa_message_reminders to authenticated;
drop policy if exists sa_message_reminders_sender_read on public.sa_message_reminders;
create policy sa_message_reminders_sender_read on public.sa_message_reminders for select to authenticated
 using (private.sa_has_permission(organization_id,'messages','edit') and
  (sent_by=(select auth.uid()) or private.sa_my_role(organization_id)='admin'));
alter table public.sa_push_outbox drop constraint if exists sa_push_outbox_source_type_check;
alter table public.sa_push_outbox add constraint sa_push_outbox_source_type_check
 check (source_type in ('staff','job','reminder'));

create or replace function public.sa_remind_staff_message(
 p_org uuid,p_message uuid,p_recipient uuid
)
returns boolean language plpgsql security definer set search_path=''
as $function$
declare msg public.sa_staff_messages%rowtype;receipt public.sa_staff_message_receipts%rowtype;
 reminder_id uuid;last_time timestamptz;daily_count integer;
begin
 if not private.sa_has_permission(p_org,'messages','edit') then
  raise exception 'MESSAGE_EDIT_PERMISSION_REQUIRED' using errcode='42501';end if;
 select * into msg from public.sa_staff_messages m
 where m.id=p_message and m.organization_id=p_org and
   (m.sender_id=(select auth.uid()) or private.sa_my_role(p_org)='admin');
 if not found or msg.scheduled_for>now() then return false;end if;
 select * into receipt from public.sa_staff_message_receipts r
 where r.organization_id=p_org and r.message_id=p_message and r.recipient_id=p_recipient
   and r.read_at is null and r.hidden_at is null for update;
 if not found then return false;end if;
 select max(created_at),count(*) filter(where created_at>now()-interval '24 hours')
 into last_time,daily_count from public.sa_message_reminders
 where organization_id=p_org and message_id=p_message and recipient_id=p_recipient;
 if (last_time is not null and last_time>now()-interval '30 minutes') or daily_count>=3 then
  raise exception 'REMINDER_LIMIT' using errcode='22023';end if;
 insert into public.sa_message_reminders(organization_id,message_id,recipient_id,sent_by)
 values(p_org,p_message,p_recipient,(select auth.uid())) returning id into reminder_id;
 insert into public.sa_push_outbox(organization_id,recipient_id,source_type,source_id,title,body,path,scheduled_at)
 values(p_org,p_recipient,'reminder',reminder_id,'Priminimas: '||left(msg.title,105),
   left(msg.body,512),' /#/pranesimai',now());
 -- Normalize fixed internal relative path (no user-provided URL).
 update public.sa_push_outbox set path='/#/pranesimai' where source_id=reminder_id and source_type='reminder';
 return true;
end;
$function$;
revoke all on function public.sa_remind_staff_message(uuid,uuid,uuid) from public,anon;
grant execute on function public.sa_remind_staff_message(uuid,uuid,uuid) to authenticated;

-- No existing record mutations. End.
