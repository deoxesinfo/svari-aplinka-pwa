
-- ŠA V2.3.33a: avoid cross-table RLS policy recursion. No message rows modified.
create or replace function private.sa_is_sender_of_staff_message(p_org uuid,p_message uuid)
returns boolean language sql stable security definer set search_path=''
as $function$
 select exists(
   select 1 from public.sa_staff_messages m
   where m.organization_id=p_org and m.id=p_message and m.sender_id=(select auth.uid())
 );
$function$;
create or replace function private.sa_is_recipient_of_staff_message(p_org uuid,p_message uuid)
returns boolean language sql stable security definer set search_path=''
as $function$
 select exists(
   select 1 from public.sa_staff_message_receipts r
   where r.organization_id=p_org and r.message_id=p_message
     and r.recipient_id=(select auth.uid())
 );
$function$;
revoke all on function private.sa_is_sender_of_staff_message(uuid,uuid) from public,anon;
revoke all on function private.sa_is_recipient_of_staff_message(uuid,uuid) from public,anon;
grant execute on function private.sa_is_sender_of_staff_message(uuid,uuid) to authenticated;
grant execute on function private.sa_is_recipient_of_staff_message(uuid,uuid) to authenticated;

drop policy if exists sa_staff_receipt_sender_read on public.sa_staff_message_receipts;
create policy sa_staff_receipt_sender_read on public.sa_staff_message_receipts for select to authenticated
 using (private.sa_has_permission(organization_id,'messages','edit')
   and private.sa_is_sender_of_staff_message(organization_id,message_id));
drop policy if exists sa_staff_msg_recipient_read on public.sa_staff_messages;
create policy sa_staff_msg_recipient_read on public.sa_staff_messages for select to authenticated
 using (scheduled_for<=now() and private.sa_has_permission(organization_id,'messages','view')
   and private.sa_is_recipient_of_staff_message(organization_id,id));

-- A reminder has only a fixed internal PWA target; no uncontrolled redirect.
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
   left(msg.body,512),'/#/pranesimai',now());
 return true;
end;
$function$;
revoke all on function public.sa_remind_staff_message(uuid,uuid,uuid) from public,anon;
grant execute on function public.sa_remind_staff_message(uuid,uuid,uuid) to authenticated;
