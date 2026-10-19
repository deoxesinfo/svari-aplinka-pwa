-- Švari Aplinka V2.3.20.1: server-generated VAPID keypair stored in Supabase Vault,
-- plus protected cron-driven delivery, without client secrets or paid providers.
-- No existing data/photo/job/message deletion. No Push until a user opts in on a device.
begin;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Only Edge Function service_role can read encrypted keypair.
create or replace function public.sa_push_get_vapid()
returns table(public_key text,private_key text)
language plpgsql security definer set search_path=''
as $body$
begin
 if (select auth.role()) is distinct from 'service_role' then
   raise exception 'SERVICE_ONLY' using errcode='42501';
 end if;
 return query
 select
  max(case when name='sa_vapid_public' then decrypted_secret end)::text,
  max(case when name='sa_vapid_private' then decrypted_secret end)::text
 from vault.decrypted_secrets
 where name in ('sa_vapid_public','sa_vapid_private');
end
$body$;
revoke all on function public.sa_push_get_vapid() from public,anon,authenticated;
grant execute on function public.sa_push_get_vapid() to service_role;

-- An Edge Function generates the P-256 pair; this stores it once, atomically.
create or replace function public.sa_push_store_vapid(p_public text,p_private text)
returns boolean language plpgsql security definer set search_path=''
as $body$
begin
 if (select auth.role()) is distinct from 'service_role' then
   raise exception 'SERVICE_ONLY' using errcode='42501';
 end if;
 if p_public !~ '^[A-Za-z0-9_-]{87}$' or p_private !~ '^[A-Za-z0-9_-]{43}$'
 then raise exception 'INVALID_VAPID' using errcode='22023'; end if;
 perform pg_catalog.pg_advisory_xact_lock(23202001);
 if exists (select 1 from vault.secrets where name in ('sa_vapid_public','sa_vapid_private'))
 then return false; end if;
 perform vault.create_secret(p_public,'sa_vapid_public','ŠA Web Push public VAPID key');
 perform vault.create_secret(p_private,'sa_vapid_private','ŠA Web Push private VAPID key');
 return true;
end
$body$;
revoke all on function public.sa_push_store_vapid(text,text) from public,anon,authenticated;
grant execute on function public.sa_push_store_vapid(text,text) to service_role;

-- Register the Edge Function's existing service token ONLY from the Edge server.
-- Never copy this token into the browser, GitHub, or the chat.
create or replace function public.sa_push_register_scheduler(p_service_key text,p_edge_url text)
returns boolean language plpgsql security definer set search_path=''
as $body$
begin
 if (select auth.role()) is distinct from 'service_role' then
   raise exception 'SERVICE_ONLY' using errcode='42501';
 end if;
 if p_service_key is null or length(p_service_key) < 20 or length(p_service_key)>4096
   or p_edge_url !~ '^https://[a-z0-9-]+[.]supabase[.]co/functions/v1/sa-push-dispatch$'
 then raise exception 'INVALID_SCHEDULER_CONFIG' using errcode='22023'; end if;
 perform pg_catalog.pg_advisory_xact_lock(23202002);
 if not exists (select 1 from vault.secrets where name='sa_push_scheduler_service_key') then
   perform vault.create_secret(p_service_key,'sa_push_scheduler_service_key','ŠA cron->Edge authorization');
 end if;
 if not exists (select 1 from vault.secrets where name='sa_push_scheduler_endpoint') then
   perform vault.create_secret(p_edge_url,'sa_push_scheduler_endpoint','ŠA protected Edge URL');
 end if;
 return true;
end
$body$;
revoke all on function public.sa_push_register_scheduler(text,text) from public,anon,authenticated;
grant execute on function public.sa_push_register_scheduler(text,text) to service_role;

-- Called by pg_cron as DB administrator. Ordinary logged-in users lack EXECUTE.
create or replace function public.sa_push_schedule_tick()
returns boolean language plpgsql security definer set search_path=''
as $body$
declare service_token text; edge_url text; pending bigint;
begin
 select decrypted_secret into service_token from vault.decrypted_secrets
  where name='sa_push_scheduler_service_key';
 select decrypted_secret into edge_url from vault.decrypted_secrets
  where name='sa_push_scheduler_endpoint';
 if service_token is null or edge_url is null then return false; end if;
 -- Avoid HTTP requests when no due message exists.
 select count(*) into pending from public.sa_push_outbox
  where finished_at is null and scheduled_at<=now() and attempts<5
    and (leased_at is null or leased_at<now()-interval '3 minutes');
 if pending=0 then return true; end if;
 perform net.http_post(
   url:=edge_url,
   body:='{"action":"scheduler"}'::jsonb,
   headers:=jsonb_build_object('Content-Type','application/json',
     'Authorization','Bearer '||service_token,'apikey',service_token),
   timeout_milliseconds:=15000
 );
 return true;
end
$body$;
revoke all on function public.sa_push_schedule_tick() from public,anon,authenticated;
-- Schedule DB-internal minute checks. This does not send anything unless due queue exists
-- AND the service-side credentials have been registered securely in Vault.
select cron.schedule('sa-push-dispatch-minute','* * * * *','select public.sa_push_schedule_tick();');
commit;
