-- ŠA V2.3.21: recipient-only reply/hide, richer job audits (no deletions).
begin;
alter table public.sa_staff_message_receipts add column if not exists reply_text text;
alter table public.sa_staff_message_receipts add column if not exists replied_at timestamptz;
alter table public.sa_staff_message_receipts add column if not exists hidden_at timestamptz;
alter table public.sa_staff_message_receipts drop constraint if exists sa_staff_reply_length;
alter table public.sa_staff_message_receipts add constraint sa_staff_reply_length check
  (reply_text is null or (char_length(btrim(reply_text)) between 1 and 300));
create or replace function public.sa_reply_staff_message(p_org uuid,p_receipt uuid,p_text text)
returns boolean language plpgsql security definer set search_path=''
as $body$
declare v_found uuid;
begin
 if (select auth.uid()) is null or not exists(
  select 1 from public.sa_memberships m where m.organization_id=p_org
   and m.user_id=(select auth.uid()) and m.active
 ) then raise exception 'MEMBERSHIP_REQUIRED' using errcode='42501'; end if;
 if p_text is null or char_length(btrim(p_text)) not between 1 and 300 then
  raise exception 'INVALID_REPLY' using errcode='22023'; end if;
 update public.sa_staff_message_receipts r
 set reply_text=btrim(p_text), replied_at=now(), read_at=coalesce(r.read_at,now())
 from public.sa_staff_messages msg
 where r.id=p_receipt and r.message_id=msg.id and r.organization_id=p_org
  and msg.organization_id=p_org and r.recipient_id=(select auth.uid())
  and msg.scheduled_for<=now() and r.reply_text is null and r.hidden_at is null
 returning r.id into v_found;
 return v_found is not null;
end;
$body$;
revoke all on function public.sa_reply_staff_message(uuid,uuid,text) from public,anon;
grant execute on function public.sa_reply_staff_message(uuid,uuid,text) to authenticated;
create or replace function public.sa_hide_staff_message(p_org uuid,p_receipt uuid,p_hide boolean default true)
returns boolean language plpgsql security definer set search_path=''
as $body$
declare v_found uuid;
begin
 if (select auth.uid()) is null or not exists(
  select 1 from public.sa_memberships m where m.organization_id=p_org
    and m.user_id=(select auth.uid()) and m.active
 ) then raise exception 'MEMBERSHIP_REQUIRED' using errcode='42501';end if;
 update public.sa_staff_message_receipts r
 set hidden_at=case when p_hide then coalesce(r.hidden_at,now()) else null end
 from public.sa_staff_messages msg
 where r.id=p_receipt and r.message_id=msg.id and r.organization_id=p_org
   and msg.organization_id=p_org and r.recipient_id=(select auth.uid())
   and msg.scheduled_for<=now()
 returning r.id into v_found;
 return v_found is not null;
end;
$body$;
revoke all on function public.sa_hide_staff_message(uuid,uuid,boolean) from public,anon;
grant execute on function public.sa_hide_staff_message(uuid,uuid,boolean) to authenticated;

-- Retain the original log event (no duplicate trigger). For future job changes
-- record only explicit safe fields; NEVER access codes, GPS, image URLs or notes.
create or replace function private.sa_log_business_change()
returns trigger language plpgsql security definer set search_path=''
as $body$
declare v_org uuid;v_id uuid;v_event text;v_details jsonb;
 v_changes jsonb:='{}'::jsonb;v_key text;
begin
 v_org:=case when TG_OP='DELETE' then OLD.organization_id else NEW.organization_id end;
 v_id:=case when TG_OP='DELETE' then OLD.id else NEW.id end;
 v_event:=lower(TG_OP);
 v_details:=jsonb_build_object('timestamp',clock_timestamp(),'source','database_trigger');
 if TG_TABLE_NAME='sa_jobs' then
  if TG_OP='UPDATE' then
   foreach v_key in array array['type','date','status','priority','inspection','worker','completedAt'] loop
    if OLD.data->v_key is distinct from NEW.data->v_key then
     v_changes:=v_changes||jsonb_build_object(v_key,jsonb_build_object('old',OLD.data->v_key,'new',NEW.data->v_key));
    end if;
   end loop;
  elsif TG_OP='INSERT' then
   foreach v_key in array array['type','date','status','priority','inspection','worker'] loop
    if NEW.data ? v_key then
     v_changes:=v_changes||jsonb_build_object(v_key,jsonb_build_object('new',NEW.data->v_key));
    end if;
   end loop;
  end if;
  v_details:=v_details||jsonb_build_object('changes',v_changes);
 end if;
 insert into public.sa_activity_log
  (organization_id,actor_user_id,entity_type,entity_id,event_type,details)
 values(v_org,auth.uid(),TG_TABLE_NAME,v_id,v_event,v_details);
 return case when TG_OP='DELETE' then OLD else NEW end;
end;
$body$;
commit;