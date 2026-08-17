ALTER TABLE public.connection_instances
  ADD COLUMN IF NOT EXISTS verification_state text NOT NULL DEFAULT 'NOT_VERIFIED',
  ADD COLUMN IF NOT EXISTS verification_reason text,
  ADD COLUMN IF NOT EXISTS verification_evidence jsonb,
  ADD COLUMN IF NOT EXISTS verified_by uuid,
  ADD COLUMN IF NOT EXISTS last_verification_at timestamptz;

ALTER TABLE public.connection_instances
  DROP CONSTRAINT IF EXISTS connection_instances_verification_state_check;

ALTER TABLE public.connection_instances
  ADD CONSTRAINT connection_instances_verification_state_check
  CHECK (verification_state = ANY (ARRAY['NOT_VERIFIED'::text, 'PARTIAL'::text, 'VERIFIED'::text, 'FAILED'::text]));

UPDATE public.connection_instances
   SET verification_state = 'PARTIAL'
 WHERE platform_binding_state = 'LINKED'
   AND verification_state = 'NOT_VERIFIED';