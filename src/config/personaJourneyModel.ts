/**
 * Customer-facing persona and golden-journey presentation model.
 *
 * This module is deliberately non-authoritative. It may prioritize language,
 * work and next actions, but it must never grant permissions. Platform grants,
 * organization membership, RLS and server-side authorization remain the only
 * authority for what a user may do.
 */

import type { AnyRole, PlatformRole } from '@/auth/permissions';
import type { OrganizationRole } from '@/auth/organizationAuthorization';

export const PERSONA_FAMILY_IDS = [
  'owner_admin',
  'engineer_operator',
  'executive_manager',
  'compliance_analyst',
  'viewer_pilot',
] as const;

export type PersonaFamilyId = (typeof PERSONA_FAMILY_IDS)[number];

export interface PersonaFamilyDefinition {
  id: PersonaFamilyId;
  label: string;
  primaryOutcome: string;
  topActions: readonly [string, string, string];
}

export const PERSONA_FAMILIES: Record<PersonaFamilyId, PersonaFamilyDefinition> = {
  owner_admin: {
    id: 'owner_admin',
    label: 'Owner / Administrator',
    primaryOutcome: 'Establish a governed workspace that is ready for other personas to use.',
    topActions: ['Resolve readiness blockers', 'Manage connections and access', 'Hand off a ready workspace'],
  },
  engineer_operator: {
    id: 'engineer_operator',
    label: 'Facility Engineer / Operator',
    primaryOutcome: 'Evaluate a facility change safely and carry an approved decision into operation.',
    topActions: ['Inspect facility state', 'Simulate and compare a bounded change', 'Verify the approved outcome'],
  },
  executive_manager: {
    id: 'executive_manager',
    label: 'Executive / Manager',
    primaryOutcome: 'Make an accountable decision using traceable operational and business evidence.',
    topActions: ['Review unresolved decisions', 'Compare risk and value', 'Approve or request evidence'],
  },
  compliance_analyst: {
    id: 'compliance_analyst',
    label: 'Compliance / Analyst',
    primaryOutcome: 'Determine whether a claim or decision is supported, traceable and exportable.',
    topActions: ['Trace a claim to source', 'Review controls and contradictions', 'Export bounded evidence'],
  },
  viewer_pilot: {
    id: 'viewer_pilot',
    label: 'Viewer / Pilot',
    primaryOutcome: 'Understand AURA safely and reach a clear next step without privileged access.',
    topActions: ['Review permitted context', 'Complete a guided evaluation', 'Request the appropriate access'],
  },
};

/**
 * Platform role labels can influence presentation only after canonical
 * authorization resolution. Marketing, sales and support are internal
 * specialist entitlements, not additional marketed persona families.
 */
export const PLATFORM_ROLE_PERSONA_FAMILY: Record<PlatformRole, PersonaFamilyId | null> = {
  security_admin: 'owner_admin',
  admin: 'owner_admin',
  executive: 'executive_manager',
  manager: 'executive_manager',
  engineer: 'engineer_operator',
  compliance: 'compliance_analyst',
  data_analyst: 'compliance_analyst',
  finance: 'executive_manager',
  marketing: null,
  sales: null,
  support: null,
};

/** Organization presentation is resolved only after active-org membership. */
export const ORGANIZATION_ROLE_PERSONA_FAMILY: Record<OrganizationRole, PersonaFamilyId> = {
  owner: 'owner_admin',
  admin: 'owner_admin',
  security_admin: 'owner_admin',
  manager: 'executive_manager',
  executive: 'executive_manager',
  engineer: 'engineer_operator',
  operator: 'engineer_operator',
  compliance: 'compliance_analyst',
  data_analyst: 'compliance_analyst',
  support: 'viewer_pilot',
  viewer: 'viewer_pilot',
};

/**
 * Global owner is the explicit platform-owner bootstrap contract. Global
 * operator/viewer grants confer no product permission; these mappings remain
 * presentation hints and cannot change that authorization rule.
 */
export const SPECIAL_GLOBAL_ROLE_PERSONA_FAMILY: Partial<Record<AnyRole, PersonaFamilyId>> = {
  owner: 'owner_admin',
  operator: 'engineer_operator',
  viewer: 'viewer_pilot',
};

export const WORKFLOW_ROLE_VIEW_IDS = ['engineer', 'operator', 'executive', 'compliance'] as const;
export type WorkflowRoleView = (typeof WORKFLOW_ROLE_VIEW_IDS)[number];

export const WORKFLOW_VIEW_PERSONA_FAMILY: Record<WorkflowRoleView, PersonaFamilyId> = {
  engineer: 'engineer_operator',
  operator: 'engineer_operator',
  executive: 'executive_manager',
  compliance: 'compliance_analyst',
};

export interface GoldenJourneyDefinition {
  id: string;
  family: PersonaFamilyId;
  title: string;
  primaryOutcome: string;
  phases: readonly string[];
  requiredNegativeCase: string;
}

export const GOLDEN_PERSONA_JOURNEYS: readonly GoldenJourneyDefinition[] = [
  {
    id: 'governed-workspace',
    family: 'owner_admin',
    title: 'Establish a governed workspace',
    primaryOutcome: PERSONA_FAMILIES.owner_admin.primaryOutcome,
    phases: ['Enter scoped context', 'Review readiness', 'Validate connections', 'Assign access', 'Verify persistence', 'Hand off'],
    requiredNegativeCase: 'Organization authority cannot perform a platform-only action, and platform authority does not imply tenant membership.',
  },
  {
    id: 'design-simulate-verify',
    family: 'engineer_operator',
    title: 'Design, simulate and verify',
    primaryOutcome: PERSONA_FAMILIES.engineer_operator.primaryOutcome,
    phases: ['Inspect', 'Configure', 'Review assumptions', 'Simulate', 'Compare', 'Decide', 'Verify'],
    requiredNegativeCase: 'A failed or unsaved run cannot appear successful, measured, deployed or production-ready.',
  },
  {
    id: 'decide-with-evidence',
    family: 'executive_manager',
    title: 'Decide with evidence',
    primaryOutcome: PERSONA_FAMILIES.executive_manager.primaryOutcome,
    phases: ['Review decision queue', 'Inspect provenance', 'Compare outcomes', 'Decide', 'Verify handoff'],
    requiredNegativeCase: 'A read-only executive cannot execute a deployment or mutate a twin.',
  },
  {
    id: 'trace-and-attest',
    family: 'compliance_analyst',
    title: 'Trace and attest',
    primaryOutcome: PERSONA_FAMILIES.compliance_analyst.primaryOutcome,
    phases: ['Open claim', 'Trace authority', 'Review controls', 'Record authorized outcome', 'Export evidence'],
    requiredNegativeCase: 'Missing, stale, simulated or unverified evidence cannot be labelled measured, compliant, healthy or approved.',
  },
  {
    id: 'evaluate-and-progress',
    family: 'viewer_pilot',
    title: 'Evaluate and progress safely',
    primaryOutcome: PERSONA_FAMILIES.viewer_pilot.primaryOutcome,
    phases: ['Orient', 'Review permitted evidence', 'Encounter explained boundary', 'Request access', 'Return to stable status'],
    requiredNegativeCase: 'Direct URLs and client-side presentation changes cannot bypass approval or permission gating.',
  },
] as const;
