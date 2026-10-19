-- Švari Aplinka V2.3.20 secure Web Push foundation.
-- NO service keys in SQL; NO existing messages or R2 objects are modified.
begin;
create table if not exists public.sa_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  user_id uuid not null,
  endpoint text not null unique check(length(endpoint) between 25 and 2048
    and endpoint ~* '^https://(fcm\\.googleapis\\.com|updates\\.push\\.services\\.mozilla\\.com|web\\.push\\.apple\\.com|[a-z0-9-]+\\.push\\.apple\\.com)/'),
  p256dh text not null check(length(p256dh) between 25 and 256),
  auth text not null check(length(auth) between 10 and 256),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sa_push_sub_user on public.sa_push_subscriptions(organization_id,user_id);
create or replace function private.sa_push_max_devices()
returns trigger language plpgsql security definer set search_path='' as $
begin
  if (select count(*) from public.sa_push_subscriptions s
      where s.organization_id=new.organization_id and s.user_id=new.user_id)>=5
  then raise exception 'TOO_MANY_PUSH_DEVICES' using errcode='23514'; end if;
  return new;
end;
$;
drop trigger if exists sa_push_limit_devices on public.sa_push_subscriptions;
create trigger sa_push_limit_devices before insert on public.sa_push_subscriptions
for each row execute function private.sa_push_max_devices();
alter table public.sa_push_subscriptions enable row level security;
revoke all on public.sa_push_subscriptions from public,anon,authenticated;
grant select,insert,update,delete on public.sa_push_subscriptions to authenticated;

create policy sa_push_device_read on public.sa_push_subscriptions for select to authenticated
 using (user_id=(select auth.uid()) and exists (
  select 1 from public.sa_memberships m where m.organization_id=sa_push_subscriptions.organization_id
    and m.user_id=(select auth.uid()) and m.active
 ));
create policy sa_push_device_insert on public.sa_push_subscriptions for insert to authenticated
 with check (user_id=(select auth.uid()) and exists (
  select 1 from public.sa_memberships m where m.organization_id=sa_push_subscriptions.organization_id
    and m.user_id=(select auth.uid()) and m.active
 ));
create policy sa_push_device_update on public.sa_push_subscriptions for update to authenticated
 using (user_id=(select auth.uid()) and exists (
  select 1 from public.sa_memberships m where m.organization_id=sa_push_subscriptions.organization_id
    and m.user_id=(select auth.uid()) and m.active
 ))
 with check (user_id=(select auth.uid()) and exists (
  select 1 from public.sa_memberships m where m.organization_id=sa_push_subscriptions.organization_id
    and m.user_id=(select auth.uid()) and m.active
 ));
create policy sa_push_device_delete on public.sa_push_subscriptions for delete to authenticated
 using (user_id=(select auth.uid()) and exists (
  select 1 from public.sa_memberships m where m.organization_id=sa_push_subscriptions.organization_id
    and m.user_id=(select auth.uid()) and m.active
 ));

create table if not exists public.sa_push_outbox (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  recipient_id uuid not null,
  source_type text not null check(source_type in ('staff','job')),
  source_id uuid not null,
  title text not null,
  body text not null default '',
  path text not null,
  scheduled_at timestamptz not null default now(),
  attempts integer not null default 0,
  leased_at timestamptz,
  finished_at timestamptz,
  delivery_state text check(delivery_state in ('sent_to_service','no_device','failed')),
  error_code text,
  unique(source_type,source_id,recipient_id)
);
create index if not exists sa_push_outbox_due on public.sa_push_outbox(scheduled_at,leased_at)
 where finished_at is null;
alter table public.sa_push_outbox enable row level security;
revoke all on public.sa_push_outbox from public,anon,authenticated;

-- Only NEW notifications produce queue entries; do not backfill old messages.
create or replace function private.sa_queue_push_notifications()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.recipient_id is not null then
    insert into public.sa_push_outbox(organization_id,recipient_id,source_type,source_id,title,body,path)
    values(new.organization_id,new.recipient_id,'job',new.id,
      left(new.title,120),left(coalesce(new.body,''),512),
      case when new.related_job_id is null then '/#/pranesimai'
        else '/#/darbai/'||new.related_job_id::text end)
    on conflict(source_type,source_id,recipient_id) do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists sa_queue_job_push on public.sa_notifications;
create trigger sa_queue_job_push after insert on public.sa_notifications
for each row execute function private.sa_queue_push_notifications();

create or replace function private.sa_queue_push_staff()
returns trigger language plpgsql security definer set search_path='' as $$
declare msg record;
begin
  select m.title,m.body,m.scheduled_for into msg from public.sa_staff_messages m
  where m.id=new.message_id and m.organization_id=new.organization_id;
  if found then
    insert into public.sa_push_outbox(organization_id,recipient_id,source_type,source_id,title,body,path,scheduled_at)
    values(new.organization_id,new.recipient_id,'staff',new.id,left(msg.title,120),left(msg.body,512),
      '/#/pranesimai',msg.scheduled_for)
    on conflict(source_type,source_id,recipient_id) do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists sa_queue_staff_push on public.sa_staff_message_receipts;
create trigger sa_queue_staff_push after insert on public.sa_staff_message_receipts
for each row execute function private.sa_queue_push_staff();

-- Lease due outbox rows, never expose this operation to ordinary authenticated clients.
create or replace function public.sa_push_claim_due(p_limit integer default 20,p_org uuid default null)
returns setof public.sa_push_outbox
language plpgsql security definer set search_path='' as $$
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'SERVICE_ONLY' using errcode='42501';
  end if;
  return query
  with candidate as (
    select o.id from public.sa_push_outbox o
    where o.finished_at is null and o.scheduled_at<=now() and o.attempts<5
      and (p_org is null or o.organization_id=p_org)
      and (o.leased_at is null or o.leased_at<now()-interval '3 minutes')
    order by o.scheduled_at,o.id limit greatest(1,least(p_limit,50))
    for update skip locked
  )
  update public.sa_push_outbox o set leased_at=now(),attempts=o.attempts+1
  from candidate c where o.id=c.id returning o.*;
end;
$$;
create or replace function public.sa_push_finish(p_id uuid,p_state text,p_error text default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare changed uuid;
begin
  if (select auth.role()) <> 'service_role' or p_state not in ('sent_to_service','no_device','failed')
  then raise exception 'SERVICE_ONLY' using errcode='42501';end if;
  update public.sa_push_outbox o set
    finished_at=case when p_state='failed' and o.attempts<5 then null else now() end,
    leased_at=null,
    delivery_state=p_state,error_code=left(coalesce(p_error,''),100)
  where o.id=p_id and o.finished_at is null
  returning o.id into changed;
  return changed is not null;
end;
$$;
revoke all on function public.sa_push_claim_due(integer,uuid) from public,anon,authenticated;
revoke all on function public.sa_push_finish(uuid,text,text) from public,anon,authenticated;
grant execute on function public.sa_push_claim_due(integer,uuid) to service_role;
grant execute on function public.sa_push_finish(uuid,text,text) to service_role;
commit;
