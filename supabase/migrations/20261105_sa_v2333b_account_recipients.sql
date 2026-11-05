-- ŠA: recipient choices are active, activated accounts in the caller's organization.
-- Maintain the administrator's test recipient label, without generating a fake account.
CREATE OR REPLACE FUNCTION public.sa_list_message_recipients(p_org uuid)
RETURNS TABLE(user_id uuid, display_name text, account_role text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
BEGIN
  IF NOT private.sa_has_permission(p_org,'messages','edit') THEN
    RAISE EXCEPTION 'MESSAGE_EDIT_PERMISSION_REQUIRED' USING ERRCODE='42501';
  END IF;
  RETURN QUERY
  SELECT m.user_id,
    COALESCE(NULLIF(btrim(d.display_name),''),
      NULLIF(btrim(split_part(d.email,'@',1)),''),
      CASE WHEN m.role='admin' THEN 'Administratorius (testas)' ELSE 'Naudotojas' END
    )::text,
    m.role::text
  FROM public.sa_memberships m
  LEFT JOIN public.sa_account_directory d
    ON d.organization_id=m.organization_id AND d.user_id=m.user_id
  WHERE m.organization_id=p_org
    AND m.active
    AND m.role IN ('admin','manager','worker')
    AND d.deleted_at IS NULL
    AND d.suspended_at IS NULL
    AND (d.activation_required IS DISTINCT FROM true OR d.activation_completed_at IS NOT NULL)
  ORDER BY CASE WHEN m.role='admin' THEN 0 ELSE 1 END,2,1;
END;
$function$;

REVOKE ALL ON FUNCTION public.sa_list_message_recipients(uuid) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.sa_list_message_recipients(uuid) TO authenticated;

-- Fix the spelling already approved in the account's profile UI.
UPDATE public.sa_account_directory
SET display_name='Pagrindinis'
WHERE organization_id='ef6edcc2-1c7d-4dd1-8ef2-67c2b5a89bff'::uuid
  AND user_id='5c93305c-982b-49c5-84c9-adc00a001926'::uuid
  AND email='deoxesinfo@gmail.com'
  AND display_name='Pagroindinis'
  AND deleted_at IS NULL;
