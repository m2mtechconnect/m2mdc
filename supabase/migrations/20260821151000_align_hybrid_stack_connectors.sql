-- AURA DC hybrid-stack connector alignment.
--
-- Forward-only catalogue additions. These rows describe target capabilities;
-- they do not create connection instances, runtime adapters, credentials or
-- deployment claims. Historical connector migrations remain immutable.

INSERT INTO public.connector_definitions
  (id, name, category, provider, version, implementation_status, supported_directions, supported_auth_methods, supported_data_classes, supported_protocols, mapping_required, documentation_url, validation_status, runtime_adapter, availability, capability_evidence)
VALUES
  (
    'redfish',
    'Redfish hardware management',
    'Facility and OT',
    'DMTF',
    '0.0.0',
    'PLANNED',
    '{READ}',
    '{basic,session_token}',
    '{asset,telemetry}',
    '{https,redfish}',
    true,
    null,
    'UNVALIDATED',
    null,
    'UNAVAILABLE',
    '[{"kind":"architecture","note":"Redfish is part of the target facility-management source layer. No operational endpoint or runtime adapter is verified in this environment."}]'::jsonb
  ),
  (
    'nvidia_dcgm',
    'NVIDIA DCGM telemetry',
    'Facility and OT',
    'NVIDIA',
    '0.0.0',
    'PLANNED',
    '{READ}',
    '{}',
    '{gpu_telemetry,metrics}',
    '{dcgm}',
    true,
    null,
    'UNVALIDATED',
    null,
    'UNAVAILABLE',
    '[{"kind":"architecture","note":"NVIDIA DCGM is part of the target GPU telemetry source layer. No operational DCGM feed or runtime adapter is verified in this environment."}]'::jsonb
  ),
  (
    'ddn_infinia',
    'DDN Infinia object storage',
    'Assets and engineering',
    'DDN',
    '0.0.0',
    'PLANNED',
    '{READ,WRITE}',
    '{access_key}',
    '{asset,evidence}',
    '{https,s3}',
    false,
    null,
    'UNVALIDATED',
    null,
    'NOT_DEPLOYED',
    '[{"kind":"architecture","note":"DDN Infinia is the target object-storage layer for AURA assets and evidence. It is not deployed or runtime-verified here; the existing AURA managed OpenUSD storage does not prove a DDN binding."}]'::jsonb
  )
ON CONFLICT (id) DO NOTHING;
