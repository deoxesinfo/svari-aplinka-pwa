-- Švari Aplinka V2.3.10 – additive worker job/photo permissions, GPS evidence
-- Preserves ALL rows. No accounts invited or auto-assigned. Run once after QA.
BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS sa_photo_verified_sha_org_unique
  ON public.sa_photo_metadata (organization_id, ((data->>'sha256')))
  WHERE data->>'proofMode'='gps_live' AND length(data->>'sha256')=64;

DROP POLICY IF EXISTS sa_photos_worker_assigned_gps_insert ON public.sa_photo_metadata;
CREATE POLICY sa_photos_worker_assigned_gps_insert ON public.sa_photo_metadata
  FOR INSERT TO authenticated WITH CHECK (
    private.sa_my_role(organization_id)='worker'
    AND job_id IS NOT NULL
    AND data->>'proofMode'='gps_live'
    AND data->>'sha256' ~ '^[0-9a-f]{64}$'
    AND (data->>'gpsVerifiedAt') IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.sa_jobs j
      WHERE j.id=job_id AND j.organization_id=organization_id
        AND j.address_id=address_id
        AND j.assigned_user_id=(SELECT auth.uid())
        AND COALESCE(j.data->>'archivedAt','')=''
        AND COALESCE(j.data->>'deletedAt','')=''
    )
  );

-- Work completion is a narrow RPC: employees cannot UPDATE all job JSON.
-- The function never accepts a client-supplied completion timestamp.
CREATE OR REPLACE FUNCTION public.sa_complete_assigned_job(p_org uuid,p_job uuid,p_note text DEFAULT '')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_job public.sa_jobs%ROWTYPE;
DECLARE v_photo_count integer;
DECLARE v_stamp timestamptz := clock_timestamp();
BEGIN
  IF private.sa_my_role(p_org) <> 'worker' THEN
    RAISE EXCEPTION 'NOT_A_WORKER' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_job FROM public.sa_jobs
   WHERE id=p_job AND organization_id=p_org AND assigned_user_id=(SELECT auth.uid())
   FOR UPDATE;
  IF NOT FOUND OR COALESCE(v_job.data->>'archivedAt','') <> ''
        OR COALESCE(v_job.data->>'deletedAt','') <> '' THEN
    RAISE EXCEPTION 'JOB_NOT_ASSIGNED' USING ERRCODE='42501';
  END IF;
  IF length(COALESCE(p_note,''))>1200 THEN
    RAISE EXCEPTION 'NOTE_TOO_LONG' USING ERRCODE='22001';
  END IF;
  IF v_job.data->>'status' = 'atlikta' THEN
    RETURN true;
  END IF;
  -- Requires a work photo with server-recorded GPS evidence. Employee records are RLS-restricted; browser coordinates themselves are not tamper-proof.
  SELECT count(*) INTO v_photo_count FROM public.sa_photo_metadata p
   WHERE p.organization_id=p_org AND p.job_id=p_job
     AND p.data->>'proofMode'='gps_live'
     AND p.created_at >= v_stamp - interval '24 hours';
  IF v_photo_count<1 THEN RAISE EXCEPTION 'GPS_PHOTO_REQUIRED' USING ERRCODE='23514'; END IF;
  UPDATE public.sa_jobs
   SET data = jsonb_set(
     jsonb_set(
       jsonb_set(
         jsonb_set(data,'{status}','"atlikta"'::jsonb,true),
         '{completedAt}',to_jsonb(to_char(v_stamp AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),true
       ),
       '{history}',COALESCE(data->'history','[]'::jsonb)
         || jsonb_build_array(jsonb_build_object('at',v_stamp,'text','Darbas užbaigtas po naujos GPS patikros')),true
     ),
     '{comments}',COALESCE(data->'comments','[]'::jsonb)
       || CASE WHEN length(trim(COALESCE(p_note,'')))>0
         THEN jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'at',v_stamp,'text',trim(p_note)))
         ELSE '[]'::jsonb END,true
   ),updated_at=v_stamp
   WHERE id=p_job AND organization_id=p_org;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.sa_complete_assigned_job(uuid,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.sa_complete_assigned_job(uuid,uuid,text) TO authenticated;
COMMIT;
