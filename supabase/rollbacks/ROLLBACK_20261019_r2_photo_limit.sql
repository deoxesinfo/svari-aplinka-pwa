-- Supabase Švari Aplinka PWA (mbinhbascpeupnxrvidk)
-- Rollback for applied 20261019074937 only, NOT EXECUTED.
-- Run ONLY after a separate explicit approval if reverting DB STEP 1.
BEGIN;
DROP TRIGGER IF EXISTS sa_photo_insert_guard_trg ON public.sa_photo_metadata;
DROP FUNCTION IF EXISTS private.sa_photo_insert_guard();
COMMIT;
-- Existing RLS policies, DELETE permissions, photo metadata, jobs and addresses are unaffected.
