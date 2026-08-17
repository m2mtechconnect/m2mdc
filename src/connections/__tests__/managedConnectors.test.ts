import { describe, expect, it } from 'vitest';
import {
  CONNECTION_CLASS_LABEL,
  EXTERNAL_AUTHORIZATION_NOTICE,
  authorizeManagedOperation,
  isRuntimeSelectable,
  type AuthorizationContext,
  type ManagedOperation,
} from '../managedConnectors';

const readOp: ManagedOperation = {
  id: 'search_analytics.query',
  label: 'Query search performance',
  classification: 'READ',
  allowed_roles: ['owner', 'admin', 'engineer'],
  requires_approval: false,
  rate_limit_per_hour: 60,
  timeout_ms: 15000,
};

const writeOp: ManagedOperation = { ...readOp, id: 'w', classification: 'WRITE', allowed_roles: ['admin'], requires_approval: true, rate_limit_per_hour: 10 };

function ctx(overrides: Partial<AuthorizationContext> = {}): AuthorizationContext {
  return {
    actor_id: 'user-1',
    actor_roles: ['engineer'],
    actor_tenant_id: 'tenant-a',
    connection: {
      id: 'conn-1',
      tenant_id: 'tenant-a',
      facility_id: null,
      binding_class: 'MANAGED_SHARED',
      platform_binding_state: 'LINKED',
      enabled: true,
      status: 'HEALTHY',
    },
    requested_facility_id: null,
    operation: readOp,
    approval: null,
    invocations_last_hour: 0,
    now: new Date('2026-08-17T00:00:00Z'),
    ...overrides,
  };
}

describe('managed shared connector authorization', () => {
  it('allows an authorized read', () => {
    expect(authorizeManagedOperation(ctx()).allowed).toBe(true);
  });

  it('rejects a connector that is not a managed shared binding', () => {
    const d = authorizeManagedOperation(ctx({ connection: { ...ctx().connection, binding_class: 'AURA_NATIVE' } }));
    expect(d).toMatchObject({ allowed: false, reason_code: 'not_managed_shared' });
  });

  it('rejects an unlinked platform binding', () => {
    const d = authorizeManagedOperation(ctx({ connection: { ...ctx().connection, platform_binding_state: 'NOT_LINKED' } }));
    expect(d.reason_code).toBe('binding_not_linked');
  });

  it('fails closed for a revoked connection', () => {
    const d = authorizeManagedOperation(ctx({ connection: { ...ctx().connection, enabled: false } }));
    expect(d.reason_code).toBe('connection_revoked');
  });

  it('rejects cross-tenant access', () => {
    const d = authorizeManagedOperation(ctx({ actor_tenant_id: 'tenant-b' }));
    expect(d.reason_code).toBe('tenant_scope_violation');
  });

  it('rejects a facility outside the connection scope', () => {
    const d = authorizeManagedOperation(
      ctx({ connection: { ...ctx().connection, facility_id: 'fac-1' }, requested_facility_id: 'fac-2' }),
    );
    expect(d.reason_code).toBe('facility_scope_violation');
  });

  it('rejects an operation that is not allowlisted', () => {
    expect(authorizeManagedOperation(ctx({ operation: null })).reason_code).toBe('operation_not_allowlisted');
  });

  it('rejects a role that is not permitted', () => {
    expect(authorizeManagedOperation(ctx({ actor_roles: ['viewer'] })).reason_code).toBe('role_not_permitted');
  });

  it('requires approval for a write', () => {
    const d = authorizeManagedOperation(ctx({ operation: writeOp, actor_roles: ['admin'] }));
    expect(d.reason_code).toBe('approval_required');
  });

  it('rejects an expired approval', () => {
    const d = authorizeManagedOperation(
      ctx({
        operation: writeOp,
        actor_roles: ['admin'],
        approval: { status: 'APPROVED', expires_at: '2026-08-16T00:00:00Z' },
      }),
    );
    expect(d.reason_code).toBe('approval_expired');
  });

  it('allows an approved, unexpired write', () => {
    const d = authorizeManagedOperation(
      ctx({
        operation: writeOp,
        actor_roles: ['admin'],
        approval: { status: 'APPROVED', expires_at: '2026-08-18T00:00:00Z' },
      }),
    );
    expect(d.allowed).toBe(true);
  });

  it('enforces the hourly rate ceiling', () => {
    expect(authorizeManagedOperation(ctx({ invocations_last_hour: 60 })).reason_code).toBe('rate_limited');
  });
});

describe('runtime eligibility', () => {
  it('never treats a build-time connector as runtime available', () => {
    expect(isRuntimeSelectable({ eligibility: 'BUILD_CHAT_ONLY', linked_to_project: true })).toBe(false);
  });

  it('never treats a supported but unlinked connector as selectable', () => {
    expect(isRuntimeSelectable({ eligibility: 'RUNTIME_SHARED_SUPPORTED', linked_to_project: false })).toBe(false);
  });

  it('selects only a linked, proven binding', () => {
    expect(isRuntimeSelectable({ eligibility: 'RUNTIME_SHARED_SUPPORTED', linked_to_project: true })).toBe(true);
  });
});

describe('customer-facing terminology', () => {
  it('uses AURA terminology for every connection class', () => {
    Object.values(CONNECTION_CLASS_LABEL).forEach((label) => {
      expect(label.toLowerCase()).not.toContain('lovable');
    });
  });

  it('does not claim the user stays inside AURA during external authorization', () => {
    expect(EXTERNAL_AUTHORIZATION_NOTICE).toContain('leaves AURA');
  });
});