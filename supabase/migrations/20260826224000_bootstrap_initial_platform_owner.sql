-- One-time platform-owner bootstrap for the existing AURA administrator.
-- Security properties:
--   * runs only when no unexpired global owner exists;
--   * requires exactly one verified auth.users email match;
--   * never exposes owner in the ordinary admin grant UI;
--   * writes an immutable audit record in the same transaction;
--   * becomes a no-op after an owner exists.
DO $bootstrap$
DECLARE
  target_user_id uuid;
  target_count integer;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE role = 'owner'::public.app_role
      AND COALESCE(scope, 'global') = 'global'
      AND (expires_at IS NULL OR expires_at > now())
  ) THEN
    RAISE NOTICE 'A global platform owner already exists; bootstrap skipped.';
    RETURN;
  END IF;

  SELECT count(*), min(id)
    INTO target_count, target_user_id
  FROM auth.users
  WHERE lower(email) = lower('edouard@m2mtechconnect.com')
    AND email_confirmed_at IS NOT NULL
    AND deleted_at IS NULL;

  IF target_count <> 1 OR target_user_id IS NULL THEN
    RAISE EXCEPTION
      'Owner bootstrap requires exactly one confirmed, non-deleted auth user for the configured email; found %.',
      target_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = target_user_id
      AND role = 'owner'::public.app_role
      AND COALESCE(scope, 'global') = 'global'
  ) THEN
    INSERT INTO public.user_roles (
      user_id,
      role,
      scope,
      granted_by,
      granted_at,
      expires_at
    )
    VALUES (
      target_user_id,
      'owner'::public.app_role,
      'global',
      target_user_id,
      now(),
      NULL
    );
  END IF;

  INSERT INTO public.audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    details
  )
  VALUES (
    target_user_id,
    'platform_owner_bootstrapped',
    'user_role',
    target_user_id::text,
    jsonb_build_object(
      'role', 'owner',
      'scope', 'global',
      'reason', 'Initial platform-owner bootstrap for controlled QA tenant provisioning',
      'migration', '20260826224000_bootstrap_initial_platform_owner',
      'automatic_repeat', false
    )
  );
END
$bootstrap$;
