/**
 * Authorization policy for AURA Managed Shared Connectors.
 *
 * A managed shared connector resolves ONE external account for every AURA
 * visitor, so platform-level linkage must never imply that a signed-in AURA
 * user may invoke it. Every operation is re-authorized here against tenant,
 * facility, role, operation allowlist, read/write classification, explicit
 * approval and a rate ceiling. The default is deny.
 *
 * This module is intentionally pure so the same rules can be unit-tested in
 * `src/connections/managedConnectorPolicy.ts` (identical logic, browser copy
 * used only for explaining decisions in the UI - it is never the gate).
 */

export type OperationClassification = 'READ' | 'WRITE';

export interface ManagedOperation {
  id: string;
  label: string;
  classification: OperationClassification;
  allowed_roles: string[];
  /** Writes always require an approval record, regardless of role. */
  requires_approval: boolean;
  rate_limit_per_hour: number;
  timeout_ms: number;
}

export interface AuthorizationContext {
  actor_id: string;
  actor_roles: string[];
  actor_tenant_id: string | null;
  connection: {
    id: string;
    tenant_id: string | null;
    facility_id: string | null;
    binding_class: string;
    platform_binding_state: string;
    enabled: boolean;
    status: string;
  };
  requested_facility_id: string | null;
  operation: ManagedOperation | null;
  /** PENDING/APPROVED/REVOKED approval row for this operation, if any. */
  approval: { status: string; expires_at: string | null } | null;
  invocations_last_hour: number;
  now: Date;
}

export interface AuthorizationDecision {
  allowed: boolean;
  reason_code: string;
  safe_message: string;
}

const ALLOW: AuthorizationDecision = {
  allowed: true,
  reason_code: 'authorized',
  safe_message: 'Authorized.',
};

function deny(reason_code: string, safe_message: string): AuthorizationDecision {
  return { allowed: false, reason_code, safe_message };
}

export function authorizeManagedOperation(ctx: AuthorizationContext): AuthorizationDecision {
  const c = ctx.connection;

  if (c.binding_class !== 'MANAGED_SHARED') {
    return deny('not_managed_shared', 'This connection is not an AURA Managed Shared Connector.');
  }
  if (c.platform_binding_state !== 'LINKED') {
    return deny('binding_not_linked', 'This connector is not linked for runtime use.');
  }
  if (!c.enabled || c.status === 'DISABLED' || c.status === 'REVOKED') {
    return deny('connection_revoked', 'This connection is disabled or revoked.');
  }
  if (c.tenant_id !== null && c.tenant_id !== ctx.actor_tenant_id) {
    return deny('tenant_scope_violation', 'This connection belongs to another tenant.');
  }
  if (c.facility_id !== null && ctx.requested_facility_id !== null && c.facility_id !== ctx.requested_facility_id) {
    return deny('facility_scope_violation', 'This connection is scoped to a different facility.');
  }
  if (!ctx.operation) {
    return deny('operation_not_allowlisted', 'This operation is not on the connector allowlist.');
  }
  if (!ctx.operation.allowed_roles.some((role) => ctx.actor_roles.includes(role))) {
    return deny('role_not_permitted', 'Your role cannot perform this operation.');
  }
  if (ctx.operation.classification === 'WRITE' || ctx.operation.requires_approval) {
    const approval = ctx.approval;
    if (!approval || approval.status !== 'APPROVED') {
      return deny('approval_required', 'A write operation requires an approved request.');
    }
    if (approval.expires_at && new Date(approval.expires_at).getTime() <= ctx.now.getTime()) {
      return deny('approval_expired', 'The approval for this operation has expired.');
    }
  }
  if (ctx.invocations_last_hour >= ctx.operation.rate_limit_per_hour) {
    return deny('rate_limited', 'The hourly limit for this operation has been reached.');
  }
  return ALLOW;
}