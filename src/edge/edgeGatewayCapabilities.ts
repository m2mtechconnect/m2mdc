export type EdgeGatewayCapabilityStatus = 'PARTIAL' | 'PLANNED' | 'UNAVAILABLE';

export interface EdgeGatewayCapability {
  id: string;
  label: string;
  category: 'transport' | 'protocol' | 'identity' | 'runtime';
  status: EdgeGatewayCapabilityStatus;
  description: string;
  evidence: string;
}

/**
 * Truth-bearing Edge Gateway capability catalogue.
 * A protocol may be part of the product direction without being runtime-qualified.
 */
export const EDGE_GATEWAY_CAPABILITIES: readonly EdgeGatewayCapability[] = [
  {
    id: 'mqtt-transport',
    label: 'MQTT transport',
    category: 'transport',
    status: 'PARTIAL',
    description: 'Outbound message transport between an edge worker and the AURA control plane.',
    evidence: 'Repository contains an MQTT ingest worker and DSX Exchange/Mosquitto scaffolding; production gateway enrollment is not yet qualified.',
  },
  {
    id: 'https-control',
    label: 'HTTPS control channel',
    category: 'transport',
    status: 'PLANNED',
    description: 'Outbound-only control/configuration channel for customer networks.',
    evidence: 'Gateway registry models transport and identity, but no signed enrollment/control endpoint is release-qualified yet.',
  },
  {
    id: 'certificate-identity',
    label: 'Certificate identity',
    category: 'identity',
    status: 'PLANNED',
    description: 'Per-gateway certificate identity, rotation and revocation.',
    evidence: 'Registry stores certificate fingerprint/reference only; issuance and rotation workflow is not yet implemented.',
  },
  {
    id: 'local-buffering',
    label: 'Local buffering',
    category: 'runtime',
    status: 'PLANNED',
    description: 'Store-and-forward behavior during customer-network or cloud interruption.',
    evidence: 'No release-qualified gateway queue/persistence contract exists yet.',
  },
  {
    id: 'snmp',
    label: 'SNMP',
    category: 'protocol',
    status: 'PLANNED',
    description: 'Infrastructure telemetry ingestion from SNMP-enabled equipment.',
    evidence: 'Product direction only; no runtime-qualified AURA Edge Gateway adapter yet.',
  },
  {
    id: 'bacnet',
    label: 'BACnet',
    category: 'protocol',
    status: 'PLANNED',
    description: 'Building-management and cooling-system integration.',
    evidence: 'Product direction only; no runtime-qualified AURA Edge Gateway adapter yet.',
  },
  {
    id: 'modbus',
    label: 'Modbus',
    category: 'protocol',
    status: 'PLANNED',
    description: 'Industrial power/environment telemetry integration.',
    evidence: 'Product direction only; no runtime-qualified AURA Edge Gateway adapter yet.',
  },
  {
    id: 'redfish',
    label: 'Redfish',
    category: 'protocol',
    status: 'PLANNED',
    description: 'Server/platform management telemetry and inventory integration.',
    evidence: 'Product direction only; no runtime-qualified AURA Edge Gateway adapter yet.',
  },
  {
    id: 'opc-ua',
    label: 'OPC UA',
    category: 'protocol',
    status: 'PLANNED',
    description: 'Industrial equipment and process integration.',
    evidence: 'Product direction only; no runtime-qualified AURA Edge Gateway adapter yet.',
  },
] as const;
