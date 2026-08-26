/**
 * Supervisor personas.
 *
 * Selecting a persona re-prioritizes findings and changes the explanation
 * framing. It never changes authorization: the finding set is identical for
 * every persona, and route access is still governed by RBAC guards.
 */
import type { ReadinessFinding, SupervisorPersona, SupervisorPersonaId } from './types';

const SEVERITY_RANK: Record<ReadinessFinding['severity'], number> = {
  blocker: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

export const SUPERVISOR_PERSONAS: SupervisorPersona[] = [
  {
    id: 'executive',
    label: 'Executive',
    narrative:
      'Board-level view: release posture, enterprise risk and client commitments first. Technical detail is summarized; blockers to a production commitment are surfaced ahead of everything else.',
    priorityCategories: ['release', 'security', 'resilience', 'qualification'],
  },
  {
    id: 'facility-operator',
    label: 'Facility Operator / NOC',
    narrative:
      'Operations view: telemetry truth, observability and runtime state first. Anything that could present simulated values as measured facility data is treated as a top concern.',
    priorityCategories: ['runtime', 'observability', 'data-provenance', 'resilience'],
  },
  {
    id: 'engineer',
    label: 'Engineer',
    narrative:
      'Engineering view: runtime, integrations and tenancy mechanics first, with exact files and verification methods so each finding can be reproduced and closed in code.',
    priorityCategories: ['runtime', 'integrations', 'tenancy', 'qualification'],
  },
  {
    id: 'data-scientist',
    label: 'Data Scientist',
    narrative:
      'Model and data view: provenance, integration boundaries and simulation semantics first. The key question is which values are measured, derived, simulated or unavailable.',
    priorityCategories: ['data-provenance', 'integrations', 'runtime', 'observability'],
  },
  {
    id: 'compliance-risk',
    label: 'Compliance / Risk Officer',
    narrative:
      'Assurance view: security, auditability and provenance first. Every claim must trace to evidence, and every unverified claim must be visibly labelled as such.',
    priorityCategories: ['security', 'data-provenance', 'auth', 'release'],
  },
  {
    id: 'tenant-admin',
    label: 'Tenant Administrator',
    narrative:
      'Tenant administration view: tenancy isolation, member access and authentication lifecycle first, so organization boundaries stay fail-closed.',
    priorityCategories: ['tenancy', 'auth', 'security', 'ux-accessibility'],
  },
  {
    id: 'finance-procurement',
    label: 'Finance / Procurement',
    narrative:
      'Commercial view: what the platform can contractually claim today versus what is planned. Unavailable or not-assessed capabilities are called out so they are never sold as delivered.',
    priorityCategories: ['release', 'security', 'resilience', 'integrations'],
  },
  {
    id: 'customer-success',
    label: 'Customer Success',
    narrative:
      'Client-facing view: UX quality, truthful empty states and onboarding friction first, plus a clear map of which capabilities are safe to demonstrate.',
    priorityCategories: ['ux-accessibility', 'data-provenance', 'release', 'observability'],
  },
  {
    id: 'implementation-partner',
    label: 'Implementation Partner',
    narrative:
      'Delivery view: integration boundaries, tenancy setup and qualification evidence first, so a client deployment plan only promises what evidence supports.',
    priorityCategories: ['integrations', 'tenancy', 'qualification', 'runtime'],
  },
];

export function supervisorPersona(id: SupervisorPersonaId): SupervisorPersona {
  return SUPERVISOR_PERSONAS.find((p) => p.id === id) ?? SUPERVISOR_PERSONAS[0];
}

/**
 * Re-order findings for a persona without changing the set. Priority
 * categories come first (in the persona's order), then severity, then id for
 * a stable, deterministic result.
 */
export function prioritizeFindings(
  findings: ReadinessFinding[],
  persona: SupervisorPersona,
): ReadinessFinding[] {
  const rank = (f: ReadinessFinding) => {
    const idx = persona.priorityCategories.indexOf(f.category);
    return idx === -1 ? persona.priorityCategories.length : idx;
  };
  return [...findings].sort((a, b) => {
    const byPriority = rank(a) - rank(b);
    if (byPriority !== 0) return byPriority;
    const bySeverity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (bySeverity !== 0) return bySeverity;
    return a.id.localeCompare(b.id);
  });
}
