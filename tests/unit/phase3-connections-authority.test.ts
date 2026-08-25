import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('Phase 3 Connections authority contract', () => {
  it('resolves tenant authority from active_org_id and treats null tenant as denied', () => {
    const source = read('supabase/functions/_shared/connectionTenant.ts');
    expect(source).toContain("caller.rpc('active_org_id')");
    expect(source).toContain("caller.rpc('org_has_role'");
    expect(source).toContain('Boolean(rowTenantId && callerTenantId && rowTenantId === callerTenantId)');
    expect(source).not.toContain("from('profiles')");
  });

  it('never widens browser connection reads to null-tenant platform scope', () => {
    const source = read('src/connections/api.ts');
    expect(source).toContain(".eq('tenant_id', tenantId)");
    expect(source).not.toContain('tenant_id.is.null');
    expect(source).toContain("row.metadata?.provisioned !== 'default_starter_twin'");
  });

  it('does not expose a platform-wide customer tenant selector', () => {
    const source = read('src/components/connections/ConnectionSetupWizard.tsx');
    expect(source).not.toContain('Platform-wide (no tenant)');
    expect(source).not.toContain('useTenantOptions');
    expect(source).not.toContain('tenant_id: draft.tenant_id');
    expect(source).toContain('Cross-organization and platform-wide customer scopes are not available');
  });

  it('derives connection tenant and facility authority server-side', () => {
    const source = read('supabase/functions/connection-provision/index.ts');
    expect(source).toContain('tenant_id: callerTenantId');
    expect(source).not.toContain('body.tenant_id');
    expect(source).toContain(".select('id, org_id, metadata')");
    expect(source).toContain("facility.org_id !== callerTenantId");
  });

  it('does not infer connection data flow from platform-wide health evidence', () => {
    const source = read('supabase/functions/connection-health-check/index.ts');
    expect(source).toContain("data_availability: 'not_evaluated'");
    expect(source).not.toContain("from('dsx_events')");
    expect(source).not.toContain('objects_present');
    expect(source).not.toContain('application_records_present');
  });

  it('does not accept a caller-supplied managed gateway path', () => {
    const source = read('supabase/functions/managed-connector-invoke/index.ts');
    expect(source).not.toContain('body.path');
    expect(source).toContain("entry?.health_probe?.operation_id === operationId");
    expect(source).toContain('operation_path_not_resolved');
  });

  it('does not accept a body-supplied OAuth return origin', () => {
    const source = read('supabase/functions/managed-user-oauth-start/index.ts');
    expect(source).not.toContain('body.origin');
    expect(source).toContain("req.headers.get('origin')");
  });

  it('keeps the browser and server managed-connector tenant gates fail closed', () => {
    for (const path of [
      'src/connections/managedConnectors.ts',
      'supabase/functions/_shared/managedConnectorAuthz.ts',
    ]) {
      const source = read(path);
      expect(source).toContain('!c.tenant_id || !ctx.actor_tenant_id || c.tenant_id !== ctx.actor_tenant_id');
    }
  });
});
