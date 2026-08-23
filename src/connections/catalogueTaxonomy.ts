import type { ConnectorDefinition } from './model';

/**
 * Customer-facing AURA DC connector taxonomy.
 *
 * The operational Connections workspace intentionally excludes platform
 * dependencies, build-time knowledge connectors and design-import tooling.
 * Those capabilities still exist, but their owning workspace is different.
 */
export const CUSTOMER_HIDDEN_CONNECTOR_IDS = new Set([
  'search_analytics',
  'workspace_documents',
  'supabase_platform',
  'kubernetes',
]);

export const BLUEPRINT_OWNED_CONNECTOR_IDS = new Set([
  'plm_cad_import',
  'bim_ifc_import',
  'asset_manifest',
]);

export type CustomerConnectorGroupId =
  | 'facility_ot'
  | 'edge_exchange'
  | 'twin_storage'
  | 'enterprise_workflow'
  | 'observability'
  | 'cloud_optional'
  | 'custom';

export interface CustomerConnectorGroup {
  id: CustomerConnectorGroupId;
  label: string;
  description: string;
}

export const HYBRID_STACK_GROUPS: readonly CustomerConnectorGroup[] = [
  {
    id: 'facility_ot',
    label: 'Facility & OT',
    description: 'Facility, equipment and GPU-management sources that supply operational data.',
  },
  {
    id: 'edge_exchange',
    label: 'Edge & Exchange',
    description: 'Edge transport, ingestion and NVIDIA DSX exchange paths.',
  },
  {
    id: 'twin_storage',
    label: 'Digital Twin & Storage',
    description: 'OpenUSD assets, evidence storage and the target DDN object-storage layer.',
  },
  {
    id: 'enterprise_workflow',
    label: 'Enterprise Workflow',
    description: 'Operational workflow systems that receive or return approved actions.',
  },
  {
    id: 'observability',
    label: 'Observability',
    description: 'Customer-owned metrics, telemetry and visualization services.',
  },
  {
    id: 'cloud_optional',
    label: 'Cloud — Optional',
    description: 'Optional hyperscaler services; native cloud identity and APIs remain authoritative.',
  },
  {
    id: 'custom',
    label: 'Custom',
    description: 'Protocol-neutral extension points for systems without a dedicated AURA connector.',
  },
] as const;

const EXPLICIT_GROUP: Record<string, CustomerConnectorGroupId> = {
  bms_edge_gateway: 'facility_ot',
  bacnet_ip: 'facility_ot',
  modbus_tcp: 'facility_ot',
  opcua: 'facility_ot',
  snmp: 'facility_ot',
  dcim_rest: 'facility_ot',
  redfish: 'facility_ot',
  nvidia_dcgm: 'facility_ot',

  mqtt_transport: 'edge_exchange',
  dsx_ingest_gateway: 'edge_exchange',
  dsx_exchange: 'edge_exchange',

  openusd_storage: 'twin_storage',
  ddn_infinia: 'twin_storage',
  s3_object_storage: 'twin_storage',

  servicenow: 'enterprise_workflow',
  notification_provider: 'enterprise_workflow',

  prometheus: 'observability',
  prometheus_otel: 'observability',
  grafana: 'observability',

  aws: 'cloud_optional',
  azure: 'cloud_optional',
  gcp: 'cloud_optional',

  generic_webhook: 'custom',
  rest_api: 'custom',
};

export function isCustomerVisibleConnector(definition: ConnectorDefinition): boolean {
  return !CUSTOMER_HIDDEN_CONNECTOR_IDS.has(definition.id) && !BLUEPRINT_OWNED_CONNECTOR_IDS.has(definition.id);
}

export function customerConnectorGroupOf(definition: ConnectorDefinition): CustomerConnectorGroupId {
  const explicit = EXPLICIT_GROUP[definition.id];
  if (explicit) return explicit;

  if (definition.category === 'Facility and OT') return 'facility_ot';
  if (definition.category === 'DSX Exchange') return 'edge_exchange';
  if (definition.category === 'Assets and engineering') return 'twin_storage';
  if (definition.category === 'Workflow and enterprise') return 'enterprise_workflow';
  if (/prometheus|otel|opentelemetry|grafana|observability/i.test(`${definition.id} ${definition.name}`)) return 'observability';
  if (definition.category === 'Cloud and infrastructure') return 'cloud_optional';
  return 'custom';
}

/** Additional truth copy for stack-sensitive connectors. */
export function connectorStackNote(definition: ConnectorDefinition): string | null {
  switch (definition.id) {
    case 'mqtt_transport':
      return 'Implemented in code; production runtime wiring is still required.';
    case 'dsx_ingest_gateway':
      return 'Endpoint verification proves reachability and auth behaviour, not that facility data is flowing.';
    case 'dsx_exchange':
      return 'NVIDIA DSX Exchange is not deployed in this environment.';
    case 'openusd_storage':
      return 'Current AURA-managed OpenUSD storage. This does not prove DDN Infinia is deployed.';
    case 'ddn_infinia':
      return 'Target DDN Infinia object-storage integration; not deployed or runtime-verified yet.';
    case 'redfish':
      return 'Planned native hardware-management source; no operational Redfish endpoint is connected.';
    case 'nvidia_dcgm':
      return 'Planned NVIDIA GPU telemetry source; no operational DCGM feed is connected.';
    case 'servicenow':
      return 'AURA-native workflow integration required; no managed third-party substitution is approved.';
    default:
      return null;
  }
}
