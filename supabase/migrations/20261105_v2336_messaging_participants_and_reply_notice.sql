-- ŠA V2.3.36: participant labels and delivered replies.
-- Additive migration. No existing staff messages, receipts or replies are deleted.
begin;

-- Viewer-scoped display names: never disclose other organizations or unrelated staff.
create or replace function public.sa_list_message_participants(p_org uuid)
returns table(user_id uuid,display_name text,account_role text)
language plpgsql stable security definer set search_path to ''
as $body$
begin
 if not private.sa_has_permission(p_org,'messages','view') then
   raise exception 'MESSAGE_VIEW_PERMISSION_REQUIRED' using errcode='42501';
 end if;
 return query
 with visible as (
   select msg.id,msg.sender_id from public.sa_staff_messages msg
   where msg.organization_id=p_org and (
     (msg.sender_id=(select auth.uid()) and private.sa_has_permission(p_org,'messages','edit'))
     or (msg.scheduled_for<=now() and exists (
       select 1 from public.sa_staff_message_receipts mine
       where mine.organization_id=p_org and mine.message_id=msg.id
         and mine.recipient_id=(select auth.uid())
     ))
   )
 ), party as (
   select v.sender_id as uid from visible v
   union
   select r.recipient_id from public.sa_staff_message_receipts r
   join visible v on v.id=r.message_id
   where r.organization_id=p_org
     and (v.sender_id=(select auth.uid()) or r.recipient_id=(select auth.uid()))
 )
 select party.uid,
   coalesce(nullif(btrim(d.display_name),''),
      case when m.role='admin' then 'Administratorius'
           when m.role='manager' then 'Vadybininkas'
           when m.role='worker' then 'Darbuotojas' end,
      'Paskyra '||left(party.uid::text,8))::text,
   coalesce(m.role::text,'neaktyvi')::text
 from party
 left join public.sa_memberships m
   on m.organization_id=p_org and m.user_id=party.uid
 left join public.sa_account_directory d
   on d.organization_id=p_org and d.user_id=party.uid
 order by 2,1;
end;
$body$;
revoke all on function public.sa_list_message_participants(uuid) from public,anon;
grant execute on function public.sa_list_message_participants(uuid) to authenticated;

-- A view-only recipient may acknowledge and reply ONLY to their own valid receipt.
create or replace function public.sa_ack_staff_message(
 p_org uuid,p_receipt uuid,p_response text default null
) returns boolean
language plpgsql security definer set search_path=''
as $body$
declare v_id uuid; v_kind text; v_scheduled timestamptz; v_existing text;
begin
 if not private.sa_has_permission(p_org,'messages','view') then
   raise exception 'MESSAGE_VIEW_PERMISSION_REQUIRED' using errcode='42501';
 end if;
 select r.id,msg.kind,msg.scheduled_for,r.response
 into v_id,v_kind,v_scheduled,v_existing
 from public.sa_staff_message_receipts r
 join public.sa_staff_messages msg
   on msg.id=r.message_id and msg.organization_id=r.organization_id
 where r.id=p_receipt and r.organization_id=p_org
   and r.recipient_id=(select auth.uid()) and r.hidden_at is null
 for update of r;
 if v_id is null or v_scheduled>now() then return false; end if;
 if p_response is not null and
   (v_kind<>'response' or p_response not in ('sutinku','nesutinku') or v_existing is not null)
 then return false; end if;
 update public.sa_staff_message_receipts r
 set read_at=coalesce(r.read_at,now()),
     response=coalesce(r.response,p_response),
     responded_at=case when p_response is not null then coalesce(r.responded_at,now()) else r.responded_at end
 where r.id=v_id;
 return true;
end;
$body$;
revoke all on function public.sa_ack_staff_message(uuid,uuid,text) from public,anon;
grant execute on function public.sa_ack_staff_message(uuid,uuid,text) to authenticated;

-- The reply remains stored on the receipt as before, and a separate bell
-- notification is written to the original sender, once per first reply.
create or replace function public.sa_reply_staff_message(
 p_org uuid,p_receipt uuid,p_text text
) returns boolean
language plpgsql security definer set search_path=''
as $body$
declare v_sender uuid; v_title text; v_receipt uuid;
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
 returning r.id,msg.sender_id,msg.title into v_receipt,v_sender,v_title;
 if v_receipt is null then return false; end if;
 if v_sender is distinct from (select auth.uid()) then
   insert into public.sa_notifications(organization_id,recipient_id,title,body,kind)
   select p_org,v_sender,'Gautas atsakymas: '||left(v_title,100),left(btrim(p_text),300),'staff_reply'
   where exists (
     select 1 from public.sa_memberships m
     where m.organization_id=p_org and m.user_id=v_sender and m.active
   );
 end if;
 return true;
end;
$body$;
revoke all on function public.sa_reply_staff_message(uuid,uuid,text) from public,anon;
grant execute on function public.sa_reply_staff_message(uuid,uuid,text) to authenticated;
commit;
