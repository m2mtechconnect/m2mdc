/**
 * Supervisor runtime boundary (Phase 1).
 *
 * The active runtime is deterministic and local: the assessment is computed
 * from repository evidence in the browser bundle with no network calls and
 * no mutation capability.
 *
 * Managed agent runtimes (NeMo Agent Toolkit, NIM microservices, or other
 * hosted runtimes) are integration BOUNDARIES ONLY. The interface below is
 * the seam a future adapter would implement; nothing here claims such a
 * runtime is deployed, connected or available.
 */

export type SupervisorRuntimeKind = 'deterministic-local' | 'managed-agent-runtime';

export interface SupervisorRuntimeStatus {
  kind: SupervisorRuntimeKind;
  /** 'active' means it executes today; 'integration-boundary-only' means it does not. */
  state: 'active' | 'integration-boundary-only';
  label: string;
  note: string;
}

/** The runtime that actually powers Phase 1. */
export const ACTIVE_RUNTIME: SupervisorRuntimeStatus = {
  kind: 'deterministic-local',
  state: 'active',
  label: 'Deterministic local assessment',
  note: 'Read-only evaluation over repository and route metadata. No autonomous production mutation tools exist in this phase.',
};

/** Future managed runtimes. Boundary definitions only — none are deployed. */
export const RUNTIME_BOUNDARIES: SupervisorRuntimeStatus[] = [
  {
    kind: 'managed-agent-runtime',
    state: 'integration-boundary-only',
    label: 'NeMo Agent Toolkit adapter',
    note: 'Interface reserved for a governed multi-specialist agent graph. Not configured, connected or deployed.',
  },
  {
    kind: 'managed-agent-runtime',
    state: 'integration-boundary-only',
    label: 'NIM microservice adapter',
    note: 'Interface reserved for managed inference endpoints. Not configured, connected or deployed.',
  },
];

/**
 * Adapter seam for a future managed runtime. Phase 1 ships no implementation
 * other than the deterministic local path; a managed adapter must prove its
 * own connection evidence before the UI may present it as active.
 */
export interface SupervisorRuntimeAdapter {
  readonly status: SupervisorRuntimeStatus;
  /** True only with live connection evidence. Phase 1 always returns false for managed runtimes. */
  isAvailable(): boolean;
}

export function deterministicLocalAdapter(): SupervisorRuntimeAdapter {
  return {
    status: ACTIVE_RUNTIME,
    isAvailable: () => true,
  };
}
