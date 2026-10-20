-- ŠA V2.3.22. Only CREATEs safe manual deletion RPC and minimal audit.
-- No existing message is deleted by applying this migration.
begin;

-- Sender-facing compliance record: recipient/time/status ONLY. No message text,
-- no copy of recipient reply, and no full message receipt after personal purge.
create table if not exists public.sa_staff_message_purge_audit (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  message_id uuid not null references public.sa_staff_messages(id) on delete restrict,
  recipient_id uuid not null,
  read_at timestamptz,
  response text,
  responded_at timestamptz,
  replied_at timestamptz,
  purged_at timestamptz not null default now(),
  unique(message_id,recipient_id)
);
create index if not exists sa_staff_message_purge_org
  on public.sa_staff_message_purge_audit(organization_id,message_id);
alter table public.sa_staff_message_purge_audit enable row level security;
revoke all on public.sa_staff_message_purge_audit from public,anon,authenticated;
grant select on public.sa_staff_message_purge_audit to authenticated;
create policy sa_staff_purge_audit_admin_read
 on public.sa_staff_message_purge_audit for select to authenticated
 using (private.sa_my_role(organization_id)='admin');

-- Physical removal of recipient's specific, already trashed message receipt.
-- Sender's sent-message original and other recipients' receipts remain.
-- A minimal compliance/audit marker remains without the recipient's reply text.
create or replace function public.sa_purge_own_staff_message(p_org uuid,p_receipt uuid)
returns boolean language plpgsql security definer set search_path=''
as $body$
declare v_record record;
begin
 if (select auth.uid()) is null or not exists (
   select 1 from public.sa_memberships m
    where m.organization_id=p_org and m.user_id=(select auth.uid()) and m.active
 ) then raise exception 'MEMBERSHIP_REQUIRED' using errcode='42501'; end if;
 select r.* into v_record
 from public.sa_staff_message_receipts r
 join public.sa_staff_messages m on m.id=r.message_id
   and m.organization_id=r.organization_id
 where r.id=p_receipt and r.organization_id=p_org
   and r.recipient_id=(select auth.uid())
   and r.hidden_at is not null and m.scheduled_for<=now()
 for update of r;
 if v_record.id is null then return false; end if;

 insert into public.sa_staff_message_purge_audit
   (organization_id,message_id,recipient_id,read_at,response,responded_at,replied_at)
 values (v_record.organization_id,v_record.message_id,v_record.recipient_id,
         v_record.read_at,v_record.response,v_record.responded_at,v_record.replied_at)
 on conflict (message_id,recipient_id) do nothing;

 -- Avoid delayed scheduled pushes to a recipient who discarded this receipt.
 update public.sa_push_outbox o
 set finished_at=coalesce(o.finished_at,now()),leased_at=null,
     delivery_state='no_device',error_code='RECIPIENT_PURGED'
 where o.organization_id=p_org and o.recipient_id=v_record.recipient_id
   and o.source_type='staff' and o.source_id=v_record.id
   and o.finished_at is null;

 delete from public.sa_staff_message_receipts r
 where r.id=v_record.id and r.organization_id=p_org
   and r.recipient_id=(select auth.uid());
 return found;
end;
$body$;
revoke all on function public.sa_purge_own_staff_message(uuid,uuid) from public,anon;
grant execute on function public.sa_purge_own_staff_message(uuid,uuid) to authenticated;
commit;
