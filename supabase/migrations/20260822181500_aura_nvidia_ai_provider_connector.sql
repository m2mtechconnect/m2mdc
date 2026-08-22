-- AURA Agentic Architecture — NVIDIA hosted inference connector.
--
-- This is a connector-definition registration only. It does not create a
-- connection instance, store a credential, enable a provider, or claim a
-- deployed NIM/NeMo/TensorRT-LLM runtime. Operators must still provision,
-- vault, health-check and activate a tenant-scoped connection through the
-- existing Connections control plane.

insert into public.connector_definitions (
  id,
  name,
  category,
  provider,
  version,
  implementation_status,
  supported_directions,
  supported_auth_methods,
  supported_data_classes,
  supported_protocols,
  configuration_schema,
  mapping_required,
  documentation_url,
  validation_status,
  runtime_adapter,
  availability,
  capability_evidence,
  publication_status
) values (
  'nvidia_ai_provider',
  'NVIDIA AI inference provider',
  'Platform service',
  'NVIDIA',
  '1.0.0',
  'IMPLEMENTED',
  array['READ']::text[],
  array['api_key']::text[],
  array['inference']::text[],
  array['https', 'openai-compatible']::text[],
  jsonb_build_object(
    'deployment_types', jsonb_build_array('nvidia_hosted'),
    'endpoint_policy', 'server_owned',
    'hosted_endpoint', 'https://integrate.api.nvidia.com/v1',
    'profiles', jsonb_build_object(
      'reasoning', 'nvidia/nemotron-3.5-lightning-30b-a3b',
      'supervisor', 'nvidia/nemotron-3-super-120b-a12b'
    ),
    'credential_kind', 'api_key',
    'private_nim', 'separately_evidence_gated'
  ),
  false,
  'https://build.nvidia.com/',
  'UNVALIDATED',
  'nvidia-openai-compatible',
  'AVAILABLE',
  jsonb_build_array(
    jsonb_build_object(
      'kind', 'code',
      'note', 'AURA provider adapter uses the NVIDIA hosted OpenAI-compatible chat API through the server-side model router.'
    ),
    jsonb_build_object(
      'kind', 'guardrail',
      'note', 'Availability does not claim NIM, NeMo Agent Toolkit, TensorRT-LLM or self-hosted execution. Runtime activation requires encrypted credential storage and a passing server-side health check.'
    )
  ),
  'PUBLISHED'
)
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  provider = excluded.provider,
  version = excluded.version,
  implementation_status = excluded.implementation_status,
  supported_directions = excluded.supported_directions,
  supported_auth_methods = excluded.supported_auth_methods,
  supported_data_classes = excluded.supported_data_classes,
  supported_protocols = excluded.supported_protocols,
  configuration_schema = excluded.configuration_schema,
  mapping_required = excluded.mapping_required,
  documentation_url = excluded.documentation_url,
  validation_status = excluded.validation_status,
  runtime_adapter = excluded.runtime_adapter,
  availability = excluded.availability,
  capability_evidence = excluded.capability_evidence,
  publication_status = excluded.publication_status,
  updated_at = now();
