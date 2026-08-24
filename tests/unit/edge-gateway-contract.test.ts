import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { EDGE_GATEWAY_CAPABILITIES } from '../../src/edge/edgeGatewayCapabilities';

const read = (relativePath: string) => fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
const migration = read('supabase/migrations/20260823235000_edge_gateway_contract.sql');
const remediation = read('supabase/migrations/20260824003000_enterprise_audit_remediation.sql');

describe('AURA Edge Gateway contract', () => {
  it('binds every gateway to an organization and validates facility/twin scope', () => {
    expect(migration).toContain('CREATE TABLE public.edge_gateways');
    expect(migration).toContain('org_id uuid NOT NULL REFERENCES public.organizations(id)');
    expect(migration).toContain('facility_id uuid REFERENCES public.sovereign_dc_facilities(id)');
    expect(migration).toContain('twin_id uuid REFERENCES public.data_centre_twins(id)');
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.validate_edge_gateway_scope()');
    expect(migration).toContain('edge gateway facility must belong to the same organization');
    expect(migration).toContain('edge gateway twin must belong to the same organization');
  });

  it('keeps gateway state service-controlled until signed enrollment exists', () => {
    expect(migration).toContain('GRANT SELECT ON public.edge_gateways TO authenticated');
    expect(migration).toContain('GRANT ALL ON public.edge_gateways TO service_role');
    expect(migration).toContain('ALTER TABLE public.edge_gateways ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('CREATE POLICY edge_gateways_read');
    expect(migration).not.toMatch(/CREATE\s+POLICY\s+edge_gateways_.*(?:insert|update|write|delete)/i);
    expect(migration).not.toMatch(/GRANT\s+(?:INSERT|UPDATE|DELETE|ALL)[^;]+edge_gateways\s+TO\s+authenticated/i);
  });

  it('stores identity references rather than raw credentials', () => {
    expect(migration).toContain('certificate_fingerprint text');
    expect(migration).toContain('credential_reference text');
    expect(migration).not.toMatch(/\bpassword\s+text\b/i);
    expect(migration).not.toMatch(/\bsecret\s+text\b/i);
    expect(migration).not.toMatch(/\baccess_token\s+text\b/i);
  });

  it('does not overclaim industrial protocol support', () => {
    expect(EDGE_GATEWAY_CAPABILITIES.some((capability) => capability.status === 'AVAILABLE')).toBe(false);
    expect(EDGE_GATEWAY_CAPABILITIES.find((capability) => capability.id === 'mqtt-transport')?.status).toBe('PARTIAL');
    for (const id of ['snmp', 'bacnet', 'modbus', 'redfish', 'opc-ua']) {
      expect(EDGE_GATEWAY_CAPABILITIES.find((capability) => capability.id === id)?.status).toBe('PLANNED');
    }
  });

  it('adds gateway inventory counts without claiming connectivity', () => {
    expect(remediation).toContain("'edgeGatewayCount', (SELECT count(*) FROM public.edge_gateways");
    expect(remediation).toContain("'onlineEdgeGatewayCount', (SELECT count(*) FROM public.edge_gateways");
    expect(remediation).not.toContain("'edgeConnected', true");
  });
});
