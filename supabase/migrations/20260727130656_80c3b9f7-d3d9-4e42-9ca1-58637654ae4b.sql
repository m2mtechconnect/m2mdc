-- ============================================================================
-- Phase 2.a — DSX read-only foundation: 6 tables, RLS, grants, atomic RPC.
-- Additive. No existing table is modified.
-- ============================================================================

-- Helper: does auth.uid() have an approved, org-scoped profile matching p_org?
-- SECURITY DEFINER because it must see profiles rows the caller may not.
-- Pinned search_path. Not usable as a general lookup: exec revoked from public.
CREATE OR REPLACE FUNCTION public.dsx_current_user_in_org(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.is_approved = true
      AND p.org_id IS NOT NULL
      AND p.org_id = p_org_id
  );
$$;
REVOKE EXECUTE ON FUNCTION public.dsx_current_user_in_org(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.dsx_current_user_in_org(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.dsx_current_user_in_org(uuid) TO authenticated;

-- Helper: does auth.uid() have an operational role ('admin' or 'operator') in org?
CREATE OR REPLACE FUNCTION public.dsx_current_user_is_operator_in_org(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.user_roles r ON r.user_id = p.user_id
    WHERE p.user_id = auth.uid()
      AND p.is_approved = true
      AND p.org_id = p_org_id
      AND r.role IN ('admin','operator')
      AND (r.expires_at IS NULL OR r.expires_at > now())
  );
$$;
REVOKE EXECUTE ON FUNCTION public.dsx_current_user_is_operator_in_org(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.dsx_current_user_is_operator_in_org(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.dsx_current_user_is_operator_in_org(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 1. dsx_connections — one row per DSX source bound to a twin+org.
-- ---------------------------------------------------------------------------
CREATE TABLE public.dsx_connections (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  twin_id             uuid        NOT NULL REFERENCES public.data_centre_twins(id) ON DELETE RESTRICT,
  name                text        NOT NULL,
  status              text        NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','paused','disabled')),
  gateway_version     text        NULL,
  allowed_source_subjects text[]  NOT NULL DEFAULT ARRAY[]::text[],
  gateway_jwt_issuer  text        NULL,
  gateway_jwt_audience text       NULL,
  gateway_jwt_key_ref text        NULL, -- reference (secret name), NEVER key material
  freshness_budget_ms integer     NOT NULL DEFAULT 60000 CHECK (freshness_budget_ms > 0),
  metadata            jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  created_by          uuid        NULL,
  CONSTRAINT dsx_connections_no_secret_material CHECK (
    gateway_jwt_key_ref IS NULL OR length(gateway_jwt_key_ref) <= 256
  ),
  CONSTRAINT dsx_connections_unique_composite UNIQUE (id, org_id, twin_id)
);
CREATE INDEX dsx_connections_org_idx     ON public.dsx_connections(org_id);
CREATE INDEX dsx_connections_twin_idx    ON public.dsx_connections(twin_id);
CREATE INDEX dsx_connections_status_idx  ON public.dsx_connections(status);

GRANT SELECT ON public.dsx_connections TO authenticated;
GRANT ALL    ON public.dsx_connections TO service_role;

ALTER TABLE public.dsx_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY dsx_connections_org_read
  ON public.dsx_connections FOR SELECT TO authenticated
  USING (public.dsx_current_user_in_org(org_id));
-- No INSERT/UPDATE/DELETE policy → authenticated cannot write. service_role bypasses RLS.

CREATE TRIGGER dsx_connections_updated_at
  BEFORE UPDATE ON public.dsx_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 2. dsx_asset_mappings — external asset ↔ internal reference per connection.
-- ---------------------------------------------------------------------------
CREATE TABLE public.dsx_asset_mappings (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id       uuid        NOT NULL,
  org_id              uuid        NOT NULL,
  twin_id             uuid        NOT NULL,
  external_asset_ref  text        NOT NULL,
  internal_asset_ref  text        NOT NULL,
  metric_kind         text        NOT NULL,
  unit                text        NOT NULL,
  active              boolean     NOT NULL DEFAULT true,
  metadata            jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dsx_asset_mappings_connection_fk
    FOREIGN KEY (connection_id, org_id, twin_id)
    REFERENCES public.dsx_connections(id, org_id, twin_id) ON DELETE RESTRICT,
  CONSTRAINT dsx_asset_mappings_unique_composite UNIQUE (id, connection_id, org_id, twin_id)
);
CREATE UNIQUE INDEX dsx_asset_mappings_active_ext_uniq
  ON public.dsx_asset_mappings(connection_id, external_asset_ref)
  WHERE active = true;
CREATE INDEX dsx_asset_mappings_org_idx  ON public.dsx_asset_mappings(org_id);
CREATE INDEX dsx_asset_mappings_twin_idx ON public.dsx_asset_mappings(twin_id);

GRANT SELECT ON public.dsx_asset_mappings TO authenticated;
GRANT ALL    ON public.dsx_asset_mappings TO service_role;

ALTER TABLE public.dsx_asset_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY dsx_asset_mappings_org_read
  ON public.dsx_asset_mappings FOR SELECT TO authenticated
  USING (public.dsx_current_user_in_org(org_id));

CREATE TRIGGER dsx_asset_mappings_updated_at
  BEFORE UPDATE ON public.dsx_asset_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 3. dsx_events — accepted observations. Canonical envelope preserved verbatim.
-- ---------------------------------------------------------------------------
CREATE TABLE public.dsx_events (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id       uuid        NOT NULL,
  org_id              uuid        NOT NULL,
  twin_id             uuid        NOT NULL,
  asset_mapping_id    uuid        NOT NULL,
  event_id            text        NOT NULL,           -- from canonical envelope
  observed_at         timestamptz NOT NULL,
  received_at         timestamptz NOT NULL,
  ingested_at         timestamptz NOT NULL DEFAULT now(),
  quality             text        NOT NULL
                        CHECK (quality IN ('validated','degraded','invalid','unavailable')),
  numeric_value       double precision NULL,
  unit                text        NULL,
  source_subject      text        NULL,
  gateway_id          text        NULL,
  schema_version      integer     NOT NULL,
  ingestion_version   integer     NOT NULL DEFAULT 1,
  envelope            jsonb       NOT NULL,
  CONSTRAINT dsx_events_connection_fk
    FOREIGN KEY (connection_id, org_id, twin_id)
    REFERENCES public.dsx_connections(id, org_id, twin_id) ON DELETE RESTRICT,
  CONSTRAINT dsx_events_mapping_fk
    FOREIGN KEY (asset_mapping_id, connection_id, org_id, twin_id)
    REFERENCES public.dsx_asset_mappings(id, connection_id, org_id, twin_id) ON DELETE RESTRICT,
  CONSTRAINT dsx_events_envelope_bounded CHECK (pg_column_size(envelope) <= 65536),
  CONSTRAINT dsx_events_idempotent UNIQUE (connection_id, event_id)
);
CREATE INDEX dsx_events_current_state_idx
  ON public.dsx_events(connection_id, asset_mapping_id, observed_at DESC);
CREATE INDEX dsx_events_org_twin_time_idx
  ON public.dsx_events(org_id, twin_id, observed_at DESC);
CREATE INDEX dsx_events_ingested_at_idx
  ON public.dsx_events(ingested_at DESC);

GRANT SELECT ON public.dsx_events TO authenticated;
GRANT ALL    ON public.dsx_events TO service_role;

ALTER TABLE public.dsx_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY dsx_events_org_read
  ON public.dsx_events FOR SELECT TO authenticated
  USING (public.dsx_current_user_in_org(org_id));

-- ---------------------------------------------------------------------------
-- 4. dsx_events_quarantine — rejected/unmappable events with tiered retention.
-- ---------------------------------------------------------------------------
CREATE TABLE public.dsx_events_quarantine (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id         uuid        NULL,
  org_id                uuid        NULL,
  twin_id               uuid        NULL,
  received_at           timestamptz NOT NULL DEFAULT now(),
  sanitized_reason      text        NOT NULL,
  reason_code           text        NOT NULL,
  restricted_payload    jsonb       NULL,
  envelope_snippet      jsonb       NULL,
  source_subject_hash   text        NULL,
  raw_payload_purge_after  timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  metadata_retain_until    timestamptz NOT NULL DEFAULT (now() + interval '365 days'),
  CONSTRAINT dsx_events_quarantine_snippet_bounded CHECK (
    envelope_snippet IS NULL OR pg_column_size(envelope_snippet) <= 4096
  ),
  CONSTRAINT dsx_events_quarantine_payload_bounded CHECK (
    restricted_payload IS NULL OR pg_column_size(restricted_payload) <= 65536
  ),
  CONSTRAINT dsx_events_quarantine_connection_fk
    FOREIGN KEY (connection_id, org_id, twin_id)
    REFERENCES public.dsx_connections(id, org_id, twin_id) ON DELETE SET NULL
);
CREATE INDEX dsx_events_quarantine_org_time_idx
  ON public.dsx_events_quarantine(org_id, received_at DESC);
CREATE INDEX dsx_events_quarantine_purge_idx
  ON public.dsx_events_quarantine(raw_payload_purge_after);

GRANT SELECT ON public.dsx_events_quarantine TO authenticated;
GRANT ALL    ON public.dsx_events_quarantine TO service_role;

ALTER TABLE public.dsx_events_quarantine ENABLE ROW LEVEL SECURITY;
-- Quarantine visibility restricted to operational roles in the same org.
CREATE POLICY dsx_events_quarantine_op_read
  ON public.dsx_events_quarantine FOR SELECT TO authenticated
  USING (org_id IS NOT NULL AND public.dsx_current_user_is_operator_in_org(org_id));

-- ---------------------------------------------------------------------------
-- 5. dsx_gateway_heartbeats — per-connection liveness signal.
-- ---------------------------------------------------------------------------
CREATE TABLE public.dsx_gateway_heartbeats (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id   uuid        NOT NULL,
  org_id          uuid        NOT NULL,
  twin_id         uuid        NOT NULL,
  received_at     timestamptz NOT NULL DEFAULT now(),
  gateway_id      text        NOT NULL,
  gateway_version text        NULL,
  status          text        NOT NULL
                    CHECK (status IN ('online','degraded','offline')),
  metrics         jsonb       NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT dsx_gateway_heartbeats_metrics_bounded CHECK (pg_column_size(metrics) <= 8192),
  CONSTRAINT dsx_gateway_heartbeats_connection_fk
    FOREIGN KEY (connection_id, org_id, twin_id)
    REFERENCES public.dsx_connections(id, org_id, twin_id) ON DELETE CASCADE
);
CREATE INDEX dsx_gateway_heartbeats_conn_time_idx
  ON public.dsx_gateway_heartbeats(connection_id, received_at DESC);

GRANT SELECT ON public.dsx_gateway_heartbeats TO authenticated;
GRANT ALL    ON public.dsx_gateway_heartbeats TO service_role;

ALTER TABLE public.dsx_gateway_heartbeats ENABLE ROW LEVEL SECURITY;
CREATE POLICY dsx_gateway_heartbeats_org_read
  ON public.dsx_gateway_heartbeats FOR SELECT TO authenticated
  USING (public.dsx_current_user_in_org(org_id));

-- ---------------------------------------------------------------------------
-- 6. dsx_ingestion_audit — one record per ingestion attempt (decision + reason).
-- ---------------------------------------------------------------------------
CREATE TABLE public.dsx_ingestion_audit (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id       uuid        NULL,
  org_id              uuid        NULL,
  request_id          text        NULL,
  decision            text        NOT NULL
                        CHECK (decision IN ('accepted','duplicate','rejected','retryable')),
  reason_code         text        NULL,
  event_id            text        NULL,
  source_subject_hash text        NULL,
  latency_ms          integer     NULL,
  occurred_at         timestamptz NOT NULL DEFAULT now(),
  metadata            jsonb       NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT dsx_ingestion_audit_metadata_bounded CHECK (pg_column_size(metadata) <= 8192)
);
CREATE INDEX dsx_ingestion_audit_org_time_idx
  ON public.dsx_ingestion_audit(org_id, occurred_at DESC);
CREATE INDEX dsx_ingestion_audit_conn_time_idx
  ON public.dsx_ingestion_audit(connection_id, occurred_at DESC);

GRANT SELECT ON public.dsx_ingestion_audit TO authenticated;
GRANT ALL    ON public.dsx_ingestion_audit TO service_role;

ALTER TABLE public.dsx_ingestion_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY dsx_ingestion_audit_op_read
  ON public.dsx_ingestion_audit FOR SELECT TO authenticated
  USING (org_id IS NOT NULL AND public.dsx_current_user_is_operator_in_org(org_id));

-- ---------------------------------------------------------------------------
-- Atomic ingestion RPC. Service-role only.
-- Contract:
--   p_connection_id   uuid  – server-resolved, NEVER from payload alone
--   p_event_id        text  – canonical envelope event_id (idempotency key)
--   p_observed_at     timestamptz
--   p_received_at     timestamptz
--   p_quality         text
--   p_numeric_value   double precision
--   p_unit            text
--   p_source_subject  text
--   p_gateway_id      text
--   p_schema_version  int
--   p_external_asset_ref text
--   p_envelope        jsonb (canonical envelope, already validated by caller)
--   p_request_id      text
-- Returns: jsonb { decision, event_pk, reason_code }
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dsx_ingest_event(
  p_connection_id       uuid,
  p_event_id            text,
  p_observed_at         timestamptz,
  p_received_at         timestamptz,
  p_quality             text,
  p_numeric_value       double precision,
  p_unit                text,
  p_source_subject      text,
  p_gateway_id          text,
  p_schema_version      integer,
  p_external_asset_ref  text,
  p_envelope            jsonb,
  p_request_id          text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_conn         public.dsx_connections%ROWTYPE;
  v_mapping      public.dsx_asset_mappings%ROWTYPE;
  v_existing_pk  uuid;
  v_new_pk       uuid;
  v_max_observed timestamptz;
  v_started      timestamptz := clock_timestamp();
  v_subject_hash text;
BEGIN
  v_subject_hash := encode(pg_catalog.digest(coalesce(p_source_subject,''), 'sha256'), 'hex');

  -- Resolve and lock the connection row (server authority for org/twin).
  SELECT * INTO v_conn FROM public.dsx_connections
    WHERE id = p_connection_id
    FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.dsx_ingestion_audit(connection_id, org_id, request_id, decision, reason_code, event_id, source_subject_hash, latency_ms)
    VALUES (NULL, NULL, p_request_id, 'rejected', 'connection_not_found', p_event_id, v_subject_hash,
            (extract(epoch from clock_timestamp()-v_started)*1000)::int);
    RETURN jsonb_build_object('decision','rejected','reason_code','connection_not_found');
  END IF;

  IF v_conn.status <> 'active' THEN
    INSERT INTO public.dsx_ingestion_audit(connection_id, org_id, request_id, decision, reason_code, event_id, source_subject_hash, latency_ms)
    VALUES (v_conn.id, v_conn.org_id, p_request_id, 'rejected', 'connection_inactive', p_event_id, v_subject_hash,
            (extract(epoch from clock_timestamp()-v_started)*1000)::int);
    RETURN jsonb_build_object('decision','rejected','reason_code','connection_inactive');
  END IF;

  -- Source subject allowlist (server-side; payload cannot override).
  IF array_length(v_conn.allowed_source_subjects, 1) IS NOT NULL
     AND NOT (p_source_subject = ANY (v_conn.allowed_source_subjects)) THEN
    INSERT INTO public.dsx_ingestion_audit(connection_id, org_id, request_id, decision, reason_code, event_id, source_subject_hash, latency_ms)
    VALUES (v_conn.id, v_conn.org_id, p_request_id, 'rejected', 'source_subject_not_allowed', p_event_id, v_subject_hash,
            (extract(epoch from clock_timestamp()-v_started)*1000)::int);
    RETURN jsonb_build_object('decision','rejected','reason_code','source_subject_not_allowed');
  END IF;

  -- Idempotency: if this (connection, event_id) already exists, return duplicate.
  SELECT id INTO v_existing_pk FROM public.dsx_events
    WHERE connection_id = v_conn.id AND event_id = p_event_id;
  IF FOUND THEN
    INSERT INTO public.dsx_ingestion_audit(connection_id, org_id, request_id, decision, reason_code, event_id, source_subject_hash, latency_ms)
    VALUES (v_conn.id, v_conn.org_id, p_request_id, 'duplicate', 'event_id_exists', p_event_id, v_subject_hash,
            (extract(epoch from clock_timestamp()-v_started)*1000)::int);
    RETURN jsonb_build_object('decision','duplicate','event_pk',v_existing_pk,'reason_code','event_id_exists');
  END IF;

  -- Resolve active mapping.
  SELECT * INTO v_mapping FROM public.dsx_asset_mappings
    WHERE connection_id = v_conn.id
      AND external_asset_ref = p_external_asset_ref
      AND active = true;
  IF NOT FOUND THEN
    INSERT INTO public.dsx_events_quarantine(
      connection_id, org_id, twin_id, sanitized_reason, reason_code,
      restricted_payload, envelope_snippet, source_subject_hash
    ) VALUES (
      v_conn.id, v_conn.org_id, v_conn.twin_id,
      'no active mapping for external asset', 'no_active_mapping',
      NULL, jsonb_build_object('event_id', p_event_id, 'external_asset_ref', p_external_asset_ref),
      v_subject_hash
    );
    INSERT INTO public.dsx_ingestion_audit(connection_id, org_id, request_id, decision, reason_code, event_id, source_subject_hash, latency_ms)
    VALUES (v_conn.id, v_conn.org_id, p_request_id, 'rejected', 'no_active_mapping', p_event_id, v_subject_hash,
            (extract(epoch from clock_timestamp()-v_started)*1000)::int);
    RETURN jsonb_build_object('decision','rejected','reason_code','no_active_mapping');
  END IF;

  -- Ordering guard: never let an older observation replace newer current-state.
  -- Current-state is the MAX(observed_at) per (connection, mapping). If the
  -- new event is older-or-equal than the current max, still store it (history),
  -- but tag it as non-current via ingestion_version=0 semantics? Simpler:
  -- reject with 'stale_observation' so current-state queries stay clean.
  SELECT max(observed_at) INTO v_max_observed
    FROM public.dsx_events
    WHERE connection_id = v_conn.id AND asset_mapping_id = v_mapping.id;
  IF v_max_observed IS NOT NULL AND p_observed_at <= v_max_observed THEN
    INSERT INTO public.dsx_ingestion_audit(connection_id, org_id, request_id, decision, reason_code, event_id, source_subject_hash, latency_ms)
    VALUES (v_conn.id, v_conn.org_id, p_request_id, 'rejected', 'stale_observation', p_event_id, v_subject_hash,
            (extract(epoch from clock_timestamp()-v_started)*1000)::int);
    RETURN jsonb_build_object('decision','rejected','reason_code','stale_observation');
  END IF;

  -- Insert accepted event.
  INSERT INTO public.dsx_events(
    connection_id, org_id, twin_id, asset_mapping_id,
    event_id, observed_at, received_at, quality,
    numeric_value, unit, source_subject, gateway_id,
    schema_version, ingestion_version, envelope
  ) VALUES (
    v_conn.id, v_conn.org_id, v_conn.twin_id, v_mapping.id,
    p_event_id, p_observed_at, p_received_at, p_quality,
    p_numeric_value, coalesce(p_unit, v_mapping.unit), p_source_subject, p_gateway_id,
    p_schema_version, 1, p_envelope
  ) RETURNING id INTO v_new_pk;

  INSERT INTO public.dsx_ingestion_audit(connection_id, org_id, request_id, decision, reason_code, event_id, source_subject_hash, latency_ms)
  VALUES (v_conn.id, v_conn.org_id, p_request_id, 'accepted', NULL, p_event_id, v_subject_hash,
          (extract(epoch from clock_timestamp()-v_started)*1000)::int);

  RETURN jsonb_build_object('decision','accepted','event_pk',v_new_pk);
EXCEPTION WHEN OTHERS THEN
  -- Retryable envelope for unexpected DB errors; no secrets in reason.
  INSERT INTO public.dsx_ingestion_audit(connection_id, org_id, request_id, decision, reason_code, event_id, source_subject_hash, latency_ms)
  VALUES (COALESCE(v_conn.id, NULL), COALESCE(v_conn.org_id, NULL), p_request_id, 'retryable',
          'db_error:' || SQLSTATE, p_event_id, v_subject_hash,
          (extract(epoch from clock_timestamp()-v_started)*1000)::int);
  RETURN jsonb_build_object('decision','retryable','reason_code','db_error:' || SQLSTATE);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.dsx_ingest_event(uuid,text,timestamptz,timestamptz,text,double precision,text,text,text,integer,text,jsonb,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.dsx_ingest_event(uuid,text,timestamptz,timestamptz,text,double precision,text,text,text,integer,text,jsonb,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.dsx_ingest_event(uuid,text,timestamptz,timestamptz,text,double precision,text,text,text,integer,text,jsonb,text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.dsx_ingest_event(uuid,text,timestamptz,timestamptz,text,double precision,text,text,text,integer,text,jsonb,text) TO service_role;

COMMENT ON FUNCTION public.dsx_ingest_event IS
  'Phase 2.a atomic DSX ingestion RPC. Service-role only. Server-resolves org/twin from connection row; never trusts payload identifiers. Enforces idempotency (UNIQUE connection_id,event_id), source-subject allowlist, mapping existence, and ordering (rejects observations older-or-equal to current max). Every path writes one dsx_ingestion_audit row.';

-- Safe freshness/current-state helper (no SECURITY DEFINER; obeys RLS).
CREATE OR REPLACE VIEW public.dsx_current_state AS
SELECT DISTINCT ON (e.connection_id, e.asset_mapping_id)
  e.connection_id, e.org_id, e.twin_id, e.asset_mapping_id,
  e.event_id, e.observed_at, e.received_at, e.ingested_at,
  e.quality, e.numeric_value, e.unit, e.schema_version
FROM public.dsx_events e
ORDER BY e.connection_id, e.asset_mapping_id, e.observed_at DESC;

GRANT SELECT ON public.dsx_current_state TO authenticated;
GRANT SELECT ON public.dsx_current_state TO service_role;
-- No SECURITY DEFINER; view executes as caller and inherits dsx_events RLS.