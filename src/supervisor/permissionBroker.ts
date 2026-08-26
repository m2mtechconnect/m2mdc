/**
 * Enterprise Readiness Supervisor — permission broker (Phase 1).
 *
 * Governs how the supervisor is activated and what it may do against each
 * connected surface. The broker is deterministic and in-memory: it holds no
 * credentials, never touches secret managers, and ships no autonomous
 * mutation tooling. Its job is to make three states impossible to confuse:
 *
 *   configured  — the capability exists in the connector catalog.
 *   granted     — an active, least-privilege grant with recorded approval
 *                 exists for the actor and scope.
 *   completed   — an audit record proves the action ran and reports result.
 *
 * Fail-closed rules:
 *  - Automatic invocation (edit completion, change review, preview
 *    qualification, deployment request, post-publish smoke) is ALWAYS
 *    read-only and never changes user authorization.
 *  - Unknown connectors/capabilities, unavailable connectors and missing
 *    approvals all deny.
 *  - Merges, destructive data actions, database migrations and production
 *    publication ALWAYS require human approval, even with a scoped grant.
 *  - Credentials never enter this module; they stay in platform secret
 *    managers and are issued per task by the platform, not by the browser.
 */

// ---------------------------------------------------------------------------
// Activation
// ---------------------------------------------------------------------------

export const ACTIVATION_MODES = [
  'manual',
  'automatic-read-only',
  'elevated-approval-required',
] as const;
export type ActivationMode = (typeof ACTIVATION_MODES)[number];

export const ACTIVATION_TRIGGERS = [
  'manual-open',
  'edit-completion',
  'change-review',
  'preview-qualification',
  'deployment-request',
  'post-publish-smoke',
] as const;
export type ActivationTrigger = (typeof ACTIVATION_TRIGGERS)[number];

export const AUTOMATIC_TRIGGERS: readonly ActivationTrigger[] = [
  'edit-completion',
  'change-review',
  'preview-qualification',
  'deployment-request',
  'post-publish-smoke',
];

export interface Activation {
  mode: ActivationMode;
  trigger: ActivationTrigger;
  /** Automatic invocation is read-only and grants no new permissions. */
  readOnly: boolean;
  note: string;
}

export function resolveActivation(trigger: ActivationTrigger): Activation {
  if (trigger === 'manual-open') {
    return {
      mode: 'manual',
      trigger,
      readOnly: true,
      note: 'Manual access from the AURA route. Assessment remains read-only until a scoped grant is recorded.',
    };
  }
  return {
    mode: 'automatic-read-only',
    trigger,
    readOnly: true,
    note: 'Automatic invocation is read-only assessment only. It never changes user authorization and never grants itself new permissions.',
  };
}

// ---------------------------------------------------------------------------
// Connector catalog
// ---------------------------------------------------------------------------

export const CONNECTOR_IDS = ['github', 'lovable', 'browser', 'supabase', 'production'] as const;
export type ConnectorId = (typeof CONNECTOR_IDS)[number];

export type ConnectorState = 'connected' | 'unavailable' | 'not-assessed';

export interface ConnectorPolicy {
  id: ConnectorId;
  label: string;
  /** Default plane: safe reads the supervisor may perform in any mode. */
  defaultCapabilities: readonly string[];
  /** Elevated plane: require an explicitly scoped, recorded approval. */
  elevatedCapabilities: readonly string[];
  /** Always require human approval, even with a scoped write grant. */
  humanApprovalAlways: readonly string[];
  /**
   * Truthful connector state from available evidence. Phase 1 has no live
   * connector handshake inside the browser bundle, so nothing may report
   * "connected" without an evidence reference.
   */
  state: ConnectorState;
  stateEvidenceRef: string | null;
  stateNote: string;
}

/**
 * Approved connector defaults. Every state is 'not-assessed' in Phase 1:
 * the browser bundle holds no connector credentials and no handshake
 * evidence, so claiming "connected" would be fabrication.
 */
export const CONNECTOR_POLICIES: readonly ConnectorPolicy[] = [
  {
    id: 'github',
    label: 'GitHub',
    defaultCapabilities: ['read-repository', 'read-commits', 'read-diffs', 'read-checks', 'read-pr-metadata'],
    elevatedCapabilities: ['review-comments', 'remediation-changes'],
    humanApprovalAlways: ['merge'],
    state: 'not-assessed',
    stateEvidenceRef: null,
    stateNote: 'No live GitHub handshake is established from the browser bundle. CI check evidence is indexed as repository metadata only.',
  },
  {
    id: 'lovable',
    label: 'Lovable',
    defaultCapabilities: ['read-project-status', 'read-files', 'read-messages', 'read-diffs', 'read-preview'],
    elevatedCapabilities: ['send-edits'],
    humanApprovalAlways: ['production-publish'],
    state: 'not-assessed',
    stateEvidenceRef: null,
    stateNote: 'Project status is observable to the editor session but no independent connector evidence is recorded for this assessment.',
  },
  {
    id: 'browser',
    label: 'Browser',
    defaultCapabilities: ['navigate-approved-routes', 'inspect-accessible-dom', 'capture-screenshots'],
    elevatedCapabilities: ['form-submission', 'account-changes', 'destructive-ui-actions'],
    humanApprovalAlways: [],
    state: 'not-assessed',
    stateEvidenceRef: null,
    stateNote: 'Preview and production reachability are verified per run; no standing browser session state is assumed.',
  },
  {
    id: 'supabase',
    label: 'Supabase (managed backend)',
    defaultCapabilities: ['approved-schema-reads', 'approved-diagnostic-reads'],
    elevatedCapabilities: ['migrations', 'data-writes', 'service-role-operations'],
    humanApprovalAlways: ['migrations', 'destructive-data-actions'],
    state: 'not-assessed',
    stateEvidenceRef: null,
    stateNote: 'Schema and diagnostic reads use approved channels only. Elevated operations require separate scoped credentials that are never held by this module.',
  },
  {
    id: 'production',
    label: 'Production',
    defaultCapabilities: ['health-checks', 'smoke-tests'],
    elevatedCapabilities: [],
    humanApprovalAlways: ['configuration-change', 'data-mutation', 'production-publish'],
    state: 'not-assessed',
    stateEvidenceRef: null,
    stateNote: 'Health checks and smoke tests only. No autonomous configuration or data mutation path exists.',
  },
];

export function connectorPolicy(id: ConnectorId): ConnectorPolicy {
  const policy = CONNECTOR_POLICIES.find((p) => p.id === id);
  if (!policy) throw new Error(`unknown connector: ${id}`);
  return policy;
}

// ---------------------------------------------------------------------------
// Grants, audit and decisions
// ---------------------------------------------------------------------------

export interface ApprovalRecord {
  required: boolean;
  recorded: boolean;
  approver?: string;
  reference?: string;
}

export interface PermissionGrant {
  id: string;
  actor: string;
  connector: ConnectorId;
  capability: string;
  scope: string;
  approval: ApprovalRecord;
  issuedAt: string;
  /** Grants are time-bounded where the platform supports it. */
  expiresAt: string | null;
  revocable: true;
  status: 'active' | 'revoked' | 'expired';
}

export interface BrokerAuditRecord {
  actor: string;
  requestedCapability: string;
  connector: ConnectorId;
  scope: string;
  approval: ApprovalRecord;
  action: string;
  result: 'allowed' | 'denied';
  denialReason: string | null;
  evidenceRef: string | null;
}

export interface CapabilityRequest {
  actor: string;
  connector: ConnectorId;
  capability: string;
  scope: string;
  approval?: ApprovalRecord;
}

export interface BrokerDecision {
  allowed: boolean;
  denialReason: string | null;
  audit: BrokerAuditRecord;
}

const audit = (
  request: CapabilityRequest,
  action: string,
  result: 'allowed' | 'denied',
  denialReason: string | null,
  evidenceRef: string | null,
): BrokerAuditRecord => ({
  actor: request.actor,
  requestedCapability: request.capability,
  connector: request.connector,
  scope: request.scope,
  approval: request.approval ?? { required: true, recorded: false },
  action,
  result,
  denialReason,
  evidenceRef,
});

const decide = (
  request: CapabilityRequest,
  allowed: boolean,
  denialReason: string | null,
  evidenceRef: string | null = null,
): BrokerDecision => ({
  allowed,
  denialReason,
  audit: audit(request, request.capability, allowed ? 'allowed' : 'denied', denialReason, evidenceRef),
});

/**
 * Evaluate a capability request. Pure and fail-closed: every ambiguity
 * denies. Phase 1 records decisions; it never executes mutations.
 *
 * `policies` is injectable so qualification can exercise hypothetical
 * connector states without mutating the governed catalog.
 */
export function evaluateCapabilityRequest(
  request: CapabilityRequest,
  activation: Activation,
  grants: readonly PermissionGrant[] = [],
  policies: readonly ConnectorPolicy[] = CONNECTOR_POLICIES,
): BrokerDecision {
  const policy = policies.find((p) => p.id === request.connector);
  if (!policy) {
    return decide(request, false, 'unknown-connector');
  }

  const isDefault = policy.defaultCapabilities.includes(request.capability);
  const isElevated = policy.elevatedCapabilities.includes(request.capability);
  const isHumanOnly = policy.humanApprovalAlways.includes(request.capability);
  if (!isDefault && !isElevated && !isHumanOnly) {
    return decide(request, false, 'unknown-capability');
  }

  // Fail closed when the connector is unavailable or its state is unproven.
  if (policy.state !== 'connected') {
    return decide(request, false, 'connector-unavailable');
  }

  // Automatic invocation is read-only: only the default (read) plane.
  if (activation.mode === 'automatic-read-only' && !isDefault) {
    return decide(request, false, 'automatic-invocation-read-only');
  }

  if (isDefault) {
    return decide(request, true, null);
  }

  // Elevated and human-only capabilities need a recorded approval.
  if (!request.approval?.recorded) {
    return decide(request, false, 'approval-required');
  }

  // Human-approval-only actions never execute on a grant alone.
  if (isHumanOnly) {
    return decide(request, false, 'human-approval-mandatory');
  }

  // Elevated actions additionally require an active scoped grant.
  const grant = grants.find(
    (g) =>
      g.actor === request.actor
      && g.connector === request.connector
      && g.capability === request.capability
      && g.status === 'active'
      && g.approval.recorded,
  );
  if (!grant) {
    return decide(request, false, 'no-active-grant');
  }

  return decide(request, true, null, grant.id);
}

// ---------------------------------------------------------------------------
// Configured vs granted vs completed
// ---------------------------------------------------------------------------

/** The capability exists in the connector catalog. Nothing more. */
export function capabilityConfigured(connector: ConnectorId, capability: string): boolean {
  const policy = connectorPolicy(connector);
  return (
    policy.defaultCapabilities.includes(capability)
    || policy.elevatedCapabilities.includes(capability)
    || policy.humanApprovalAlways.includes(capability)
  );
}

/** An active, approved grant exists for the actor, connector and capability. */
export function permissionGranted(
  grants: readonly PermissionGrant[],
  actor: string,
  connector: ConnectorId,
  capability: string,
): boolean {
  return grants.some(
    (g) =>
      g.actor === actor
      && g.connector === connector
      && g.capability === capability
      && g.status === 'active'
      && g.approval.recorded,
  );
}

/** An audit record proves the action ran with a successful result. */
export function actionCompleted(
  auditLog: readonly BrokerAuditRecord[],
  actor: string,
  connector: ConnectorId,
  capability: string,
): boolean {
  return auditLog.some(
    (r) =>
      r.actor === actor
      && r.connector === connector
      && r.requestedCapability === capability
      && r.result === 'allowed'
      && r.evidenceRef !== null,
  );
}

// ---------------------------------------------------------------------------
// Knowledge hygiene (broker plane)
// ---------------------------------------------------------------------------

/**
 * Material that must never enter supervisor knowledge from any connector:
 * browser cookies, passwords, tokens, session storage, service-role
 * credentials, secrets, raw tenant data and personal data.
 */
export const BROKER_INGESTION_BANS = [
  'browser-cookies',
  'passwords',
  'tokens',
  'session-storage',
  'service-role-credentials',
  'secrets',
  'raw-tenant-data',
  'personal-data',
] as const;
