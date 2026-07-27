-- pgcrypto lives in the 'extensions' schema on this project, not public.
-- Include it in the pinned search_path and reference digest unqualified.
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
SET search_path = pg_catalog, public, extensions
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
  v_subject_hash := encode(extensions.digest(coalesce(p_source_subject,''), 'sha256'), 'hex');

  SELECT * INTO v_conn FROM public.dsx_connections
    WHERE id = p_connection_id FOR UPDATE;
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

  IF array_length(v_conn.allowed_source_subjects, 1) IS NOT NULL
     AND NOT (p_source_subject = ANY (v_conn.allowed_source_subjects)) THEN
    INSERT INTO public.dsx_ingestion_audit(connection_id, org_id, request_id, decision, reason_code, event_id, source_subject_hash, latency_ms)
    VALUES (v_conn.id, v_conn.org_id, p_request_id, 'rejected', 'source_subject_not_allowed', p_event_id, v_subject_hash,
            (extract(epoch from clock_timestamp()-v_started)*1000)::int);
    RETURN jsonb_build_object('decision','rejected','reason_code','source_subject_not_allowed');
  END IF;

  SELECT id INTO v_existing_pk FROM public.dsx_events
    WHERE connection_id = v_conn.id AND event_id = p_event_id;
  IF FOUND THEN
    INSERT INTO public.dsx_ingestion_audit(connection_id, org_id, request_id, decision, reason_code, event_id, source_subject_hash, latency_ms)
    VALUES (v_conn.id, v_conn.org_id, p_request_id, 'duplicate', 'event_id_exists', p_event_id, v_subject_hash,
            (extract(epoch from clock_timestamp()-v_started)*1000)::int);
    RETURN jsonb_build_object('decision','duplicate','event_pk',v_existing_pk,'reason_code','event_id_exists');
  END IF;

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

  SELECT max(observed_at) INTO v_max_observed
    FROM public.dsx_events
    WHERE connection_id = v_conn.id AND asset_mapping_id = v_mapping.id;
  IF v_max_observed IS NOT NULL AND p_observed_at <= v_max_observed THEN
    INSERT INTO public.dsx_ingestion_audit(connection_id, org_id, request_id, decision, reason_code, event_id, source_subject_hash, latency_ms)
    VALUES (v_conn.id, v_conn.org_id, p_request_id, 'rejected', 'stale_observation', p_event_id, v_subject_hash,
            (extract(epoch from clock_timestamp()-v_started)*1000)::int);
    RETURN jsonb_build_object('decision','rejected','reason_code','stale_observation');
  END IF;

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