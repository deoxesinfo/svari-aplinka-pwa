-- V2.3.10 hardening applied 2026-10-19. Explicit organization/address/job equality.
BEGIN;
DROP POLICY IF EXISTS sa_photos_worker_assigned_gps_insert ON public.sa_photo_metadata;
CREATE POLICY sa_photos_worker_assigned_gps_insert
 ON public.sa_photo_metadata FOR INSERT TO authenticated
 WITH CHECK (
   private.sa_my_role(organization_id)='worker'
   AND job_id IS NOT NULL
   AND data->>'proofMode'='gps_live'
   AND data->>'sha256' ~ '^[0-9a-f]{64}$'
   AND (data->>'gpsVerifiedAt') IS NOT NULL
   AND EXISTS (
     SELECT 1 FROM public.sa_jobs AS j
      WHERE j.id = sa_photo_metadata.job_id
        AND j.organization_id = sa_photo_metadata.organization_id
        AND j.address_id = sa_photo_metadata.address_id
        AND j.assigned_user_id=(SELECT auth.uid())
        AND COALESCE(j.data->>'archivedAt','')=''
        AND COALESCE(j.data->>'deletedAt','')=''
   )
 );
COMMIT;