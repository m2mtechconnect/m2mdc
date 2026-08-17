/**
 * Server-owned managed connector capability manifest.
 *
 * RESTRICTED ENGINEERING SURFACE. This file records verified runtime bindings
 * for the underlying platform connector infrastructure. There is no reliable
 * runtime discovery API for project-level connector linkage, so this manifest
 * is populated only from bindings verified by an operator against the
 * workspace integration state - never inferred from a catalogue card, icon or
 * documentation page.
 *
 * Customer-facing responses derived from this manifest must use AURA
 * terminology only. The provider identifiers below are transport keys, not
 * display strings; `managed-connector-capabilities` never echoes them
 * verbatim as a product name.
 *
 * Verified 2026-08-17 against the workspace connector inventory.
 */
import type { ManagedOperation } from './managedConnectorAuthz.ts';

export type ConnectionClass = 'MANAGED_SHARED' | 'MANAGED_USER' | 'AURA_NATIVE' | 'EXTERNAL_DSX_RUNTIME';

export type RuntimeEligibility =
  | 'RUNTIME_SHARED_SUPPORTED'
  | 'RUNTIME_USER_SUPPORTED'
  | 'PLATFORM_SUPPORTED_NOT_LINKED'
  | 'BUILD_CHAT_ONLY'
  | 'NATIVE_RUNTIME_REQUIRED'
  | 'BLOCKED_MISSING_CREDENTIAL'
  | 'BLOCKED_MISSING_DEPLOYMENT'
  | 'UNSUPPORTED'
  | 'NOT_VERIFIED';

export interface ManifestEntry {
  /** AURA connector definition id, matching connector_definitions.id. */
  connector_definition_id: string;
  /** Customer-facing provider or protocol name. Never the platform vendor. */
  display_provider: string;
  connection_class: ConnectionClass;
  eligibility: RuntimeEligibility;
  /** Transport key for the managed gateway. Server-side only. */
  gateway_connector_key: string | null;
  /** True only when an operator confirmed the link against this project. */
  linked_to_project: boolean;
  supported_operations: ManagedOperation[];
  data_classes: string[];
  /** Honest disclosure limits shown to administrators. */
  disclosure_limitations: string[];
  /** Populated when strict white-labelling forbids a managed binding. */
  native_required_reason: string | null;
  /**
   * Read-only probe used by operator-triggered runtime verification. The path
   * is resolved server-side only; a caller may never supply one.
   */
  health_probe: { operation_id: string; path: string } | null;
  verified_at: string | null;
  evidence_note: string;
}

const READ_ROLES = ['owner', 'admin', 'engineer', 'operator', 'data_analyst'];
const WRITE_ROLES = ['owner', 'admin'];

function readOperation(id: string, label: string): ManagedOperation {
  return {
    id,
    label,
    classification: 'READ',
    allowed_roles: READ_ROLES,
    requires_approval: false,
    rate_limit_per_hour: 60,
    timeout_ms: 15_000,
  };
}

function writeOperation(id: string, label: string): ManagedOperation {
  return {
    id,
    label,
    classification: 'WRITE',
    allowed_roles: WRITE_ROLES,
    requires_approval: true,
    rate_limit_per_hour: 10,
    timeout_ms: 15_000,
  };
}

const GATEWAY_DISCLOSURE = [
  'Authorization and API traffic traverse an externally hosted connector gateway domain that a technical user can observe in network inspection.',
  'OAuth consent screens are served by the provider and by the centrally managed connector application, not by AURA.',
  'Infrastructure-level white-labelling is not claimed for this binding.',
];

export const MANAGED_CONNECTOR_MANIFEST: ManifestEntry[] = [
  {
    connector_definition_id: 'search_analytics',
    display_provider: 'Search analytics (web presence)',
    connection_class: 'MANAGED_SHARED',
    eligibility: 'RUNTIME_SHARED_SUPPORTED',
    gateway_connector_key: 'google_search_console',
    linked_to_project: true,
    supported_operations: [
      readOperation('search_analytics.sites.list', 'List verified properties'),
      readOperation('search_analytics.query', 'Query search performance'),
    ],
    data_classes: ['web_presence_metrics'],
    disclosure_limitations: GATEWAY_DISCLOSURE,
    native_required_reason: null,
    health_probe: { operation_id: 'search_analytics.sites.list', path: '/webmasters/v3/sites' },
    verified_at: '2026-08-17',
    evidence_note:
      'Connection is linked to this project and routes through the managed connector gateway. Not an operational data-centre telemetry source.',
  },
  {
    connector_definition_id: 'workspace_documents',
    display_provider: 'Workspace documents',
    connection_class: 'MANAGED_USER',
    eligibility: 'PLATFORM_SUPPORTED_NOT_LINKED',
    gateway_connector_key: null,
    linked_to_project: false,
    supported_operations: [readOperation('workspace_documents.list', 'List documents the user has granted')],
    data_classes: ['operational_documents'],
    disclosure_limitations: [
      ...GATEWAY_DISCLOSURE,
      'The per-user OAuth callback is served by the connector gateway host, not by an AURA domain.',
    ],
    native_required_reason: null,
    health_probe: null,
    verified_at: '2026-08-17',
    evidence_note:
      'Per-user connector class is supported by the platform, but no connector client is configured for this project, so no user can authorize it yet.',
  },
  {
    connector_definition_id: 'servicenow',
    display_provider: 'ServiceNow',
    connection_class: 'AURA_NATIVE',
    eligibility: 'NATIVE_RUNTIME_REQUIRED',
    gateway_connector_key: null,
    linked_to_project: false,
    supported_operations: [],
    data_classes: ['work_orders'],
    disclosure_limitations: [],
    health_probe: null,
    native_required_reason:
      'AURA_NATIVE_REQUIRED: the deployment contract for incident and change data forbids any third-party OAuth intermediary.',
    verified_at: '2026-08-17',
    evidence_note: 'No managed substitution is permitted. An AURA-owned integration must be built.',
  },
  ...(
    [
      ['mqtt_transport', 'MQTT', 'Verified against a disposable test broker only. Cloud runtime acceptance is blocked.', 'BLOCKED_MISSING_DEPLOYMENT'],
      ['dsx_exchange', 'DSX Exchange', 'Not deployed. Local harness only.', 'BLOCKED_MISSING_DEPLOYMENT'],
      ['bms_edge_gateway', 'BMS edge gateway', 'No operational BMS source is connected.', 'NATIVE_RUNTIME_REQUIRED'],
      ['bacnet_ip', 'BACnet/IP', 'Long-lived OT subscription. Managed gateway cannot host it.', 'NATIVE_RUNTIME_REQUIRED'],
      ['modbus_tcp', 'Modbus TCP', 'Long-lived OT subscription. Managed gateway cannot host it.', 'NATIVE_RUNTIME_REQUIRED'],
      ['opcua', 'OPC UA', 'Long-lived OT subscription. Managed gateway cannot host it.', 'NATIVE_RUNTIME_REQUIRED'],
      ['snmp', 'SNMP', 'Long-lived polling. Managed gateway cannot host it.', 'NATIVE_RUNTIME_REQUIRED'],
      ['dcim_rest', 'DCIM', 'No operational DCIM source is connected.', 'NATIVE_RUNTIME_REQUIRED'],
    ] as const
  ).map(([id, provider, note, eligibility]): ManifestEntry => ({
    connector_definition_id: id,
    display_provider: provider,
    connection_class: id === 'dsx_exchange' ? 'EXTERNAL_DSX_RUNTIME' : 'AURA_NATIVE',
    eligibility: eligibility as RuntimeEligibility,
    gateway_connector_key: null,
    linked_to_project: false,
    supported_operations: [],
    data_classes: [],
    disclosure_limitations: [],
    health_probe: null,
    native_required_reason:
      'AURA_NATIVE_REQUIRED: industrial or long-lived transport. Short-lived managed functions cannot hold the subscription.',
    verified_at: '2026-08-17',
    evidence_note: note,
  })),
];

export function manifestEntry(connectorDefinitionId: string): ManifestEntry | null {
  return MANAGED_CONNECTOR_MANIFEST.find((e) => e.connector_definition_id === connectorDefinitionId) ?? null;
}

export function operationFor(entry: ManifestEntry, operationId: string): ManagedOperation | null {
  return entry.supported_operations.find((op) => op.id === operationId) ?? null;
}

/** A connector is selectable at runtime only when eligibility is proven. */
export function isRuntimeSelectable(entry: ManifestEntry): boolean {
  return (
    (entry.eligibility === 'RUNTIME_SHARED_SUPPORTED' || entry.eligibility === 'RUNTIME_USER_SUPPORTED') &&
    entry.linked_to_project
  );
}