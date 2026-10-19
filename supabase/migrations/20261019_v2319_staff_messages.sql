-- Švari Aplinka V2.3.19. Only adds private staff-message structures.
-- No existing jobs, accounts, photos or messages are changed or deleted.
begin;

create table if not exists public.sa_staff_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  sender_id uuid not null,
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 2000),
  kind text not null check (kind in ('info','read','response')),
  scheduled_for timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create table if not exists public.sa_staff_message_receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  message_id uuid not null references public.sa_staff_messages(id) on delete restrict,
  recipient_id uuid not null,
  read_at timestamptz,
  response text check (response is null or response in ('sutinku','nesutinku')),
  responded_at timestamptz,
  unique(message_id,recipient_id)
);
create index if not exists sa_staff_messages_org_scheduled
  on public.sa_staff_messages(organization_id,scheduled_for desc);
create index if not exists sa_staff_receipts_recipient
  on public.sa_staff_message_receipts(recipient_id,message_id);
create index if not exists sa_staff_receipts_org
  on public.sa_staff_message_receipts(organization_id,message_id);

alter table public.sa_staff_messages enable row level security;
alter table public.sa_staff_message_receipts enable row level security;
revoke all on public.sa_staff_messages,public.sa_staff_message_receipts from public,anon,authenticated;
grant select on public.sa_staff_messages,public.sa_staff_message_receipts to authenticated;

create policy sa_staff_msg_admin_read on public.sa_staff_messages for select to authenticated
  using (private.sa_my_role(organization_id) = 'admin');
create policy sa_staff_msg_recipient_read on public.sa_staff_messages for select to authenticated
  using (scheduled_for <= now() and exists (
    select 1 from public.sa_staff_message_receipts r
    where r.message_id=id and r.recipient_id=(select auth.uid())
  ));
create policy sa_staff_receipt_admin_read on public.sa_staff_message_receipts for select to authenticated
  using (private.sa_my_role(organization_id) = 'admin');
create policy sa_staff_receipt_own_read on public.sa_staff_message_receipts for select to authenticated
  using (recipient_id=(select auth.uid()) and private.sa_my_role(organization_id) is not null);

create or replace function public.sa_send_staff_message(
  p_org uuid,p_title text,p_body text,p_kind text,p_recipients uuid[],p_schedule timestamptz default null
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_id uuid; v_schedule timestamptz; v_member_count integer;
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.sa_memberships m where m.organization_id=p_org
      and m.user_id=(select auth.uid()) and m.active and m.role='admin'
  ) then raise exception 'ADMIN_ONLY' using errcode='42501'; end if;
  if p_title is null or char_length(btrim(p_title)) not between 1 and 120 or
     p_body is null or char_length(btrim(p_body)) not between 1 and 2000 or
     p_kind not in ('info','read','response') then
    raise exception 'INVALID_MESSAGE' using errcode='22023';
  end if;
  if p_recipients is null or cardinality(p_recipients) not between 1 and 50 or
     (select count(distinct x) from unnest(p_recipients) x) <> cardinality(p_recipients) then
    raise exception 'INVALID_RECIPIENTS' using errcode='22023';
  end if;
  select count(distinct m.user_id) into v_member_count
  from public.sa_memberships m where m.organization_id=p_org
    and m.user_id=any(p_recipients) and m.active and m.role in ('worker','admin');
  if v_member_count <> cardinality(p_recipients) then
    raise exception 'RECIPIENT_NOT_ACTIVE' using errcode='42501';
  end if;
  v_schedule:=coalesce(p_schedule,now());
  if v_schedule < now()-interval '1 minute' or v_schedule > now()+interval '90 days' then
    raise exception 'INVALID_SCHEDULE' using errcode='22023';
  end if;
  if v_schedule < now() then v_schedule:=now(); end if;
  insert into public.sa_staff_messages(organization_id,sender_id,title,body,kind,scheduled_for)
  values(p_org,(select auth.uid()),btrim(p_title),btrim(p_body),p_kind,v_schedule)
  returning id into v_id;
  insert into public.sa_staff_message_receipts(organization_id,message_id,recipient_id)
  select p_org,v_id,x from unnest(p_recipients) x;
  return v_id;
end;
$$;

create or replace function public.sa_ack_staff_message(
  p_org uuid,p_receipt uuid,p_response text default null
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare v_id uuid; v_kind text; v_scheduled timestamptz; v_existing text;
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.sa_memberships m where m.organization_id=p_org
      and m.user_id=(select auth.uid()) and m.active
  ) then raise exception 'NO_MEMBERSHIP' using errcode='42501'; end if;
  select r.id,m.kind,m.scheduled_for,r.response into v_id,v_kind,v_scheduled,v_existing
  from public.sa_staff_message_receipts r
  join public.sa_staff_messages m on m.id=r.message_id and m.organization_id=r.organization_id
  where r.id=p_receipt and r.organization_id=p_org and r.recipient_id=(select auth.uid());
  if v_id is null or v_scheduled > now() then return false; end if;
  if p_response is not null and (
      v_kind <> 'response' or p_response not in ('sutinku','nesutinku') or v_existing is not null
  ) then return false; end if;
  update public.sa_staff_message_receipts r
  set read_at=coalesce(r.read_at,now()),
      response=coalesce(r.response,p_response),
      responded_at=case when p_response is not null then coalesce(r.responded_at,now()) else r.responded_at end
  where r.id=v_id;
  return true;
end;
$$;
revoke all on function public.sa_send_staff_message(uuid,text,text,text,uuid[],timestamptz)
  from public,anon;
grant execute on function public.sa_send_staff_message(uuid,text,text,text,uuid[],timestamptz) to authenticated;
revoke all on function public.sa_ack_staff_message(uuid,uuid,text) from public,anon;
grant execute on function public.sa_ack_staff_message(uuid,uuid,text) to authenticated;
commit;
