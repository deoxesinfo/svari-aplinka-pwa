-- DRAFT ONLY / NOT APPLIED. Švari Aplinka PWA (mbinhbascpeupnxrvidk).
-- Requires separate explicit APPROVE before applying. No existing data changes here.
-- Reviewed against live schema 2026-10-19: sa_photo_metadata has RLS SELECT,
-- INSERT, UPDATE, but no DELETE; no existing custom trigger on photo metadata.
BEGIN;

-- Only active organization admins can remove private photo metadata.
CREATE POLICY photos_admin_delete
ON public.sa_photo_metadata
FOR DELETE TO authenticated
USING (private.sa_my_role(organization_id) = 'admin');

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
-- 1) SQL/migration review and database backup.
-- 2) Authenticated admin and non-admin RLS verification, concurrent upload tests.
-- 3) R2/DB reconciliation after partial failures; deletion requires its own safe flow.
-- 4) GPS-protected uploads remain OFF until trusted server-side verification.
