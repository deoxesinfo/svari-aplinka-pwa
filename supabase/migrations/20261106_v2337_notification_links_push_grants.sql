-- ŠA V2.3.37 – staged only. Apply after FINAL APPROVE, not with PR tests.
-- Existing messages, replies, access grants for employees, and push history preserved.
begin;

-- The Push Edge sender runs as service_role; BYPASSRLS does not imply table privileges.
-- Only required read and expired-subscription removal privileges.
grant select, delete on public.sa_push_subscriptions to service_role;

-- A notification must point to a concrete conversation/recipient receipt, not just a title.
alter table public.sa_notifications
  add column if not exists related_message_id uuid,
  add column if not exists related_receipt_id uuid;
create index if not exists sa_notifications_related_message
  on public.sa_notifications(organization_id,related_message_id)
  where related_message_id is not null;
-- At most one reply notification per recipient receipt; multiple replies by
-- different recipients to the same message remain separate notifications.
create unique index if not exists sa_notifications_staff_reply_once
  on public.sa_notifications(organization_id,related_receipt_id)
  where kind='staff_reply' and related_receipt_id is not null;

-- Safely connect legacy replies only when the title, recipient and time agree
-- and there is exactly one candidate. Ambiguous old records remain unchanged.
with candidate as (
 select n.id notice_id,r.message_id,r.id receipt_id,
        count(*) over(partition by n.id) candidate_count
 from public.sa_notifications n
 join public.sa_staff_messages m
   on m.organization_id=n.organization_id and m.sender_id=n.recipient_id
   and ('Gautas atsakymas: '||left(m.title,100))=n.title
 join public.sa_staff_message_receipts r
   on r.organization_id=n.organization_id and r.message_id=m.id
   and r.reply_text is not null and r.replied_at is not null
   and abs(extract(epoch from(n.created_at-r.replied_at)))<60
 where n.kind='staff_reply' and n.related_message_id is null
), unambiguous as (
 select c.*,row_number() over(partition by c.receipt_id order by c.notice_id) as receipt_rank
 from candidate c where c.candidate_count=1
)
update public.sa_notifications n
set related_message_id=c.message_id,related_receipt_id=c.receipt_id
from unambiguous c where c.notice_id=n.id and c.receipt_rank=1;

-- Receipt-owned explicit mark-as-read, including message:view accounts.
-- No cross-organization, recipient, or write privilege escalation.
create or replace function public.sa_mark_own_notification_read(p_org uuid,p_notice uuid)
returns boolean language plpgsql security definer set search_path=''
as $fn$
declare v_id uuid;
begin
 if (select auth.uid()) is null
   or not private.sa_has_permission(p_org,'messages','view') then
   raise exception 'MESSAGE_VIEW_PERMISSION_REQUIRED' using errcode='42501';
 end if;
 update public.sa_notifications n
 set read_at=coalesce(n.read_at,now())
 where n.id=p_notice and n.organization_id=p_org
   and n.recipient_id=(select auth.uid())
 returning n.id into v_id;
 return v_id is not null;
end;
$fn$;
revoke all on function public.sa_mark_own_notification_read(uuid,uuid) from public,anon;
grant execute on function public.sa_mark_own_notification_read(uuid,uuid) to authenticated;

-- First reply per receipt persists exactly once. A reply notification stores
-- immutable pointers; no body text is copied into the notification.
create or replace function public.sa_reply_staff_message(
 p_org uuid,p_receipt uuid,p_text text
) returns boolean language plpgsql security definer set search_path=''
as $fn$
declare v_sender uuid;v_title text;v_receipt uuid;v_message uuid;
begin
 if not private.sa_has_permission(p_org,'messages','view') then
   raise exception 'MESSAGE_VIEW_PERMISSION_REQUIRED' using errcode='42501';
 end if;
 if p_text is null or char_length(btrim(p_text)) not between 1 and 300 then
   raise exception 'INVALID_REPLY' using errcode='22023';
 end if;
 update public.sa_staff_message_receipts r
 set reply_text=btrim(p_text),replied_at=now(),read_at=coalesce(r.read_at,now())
 from public.sa_staff_messages msg
 where r.id=p_receipt and r.message_id=msg.id and r.organization_id=p_org
   and msg.organization_id=p_org
   and r.recipient_id=(select auth.uid())
   and msg.scheduled_for<=now() and r.reply_text is null and r.hidden_at is null
 returning r.id,msg.sender_id,msg.title,msg.id
 into v_receipt,v_sender,v_title,v_message;
 if v_receipt is null then return false; end if;
 if v_sender is distinct from (select auth.uid()) then
   insert into public.sa_notifications
    (organization_id,recipient_id,title,body,kind,related_message_id,related_receipt_id)
   select p_org,v_sender,'Gautas atsakymas: '||left(v_title,100),
     'Naujas atsakymas prie išsiųsto pranešimo.','staff_reply',v_message,v_receipt
   where exists(select 1 from public.sa_memberships m where m.organization_id=p_org
        and m.user_id=v_sender and m.active)
   on conflict do nothing;
 end if;
 return true;
end;
$fn$;
revoke all on function public.sa_reply_staff_message(uuid,uuid,text) from public,anon;
grant execute on function public.sa_reply_staff_message(uuid,uuid,text) to authenticated;

-- All push paths are created server-side with UUID identifiers. Do not include
-- message bodies in deep-link query strings.
create or replace function private.sa_queue_push_notifications()
returns trigger language plpgsql security definer set search_path=''
as $fn$
begin
 if new.recipient_id is not null then
   insert into public.sa_push_outbox
    (organization_id,recipient_id,source_type,source_id,title,body,path)
   values(new.organization_id,new.recipient_id,'job',new.id,
     left(new.title,120),left(coalesce(new.body,''),512),
     case when new.kind='staff_reply' and new.related_message_id is not null
       then '/#/pranesimai?tab=issiusti&message='||new.related_message_id::text
       when new.related_job_id is not null
       then '/#/darbai/'||new.related_job_id::text
       else '/#/pranesimai' end)
   on conflict(source_type,source_id,recipient_id) do nothing;
 end if;
 return new;
end;
$fn$;

create or replace function private.sa_queue_push_staff()
returns trigger language plpgsql security definer set search_path=''
as $fn$
declare msg record;
begin
 select m.title,m.body,m.scheduled_for into msg from public.sa_staff_messages m
 where m.id=new.message_id and m.organization_id=new.organization_id;
 if found then
   insert into public.sa_push_outbox
    (organization_id,recipient_id,source_type,source_id,title,body,path,scheduled_at)
   values(new.organization_id,new.recipient_id,'staff',new.id,
     left(msg.title,120),'Gavote asmeninę žinutę. Atidarykite Švari Aplinka.',
     '/#/pranesimai?tab=gauti&message='||new.message_id::text,msg.scheduled_for)
   on conflict(source_type,source_id,recipient_id) do nothing;
 end if;
 return new;
end;
$fn$;

commit;
