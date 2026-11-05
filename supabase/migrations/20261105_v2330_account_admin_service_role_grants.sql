-- ŠA V2.3.30: restore least-privilege DML grants needed by the
-- server-side sa-account-admin Supabase Edge Function.
-- This fixes PostgREST 403 (permission denied for table sa_memberships).
-- NEVER grant these privileges to anon or authenticated.
grant select, insert, update on table public.sa_memberships to service_role;
grant select, insert, update on table public.sa_account_directory to service_role;
grant select, insert, update, delete on table public.sa_user_permissions to service_role;
grant insert on table public.sa_account_lifecycle_events to service_role;

-- Ownership/tenant/role restrictions remain enforced by sa-account-admin,
-- which checks the logged-in administrator before using the secret key.
-- RLS remains enabled on all tables. No user or business records are changed.
