/**
 * AURA connection classes and managed connector presentation model.
 *
 * Customer-facing terminology only. AURA is the product; the implementation
 * platform behind a managed binding is never named in this module, in any
 * string it exports, or in anything rendered from it.
 *
 * The authorization mirror below explains a decision in the UI. It is NOT the
 * gate: the authoritative check runs server-side in
 * `supabase/functions/_shared/managedConnectorAuthz.ts`, and the two
 * implementations are kept identical by the unit suite.
 */

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

export const CONNECTION_CLASS_LABEL: Record<ConnectionClass, string> = {
  MANAGED_SHARED: 'AURA Managed Shared Connector',
  MANAGED_USER: 'AURA Managed User Connection',
  AURA_NATIVE: 'AURA Native Connector',
  EXTERNAL_DSX_RUNTIME: 'External DSX Runtime',
};

export const CONNECTION_CLASS_DESCRIPTION: Record<ConnectionClass, string> = {
  MANAGED_SHARED:
    'One AURA-controlled provider account is shared by the application. Managed authentication resolves the credential in trusted server-side code; every operation is re-authorized against your tenant, facility, role and approval state.',
  MANAGED_USER:
    'Each person authorizes their own provider account. Tokens stay inside the secure connector gateway; AURA stores a non-secret evidence record only.',
  AURA_NATIVE:
    'An AURA-owned worker holds the connection. Credentials live in the AURA credential vault and never leave AURA infrastructure.',
  EXTERNAL_DSX_RUNTIME:
    'An external DSX runtime owns the exchange. AURA records the binding and its evidence but does not host the transport.',
};

export const ELIGIBILITY_LABEL: Record<RuntimeEligibility, string> = {
  RUNTIME_SHARED_SUPPORTED: 'Available to the application',
  RUNTIME_USER_SUPPORTED: 'Available per user',
  PLATFORM_SUPPORTED_NOT_LINKED: 'Supported, not linked',
  BUILD_CHAT_ONLY: 'Build-time only',
  NATIVE_RUNTIME_REQUIRED: 'Native runtime required',
  BLOCKED_MISSING_CREDENTIAL: 'Blocked: credential missing',
  BLOCKED_MISSING_DEPLOYMENT: 'Blocked: not deployed',
  UNSUPPORTED: 'Unsupported',
  NOT_VERIFIED: 'Not verified',
};

export const ELIGIBILITY_TONE: Record<RuntimeEligibility, 'positive' | 'caution' | 'critical' | 'neutral'> = {
  RUNTIME_SHARED_SUPPORTED: 'positive',
  RUNTIME_USER_SUPPORTED: 'positive',
  PLATFORM_SUPPORTED_NOT_LINKED: 'caution',
  BUILD_CHAT_ONLY: 'neutral',
  NATIVE_RUNTIME_REQUIRED: 'caution',
  BLOCKED_MISSING_CREDENTIAL: 'critical',
  BLOCKED_MISSING_DEPLOYMENT: 'critical',
  UNSUPPORTED: 'neutral',
  NOT_VERIFIED: 'neutral',
};

/**
 * A build-time chat connector is never an operational AURA integration, and a
 * connector that is merely supported by the platform is not selectable until
 * an operator has verified the project binding.
 */
export function isRuntimeSelectable(entry: { eligibility: RuntimeEligibility; linked_to_project: boolean }): boolean {
  return (
    (entry.eligibility === 'RUNTIME_SHARED_SUPPORTED' || entry.eligibility === 'RUNTIME_USER_SUPPORTED') &&
    entry.linked_to_project
  );
}

/** Copy shown when authorization must leave AURA. Deliberately not reassuring. */
export const EXTERNAL_AUTHORIZATION_NOTICE =
  'Continue to the provider\u2019s secure authorization service. This step leaves AURA, and the external authorization domain is visible in the browser address bar and in network inspection.';

export type OperationClassification = 'READ' | 'WRITE';

export interface ManagedOperation {
  id: string;
  label: string;
  classification: OperationClassification;
  allowed_roles: string[];
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
  approval: { status: string; expires_at: string | null } | null;
  invocations_last_hour: number;
  now: Date;
}

export interface AuthorizationDecision {
  allowed: boolean;
  reason_code: string;
  safe_message: string;
}

function deny(reason_code: string, safe_message: string): AuthorizationDecision {
  return { allowed: false, reason_code, safe_message };
}

/** Mirror of the server gate. Default deny; order matters. */
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
  return { allowed: true, reason_code: 'authorized', safe_message: 'Authorized.' };
}

export interface ManagedCapabilityEntry {
  connector_definition_id: string;
  provider: string;
  connection_class: ConnectionClass;
  eligibility: RuntimeEligibility;
  linked_to_project: boolean;
  runtime_selectable: boolean;
  data_classes: string[];
  operations: Array<{
    id: string;
    label: string;
    classification: OperationClassification;
    requires_approval: boolean;
    rate_limit_per_hour: number;
    permitted_for_caller: boolean;
  }>;
  disclosure_limitations: string[];
  native_required_reason: string | null;
  verified_at: string | null;
  evidence_note: string;
  user_binding: {
    status: string;
    granted_scopes: string[];
    provider_account_label: string | null;
    consented_at: string | null;
    last_success_at: string | null;
    revoked_at: string | null;
  } | null;
}