-- 1. Runtime workers -------------------------------------------------------
CREATE TABLE public.connection_runtime_workers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id TEXT NOT NULL UNIQUE,
  runtime TEXT NOT NULL,
  connection_id UUID NOT NULL REFERENCES public.connection_instances(id) ON DELETE CASCADE,
  tenant_id UUID,
  state TEXT NOT NULL DEFAULT 'STARTING',
  broker_url TEXT,
  protocol TEXT,
  evidence_class TEXT NOT NULL DEFAULT 'TEST_EVIDENCE',
  subscribed_topics TEXT[] NOT NULL DEFAULT '{}',
  connect_count INTEGER NOT NULL DEFAULT 0,
  reconnect_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_heartbeat_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  stopped_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT connection_runtime_workers_state_check
    CHECK (state IN ('STARTING','CONNECTING','CONNECTED','RECONNECTING','DEGRADED','STOPPED','FAILED','REFUSED')),
  CONSTRAINT connection_runtime_workers_evidence_check
    CHECK (evidence_class IN ('PRODUCTION_TELEMETRY','TEST_EVIDENCE'))
);
GRANT SELECT ON public.connection_runtime_workers TO authenticated;
GRANT ALL ON public.connection_runtime_workers TO service_role;
ALTER TABLE public.connection_runtime_workers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members read runtime workers"
  ON public.connection_runtime_workers FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR tenant_id = public.current_tenant_id());

-- 2. Per-message ingest evidence -------------------------------------------
CREATE TABLE public.connection_ingest_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES public.connection_instances(id) ON DELETE CASCADE,
  ingest_run_id UUID REFERENCES public.connection_ingest_runs(id) ON DELETE SET NULL,
  tenant_id UUID,
  worker_id TEXT,
  correlation_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  qos SMALLINT,
  payload_bytes INTEGER NOT NULL DEFAULT 0,
  payload_hash TEXT NOT NULL,
  event_id TEXT,
  observed_at TIMESTAMP WITH TIME ZONE,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  outcome TEXT NOT NULL,
  rejection_reason TEXT,
  detail TEXT,
  contract_id UUID REFERENCES public.connection_data_contracts(id) ON DELETE SET NULL,
  mapping_id UUID REFERENCES public.connection_twin_mappings(id) ON DELETE SET NULL,
  processing_latency_ms INTEGER,
  transport_latency_ms INTEGER,
  evidence_class TEXT NOT NULL DEFAULT 'TEST_EVIDENCE',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT connection_ingest_messages_outcome_check
    CHECK (outcome IN ('ACCEPTED','REJECTED','DUPLICATE','DEAD_LETTER')),
  CONSTRAINT connection_ingest_messages_evidence_check
    CHECK (evidence_class IN ('PRODUCTION_TELEMETRY','TEST_EVIDENCE'))
);
CREATE INDEX connection_ingest_messages_connection_idx
  ON public.connection_ingest_messages (connection_id, received_at DESC);
CREATE UNIQUE INDEX connection_ingest_messages_dedupe_idx
  ON public.connection_ingest_messages (connection_id, event_id)
  WHERE event_id IS NOT NULL AND outcome = 'ACCEPTED';
GRANT SELECT ON public.connection_ingest_messages TO authenticated;
GRANT ALL ON public.connection_ingest_messages TO service_role;
ALTER TABLE public.connection_ingest_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members read ingest messages"
  ON public.connection_ingest_messages FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR tenant_id = public.current_tenant_id());

-- 3. Twin property values with provenance ----------------------------------
CREATE TABLE public.twin_property_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  facility_id UUID,
  target_entity TEXT NOT NULL,
  target_prim_path TEXT,
  target_property TEXT NOT NULL,
  value_numeric DOUBLE PRECISION,
  value_text TEXT,
  unit TEXT,
  observed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  source_connection_id UUID REFERENCES public.connection_instances(id) ON DELETE SET NULL,
  source_contract_id UUID REFERENCES public.connection_data_contracts(id) ON DELETE SET NULL,
  source_mapping_id UUID REFERENCES public.connection_twin_mappings(id) ON DELETE SET NULL,
  source_message_id UUID REFERENCES public.connection_ingest_messages(id) ON DELETE SET NULL,
  correlation_id TEXT,
  provenance_class TEXT NOT NULL DEFAULT 'UNVERIFIED',
  provenance_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT twin_property_values_provenance_check
    CHECK (provenance_class IN ('MEASURED','TEST_EVIDENCE','SIMULATED','REPLAYED','UNVERIFIED'))
);
CREATE UNIQUE INDEX twin_property_values_target_idx
  ON public.twin_property_values (
    COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
    target_entity, target_property
  );
GRANT SELECT ON public.twin_property_values TO authenticated;
GRANT ALL ON public.twin_property_values TO service_role;
ALTER TABLE public.twin_property_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members read twin property values"
  ON public.twin_property_values FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR tenant_id = public.current_tenant_id());

CREATE TRIGGER update_twin_property_values_updated_at
  BEFORE UPDATE ON public.twin_property_values
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_connection_runtime_workers_updated_at
  BEFORE UPDATE ON public.connection_runtime_workers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Ingest runs gain runtime attribution ----------------------------------
ALTER TABLE public.connection_ingest_runs
  ADD COLUMN IF NOT EXISTS worker_id TEXT,
  ADD COLUMN IF NOT EXISTS correlation_id TEXT,
  ADD COLUMN IF NOT EXISTS tenant_id UUID,
  ADD COLUMN IF NOT EXISTS source_endpoint TEXT,
  ADD COLUMN IF NOT EXISTS evidence_class TEXT NOT NULL DEFAULT 'TEST_EVIDENCE',
  ADD COLUMN IF NOT EXISTS mapped_properties INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_latency_ms INTEGER;

-- 5. MQTT message contract --------------------------------------------------
INSERT INTO public.connection_data_contracts
  (connector_id, schema_type, schema_version, direction, data_classification,
   unit_rules, timestamp_rules, validation_status, compatibility, official_source, checksum)
VALUES (
  'mqtt_transport', 'dsx_event_envelope', '1', 'inbound', 'operational_telemetry',
  '{"required": true, "enum": ["degC","kW","kWh","percent","pascal","liters_per_minute","volts","amps","hz","ratio","count","boolean"]}'::jsonb,
  '{"required_fields": ["observed_at","received_at"], "format": "iso8601_utc", "max_skew_seconds": 300, "max_age_seconds": 600}'::jsonb,
  'VALIDATED', 'backward', 'AURA DSX event envelope v1 (src/dsx/contract.ts)', 'dsx-event-envelope-v1'
);

-- 6. MQTT connector is now wired to a runtime adapter -----------------------
UPDATE public.connector_definitions
SET implementation_status = 'IMPLEMENTED',
    runtime_adapter = 'mqtt-runtime-worker',
    availability = 'AVAILABLE',
    capability_evidence = '[
      {"kind":"code","note":"Containerised MQTT runtime worker (services/mqtt-ingest-worker) subscribes, validates against the data contract, records ingest evidence and executes twin mappings."},
      {"kind":"runtime","note":"Verified against a local disposable Mosquitto broker. Local broker traffic is recorded as TEST_EVIDENCE, never production telemetry."}
    ]'::jsonb,
    updated_at = now()
WHERE id = 'mqtt_transport';
