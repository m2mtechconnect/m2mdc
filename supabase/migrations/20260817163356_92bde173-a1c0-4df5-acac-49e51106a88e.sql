-- === Connections control plane =============================================
CREATE TABLE public.connector_definitions (
  id text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  provider text NOT NULL,
  version text NOT NULL DEFAULT '1.0.0',
  implementation_status text NOT NULL DEFAULT 'PLANNED',
  supported_directions text[] NOT NULL DEFAULT '{}',
  supported_auth_methods text[] NOT NULL DEFAULT '{}',
  supported_data_classes text[] NOT NULL DEFAULT '{}',
  supported_protocols text[] NOT NULL DEFAULT '{}',
  configuration_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  mapping_required boolean NOT NULL DEFAULT false,
  documentation_url text,
  validation_status text NOT NULL DEFAULT 'UNVALIDATED',
  runtime_adapter text,
  availability text NOT NULL DEFAULT 'UNAVAILABLE',
  capability_evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.connector_definitions TO authenticated;
GRANT ALL ON public.connector_definitions TO service_role;
ALTER TABLE public.connector_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "connector_definitions_read" ON public.connector_definitions FOR SELECT TO authenticated USING (true);

CREATE TABLE public.connection_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id text NOT NULL REFERENCES public.connector_definitions(id) ON DELETE RESTRICT,
  tenant_id uuid,
  facility_id uuid,
  environment text NOT NULL DEFAULT 'production',
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT',
  data_direction text NOT NULL DEFAULT 'READ',
  endpoint_reference text,
  credential_reference text,
  configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
  owner_id uuid,
  created_by uuid,
  is_system boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT false,
  status_reason text,
  last_tested_at timestamptz,
  last_success_at timestamptz,
  last_ingest_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX connection_instances_unique_scope
  ON public.connection_instances (connector_id, environment, coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(facility_id, '00000000-0000-0000-0000-000000000000'::uuid), display_name);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connection_instances TO authenticated;
GRANT ALL ON public.connection_instances TO service_role;
ALTER TABLE public.connection_instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "connection_instances_read" ON public.connection_instances FOR SELECT TO authenticated USING (true);
CREATE POLICY "connection_instances_admin_write" ON public.connection_instances FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE TABLE public.connection_data_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id text NOT NULL REFERENCES public.connector_definitions(id) ON DELETE CASCADE,
  schema_type text NOT NULL,
  schema_version text NOT NULL,
  direction text NOT NULL DEFAULT 'INBOUND',
  data_classification text NOT NULL DEFAULT 'OPERATIONAL',
  unit_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  timestamp_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  validation_status text NOT NULL DEFAULT 'UNVALIDATED',
  official_source text,
  checksum text,
  compatibility text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.connection_data_contracts TO authenticated;
GRANT ALL ON public.connection_data_contracts TO service_role;
ALTER TABLE public.connection_data_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "connection_data_contracts_read" ON public.connection_data_contracts FOR SELECT TO authenticated USING (true);

CREATE TABLE public.connection_twin_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.connection_instances(id) ON DELETE CASCADE,
  source_identifier text NOT NULL,
  target_facility_id uuid,
  target_entity text,
  target_prim_path text,
  target_property text,
  source_unit text,
  target_unit text,
  conversion_rule text,
  data_type text NOT NULL DEFAULT 'number',
  direction text NOT NULL DEFAULT 'INBOUND',
  quality_rule text,
  timestamp_rule text,
  validation_status text NOT NULL DEFAULT 'UNVALIDATED',
  active boolean NOT NULL DEFAULT false,
  sample_value jsonb,
  last_mapped_value jsonb,
  last_mapped_at timestamptz,
  mapping_owner uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connection_twin_mappings TO authenticated;
GRANT ALL ON public.connection_twin_mappings TO service_role;
ALTER TABLE public.connection_twin_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "connection_twin_mappings_read" ON public.connection_twin_mappings FOR SELECT TO authenticated USING (true);
CREATE POLICY "connection_twin_mappings_admin_write" ON public.connection_twin_mappings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE TABLE public.connection_health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.connection_instances(id) ON DELETE CASCADE,
  check_type text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'RUNNING',
  latency_ms integer,
  dns_result text,
  network_result text,
  tls_result text,
  auth_result text,
  schema_result text,
  mapping_result text,
  data_availability text,
  error_code text,
  safe_message text,
  evidence_reference text,
  correlation_id text,
  requested_by uuid
);
GRANT SELECT ON public.connection_health_checks TO authenticated;
GRANT ALL ON public.connection_health_checks TO service_role;
ALTER TABLE public.connection_health_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "connection_health_checks_read" ON public.connection_health_checks FOR SELECT TO authenticated USING (true);

CREATE TABLE public.connection_ingest_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.connection_instances(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  records_received integer NOT NULL DEFAULT 0,
  records_accepted integer NOT NULL DEFAULT 0,
  records_rejected integer NOT NULL DEFAULT 0,
  mapping_failures integer NOT NULL DEFAULT 0,
  duplicate_events integer NOT NULL DEFAULT 0,
  retries integer NOT NULL DEFAULT 0,
  dead_letter_count integer NOT NULL DEFAULT 0,
  final_status text NOT NULL DEFAULT 'RUNNING'
);
GRANT SELECT ON public.connection_ingest_runs TO authenticated;
GRANT ALL ON public.connection_ingest_runs TO service_role;
ALTER TABLE public.connection_ingest_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "connection_ingest_runs_read" ON public.connection_ingest_runs FOR SELECT TO authenticated USING (true);

CREATE TABLE public.connection_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  connection_id uuid REFERENCES public.connection_instances(id) ON DELETE SET NULL,
  previous_state text,
  new_state text,
  facility_id uuid,
  tenant_id uuid,
  approval_reference text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  correlation_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.connection_audit_events TO authenticated;
GRANT ALL ON public.connection_audit_events TO service_role;
ALTER TABLE public.connection_audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "connection_audit_events_read" ON public.connection_audit_events FOR SELECT TO authenticated USING (true);

CREATE TRIGGER connector_definitions_updated_at BEFORE UPDATE ON public.connector_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER connection_instances_updated_at BEFORE UPDATE ON public.connection_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER connection_twin_mappings_updated_at BEFORE UPDATE ON public.connection_twin_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- === Truthful catalogue seed ==============================================
INSERT INTO public.connector_definitions
  (id, name, category, provider, version, implementation_status, supported_directions, supported_auth_methods, supported_data_classes, supported_protocols, mapping_required, documentation_url, validation_status, runtime_adapter, availability, capability_evidence)
VALUES
 ('supabase_platform','Application platform (Supabase)','Platform service','Lovable Cloud','1.0.0','IMPLEMENTED','{READ,WRITE}','{jwt}','{application}','{https,postgrest}',false,null,'RUNTIME_VERIFIED','supabase-js','AVAILABLE','[{"kind":"runtime","note":"Application read/write proven by live session queries."}]'),
 ('dsx_ingest_gateway','DSX ingest gateway','Facility and OT','AURA','2.0.0','IMPLEMENTED','{READ}','{gateway_jwt_rs256}','{telemetry}','{https}',true,'https://docs.omniverse.nvidia.com/dsx/latest/system-architecture.html','ENDPOINT_VERIFIED','dsx-ingest','AVAILABLE','[{"kind":"code","note":"Hardened edge function with RS256 gateway JWT verification."},{"kind":"data","note":"Zero events received."}]'),
 ('mqtt_transport','Generic MQTT 3.1.1 transport','Facility and OT','AURA','0.9.0','IMPLEMENTED_NOT_WIRED','{READ}','{username_password,mtls}','{telemetry}','{mqtt}',true,null,'UNVALIDATED',null,'BLOCKED','[{"kind":"code","note":"MQTT client exists; runtime source resolver does not select the transport."}]'),
 ('dsx_exchange','NVIDIA DSX Exchange','DSX Exchange','NVIDIA','0.0.0','PLANNED','{READ,WRITE}','{oauth2,mtls,nkey}','{telemetry,events}','{nats,mqtt}',true,'https://docs.nvidia.com/dsx-exchange/architecture','UNVALIDATED',null,'NOT_DEPLOYED','[]'),
 ('bms_edge_gateway','BMS edge gateway','Facility and OT','Generic','0.0.0','PLANNED','{READ}','{mtls}','{telemetry}','{https,mqtt}',true,null,'UNVALIDATED',null,'UNAVAILABLE','[]'),
 ('bacnet_ip','BACnet/IP gateway','Facility and OT','Generic','0.0.0','PLANNED','{READ}','{none}','{telemetry}','{bacnet}',true,null,'UNVALIDATED',null,'UNAVAILABLE','[]'),
 ('modbus_tcp','Modbus TCP gateway','Facility and OT','Generic','0.0.0','PLANNED','{READ}','{none}','{telemetry}','{modbus}',true,null,'UNVALIDATED',null,'UNAVAILABLE','[]'),
 ('opcua','OPC UA gateway','Facility and OT','Generic','0.0.0','PLANNED','{READ}','{x509,username_password}','{telemetry}','{opcua}',true,null,'UNVALIDATED',null,'UNAVAILABLE','[]'),
 ('snmp','SNMP','Facility and OT','Generic','0.0.0','PLANNED','{READ}','{snmpv3}','{telemetry}','{snmp}',true,null,'UNVALIDATED',null,'UNAVAILABLE','[]'),
 ('dcim_rest','DCIM REST connector','Facility and OT','Generic','0.0.0','PLANNED','{READ}','{api_key,oauth2}','{asset,telemetry}','{https}',true,null,'UNVALIDATED',null,'UNAVAILABLE','[]'),
 ('aws','Amazon Web Services','Cloud and infrastructure','AWS','0.0.0','PLANNED','{READ}','{iam_role,oidc}','{metrics,asset}','{https}',false,'https://docs.aws.amazon.com/iot-twinmaker/latest/guide/data-connector-interface.html','UNVALIDATED',null,'UNAVAILABLE','[]'),
 ('azure','Microsoft Azure','Cloud and infrastructure','Microsoft','0.0.0','PLANNED','{READ}','{managed_identity,entra_id}','{metrics,asset}','{https}',false,null,'UNVALIDATED',null,'UNAVAILABLE','[]'),
 ('gcp','Google Cloud','Cloud and infrastructure','Google','0.0.0','PLANNED','{READ}','{workload_identity}','{metrics,asset}','{https}',false,null,'UNVALIDATED',null,'UNAVAILABLE','[]'),
 ('kubernetes','Kubernetes','Cloud and infrastructure','CNCF','0.0.0','PLANNED','{READ}','{service_account}','{metrics}','{https}',false,null,'UNVALIDATED',null,'UNAVAILABLE','[]'),
 ('prometheus','Prometheus / OpenTelemetry','Cloud and infrastructure','CNCF','0.0.0','PLANNED','{READ}','{bearer,mtls}','{metrics}','{https,otlp}',true,null,'UNVALIDATED',null,'UNAVAILABLE','[]'),
 ('grafana','Grafana','Cloud and infrastructure','Grafana Labs','0.0.0','PLANNED','{READ}','{api_key}','{metrics}','{https}',false,'https://grafana.com/docs/grafana/latest/datasources/','UNVALIDATED',null,'UNAVAILABLE','[]'),
 ('openusd_storage','OpenUSD asset storage','Assets and engineering','AURA','1.0.0','IMPLEMENTED','{READ}','{jwt}','{asset}','{https}',false,null,'RUNTIME_VERIFIED','supabase-storage','AVAILABLE','[{"kind":"runtime","note":"Approved GLB derivatives served from managed storage."}]'),
 ('s3_object_storage','S3-compatible object storage','Assets and engineering','Generic','0.0.0','PLANNED','{READ,WRITE}','{iam_role,api_key}','{asset}','{https}',false,null,'UNVALIDATED',null,'UNAVAILABLE','[]'),
 ('plm_cad_import','PLM / CAD import','Assets and engineering','Generic','0.0.0','PLANNED','{READ}','{api_key}','{asset}','{https}',true,null,'UNVALIDATED',null,'UNAVAILABLE','[]'),
 ('bim_ifc_import','BIM / IFC import','Assets and engineering','Generic','0.0.0','PLANNED','{READ}','{none}','{asset}','{file}',true,null,'UNVALIDATED',null,'UNAVAILABLE','[]'),
 ('asset_manifest','Asset manifest ingestion','Assets and engineering','AURA','1.0.0','IMPLEMENTED','{READ}','{jwt}','{asset}','{https}',false,null,'RUNTIME_VERIFIED','asset-manifest','AVAILABLE','[{"kind":"runtime","note":"Derivative manifest read by the asset pipeline."}]'),
 ('servicenow','ServiceNow','Workflow and enterprise','ServiceNow','0.0.0','PLANNED','{READ,WRITE}','{oauth2}','{itsm}','{https}',false,null,'UNVALIDATED',null,'UNAVAILABLE','[]'),
 ('generic_webhook','Generic authenticated webhook','Workflow and enterprise','AURA','1.0.0','PLANNED','{WRITE}','{shared_secret}','{events}','{https}',false,null,'UNVALIDATED',null,'UNAVAILABLE','[]'),
 ('rest_api','Generic REST API','Workflow and enterprise','Generic','0.0.0','PLANNED','{READ}','{api_key,oauth2}','{application}','{https}',false,null,'UNVALIDATED',null,'UNAVAILABLE','[]'),
 ('notification_provider','Notification provider','Workflow and enterprise','Generic','0.0.0','PLANNED','{WRITE}','{api_key}','{events}','{https}',false,null,'UNVALIDATED',null,'UNAVAILABLE','[]');

-- === Truthful system connection instances =================================
INSERT INTO public.connection_instances
  (connector_id, display_name, environment, status, data_direction, endpoint_reference, is_system, enabled, status_reason)
VALUES
 ('supabase_platform','Application platform','production','HEALTHY','READ_WRITE','managed-backend',true,true,'Application read/write only. This is not facility telemetry.'),
 ('dsx_ingest_gateway','DSX ingest endpoint','production','CONNECTED_NO_DATA','READ','edge:dsx-ingest',true,true,'Endpoint implemented and hardened. Zero events received.'),
 ('mqtt_transport','MQTT transport','production','BLOCKED','READ',null,true,false,'Runtime source resolver does not select the MQTT transport.'),
 ('dsx_exchange','NVIDIA DSX Exchange','production','NOT_DEPLOYED','READ',null,true,false,'DSX Exchange distribution and AsyncAPI schema packages are not present in this environment.'),
 ('openusd_storage','OpenUSD asset storage','production','HEALTHY','READ','managed-storage',true,true,'Approved OpenUSD-derived GLB assets are served from managed storage.');