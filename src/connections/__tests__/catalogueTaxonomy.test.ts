import { describe, expect, it } from 'vitest';
import {
  BLUEPRINT_OWNED_CONNECTOR_IDS,
  CUSTOMER_HIDDEN_CONNECTOR_IDS,
  HYBRID_STACK_GROUPS,
  connectorStackNote,
  customerConnectorGroupOf,
  isCustomerVisibleConnector,
} from '../catalogueTaxonomy';
import { canAddConnection, type ConnectorDefinition } from '../model';

const definition = (id: string, over: Partial<ConnectorDefinition> = {}): ConnectorDefinition => ({
  id,
  name: id,
  category: 'Facility and OT',
  provider: 'Generic',
  version: '0.0.0',
  implementation_status: 'PLANNED',
  supported_directions: ['READ'],
  supported_auth_methods: [],
  supported_data_classes: [],
  supported_protocols: [],
  configuration_schema: {},
  mapping_required: false,
  documentation_url: null,
  validation_status: 'UNVALIDATED',
  runtime_adapter: null,
  availability: 'UNAVAILABLE',
  capability_evidence: [],
  ...over,
});

describe('customer-facing hybrid-stack catalogue', () => {
  it('keeps internal, knowledge and Blueprint-owned capabilities out of operational Connections', () => {
    for (const id of CUSTOMER_HIDDEN_CONNECTOR_IDS) {
      expect(isCustomerVisibleConnector(definition(id)), id).toBe(false);
    }
    for (const id of BLUEPRINT_OWNED_CONNECTOR_IDS) {
      expect(isCustomerVisibleConnector(definition(id, { category: 'Assets and engineering' })), id).toBe(false);
    }
  });

  it('maps core hybrid-stack connectors to durable customer groups', () => {
    expect(customerConnectorGroupOf(definition('redfish'))).toBe('facility_ot');
    expect(customerConnectorGroupOf(definition('nvidia_dcgm'))).toBe('facility_ot');
    expect(customerConnectorGroupOf(definition('mqtt_transport'))).toBe('edge_exchange');
    expect(customerConnectorGroupOf(definition('dsx_ingest_gateway'))).toBe('edge_exchange');
    expect(customerConnectorGroupOf(definition('dsx_exchange', { category: 'DSX Exchange' }))).toBe('edge_exchange');
    expect(customerConnectorGroupOf(definition('ddn_infinia', { category: 'Assets and engineering' }))).toBe('twin_storage');
    expect(customerConnectorGroupOf(definition('servicenow', { category: 'Workflow and enterprise' }))).toBe('enterprise_workflow');
    expect(customerConnectorGroupOf(definition('prometheus', { category: 'Cloud and infrastructure' }))).toBe('observability');
    expect(customerConnectorGroupOf(definition('aws', { category: 'Cloud and infrastructure' }))).toBe('cloud_optional');
    expect(customerConnectorGroupOf(definition('rest_api', { category: 'Workflow and enterprise' }))).toBe('custom');
  });

  it('keeps the customer group order aligned to the physical-to-enterprise data path', () => {
    expect(HYBRID_STACK_GROUPS.map((group) => group.id)).toEqual([
      'facility_ot',
      'edge_exchange',
      'twin_storage',
      'enterprise_workflow',
      'observability',
      'cloud_optional',
      'custom',
    ]);
  });

  it('does not imply DDN from the currently verified AURA-managed OpenUSD storage', () => {
    const note = connectorStackNote(definition('openusd_storage', {
      name: 'OpenUSD asset storage',
      implementation_status: 'IMPLEMENTED',
      runtime_adapter: 'supabase-storage',
      availability: 'AVAILABLE',
    }));
    expect(note).toContain('does not prove DDN Infinia');
  });

  it('keeps target Redfish, DCGM and DDN definitions non-addable without runtime adapters', () => {
    for (const id of ['redfish', 'nvidia_dcgm', 'ddn_infinia']) {
      expect(canAddConnection(definition(id)), id).toBe(false);
    }
  });

  it('states the critical deployment and data-flow limitations explicitly', () => {
    expect(connectorStackNote(definition('dsx_ingest_gateway'))).toContain('not that facility data is flowing');
    expect(connectorStackNote(definition('dsx_exchange'))).toContain('not deployed');
    expect(connectorStackNote(definition('mqtt_transport'))).toContain('runtime wiring');
    expect(connectorStackNote(definition('ddn_infinia'))).toContain('not deployed');
  });
});
