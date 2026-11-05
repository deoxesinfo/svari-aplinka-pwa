-- ŠA V2.3.29: administrative user suspension/deletion lifecycle.
-- Existing business records, memberships, passwords and photo metadata are untouched.
-- Auth user removal is a separate, explicit admin action through the Edge Function.
alter table public.sa_account_directory
  add column if not exists suspended_at timestamptz,
  add column if not exists deleted_at timestamptz,
  add column if not exists state_changed_by uuid;

create table if not exists public.sa_account_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.sa_organizations(id) on delete restrict,
  target_user_id uuid not null,
  actor_user_id uuid not null,
  action text not null check (action in ('suspend','restore','delete','permissions')),
  occurred_at timestamptz not null default now()
);
create index if not exists sa_account_lifecycle_events_org_time_idx
  on public.sa_account_lifecycle_events(organization_id,occurred_at desc);

alter table public.sa_account_lifecycle_events enable row level security;
revoke all on public.sa_account_lifecycle_events from anon,authenticated;
grant select on public.sa_account_lifecycle_events to authenticated;
drop policy if exists sa_account_lifecycle_admin_read on public.sa_account_lifecycle_events;
create policy sa_account_lifecycle_admin_read on public.sa_account_lifecycle_events
  for select to authenticated using (private.sa_my_role(organization_id)='admin');
-- No write policies: only the server-side service role may append lifecycle events.
