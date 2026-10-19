-- Švari Aplinka V2.3.11: database audit compatibility.
-- This CREATE OR REPLACE was applied to production Supabase via migration
-- sa_v2_3_10_completion_only_own_gps_photos; versioned copy for reproducibility.
-- No data rows are changed.
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
     AND p.data->>'uploadedBy'=(SELECT auth.uid())::text
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
