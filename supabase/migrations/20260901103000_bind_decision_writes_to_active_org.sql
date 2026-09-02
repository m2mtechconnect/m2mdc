-- Decision evidence is server-owned and append-only. The authenticated product
-- path already writes through record-decision, which resolves actor, active
-- organization, role, run scope and hashes before constructing a service-role
-- client. Direct Data API inserts would let a caller choose evidence fields and
-- therefore must not remain an alternate write boundary.

BEGIN;

DROP POLICY IF EXISTS "decision_records_insert_own" ON public.decision_records;
DROP POLICY IF EXISTS decision_records_insert_bound ON public.decision_records;

REVOKE INSERT, UPDATE, DELETE ON public.decision_records FROM authenticated, anon;
GRANT SELECT ON public.decision_records TO authenticated;
GRANT ALL ON public.decision_records TO service_role;

COMMENT ON TABLE public.decision_records IS
  'Canonical append-only human decision log. Authenticated callers read through tenant RLS and write only through the trusted record-decision boundary.';

COMMIT;
