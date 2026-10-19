-- MIGRATION SOURCE for approved DB STAGE 1; Cloudflare and PWA remain DRAFT.
-- Švari Aplinka PWA (mbinhbascpeupnxrvidk).
-- DB STEP 1 approved 2026-10-19. Only new trigger/function, no data changes.
-- Reviewed against live schema 2026-10-19: sa_photo_metadata has RLS SELECT,
-- INSERT, UPDATE, but no DELETE; no existing custom trigger on photo metadata.
BEGIN;

-- DELETE RLS policy is deliberately UNCHANGED per 2026-10-19 user approval.
-- This stage only creates a defensive 15-photos-per-job trigger.

-- Serialize concurrent uploads for the same job by locking the parent job.
-- This is needed in addition to the API's optimistic count check.
CREATE FUNCTION private.sa_photo_insert_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
 expected_address uuid;
 photo_count integer;
BEGIN
 IF NEW.job_id IS NULL THEN RETURN NEW; END IF;
 SELECT j.address_id INTO expected_address
 FROM public.sa_jobs AS j
 WHERE j.id = NEW.job_id AND j.organization_id = NEW.organization_id
 FOR UPDATE;
 IF expected_address IS NULL OR NEW.address_id <> expected_address THEN
   RAISE EXCEPTION 'Nuotraukos adresas ir darbas nesutampa';
 END IF;
 SELECT count(*) INTO photo_count
 FROM public.sa_photo_metadata AS p
 WHERE p.organization_id=NEW.organization_id
   AND p.job_id=NEW.job_id
   AND p.id <> NEW.id;
 IF photo_count >= 15 THEN
   RAISE EXCEPTION 'Vienam darbui leidžiama daugiausia 15 nuotraukų';
 END IF;
 RETURN NEW;
END;
$$;

CREATE TRIGGER sa_photo_insert_guard_trg
BEFORE INSERT OR UPDATE OF job_id, organization_id, address_id
ON public.sa_photo_metadata
FOR EACH ROW EXECUTE FUNCTION private.sa_photo_insert_guard();

COMMIT;

-- Deployment prerequisites:
-- 1) Targeted pre-change schema snapshot + reversible DDL saved; full managed backup status unverified.
-- 2) Authenticated admin and non-admin RLS verification, concurrent upload tests.
-- 3) R2/DB reconciliation after partial failures; deletion stays disabled.
-- 4) GPS-protected uploads remain OFF until trusted server-side verification.
