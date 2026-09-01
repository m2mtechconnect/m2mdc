import { isPlatformRole, type AnyRole, type Permission } from '@/auth/permissions';
import type { PersonaFamilyId } from '@/config/personaJourneyModel';

export type PersonaScope = 'organization' | 'platform' | 'personal';

/**
 * Resolve presentation scope without converting tenant-only global labels
 * into platform authority. Global owner is the explicit bootstrap exception.
 */
export function resolvePersonaScope(
  hasActiveOrganization: boolean,
  primaryRole: AnyRole | null,
): PersonaScope {
  if (hasActiveOrganization) return 'organization';
  if (primaryRole && (isPlatformRole(primaryRole) || primaryRole === 'owner')) return 'platform';
  return 'personal';
}

export interface PersonaCommandContext {
  scope: PersonaScope;
  blueprintHref: string;
  simulationHref: string;
  evidenceHref: string;
  latestRunId: string | null;
  pendingDecisions: number;
  runCount: number;
  evidenceNeedingReview: number;
  isFallback: boolean;
}

export interface PersonaCommandAction {
  id: string;
  label: string;
  href: string;
  /** Null only for authenticated, non-privileged recovery routes. */
  requiredPermission: Permission | null;
}

export interface PersonaCurrentWork {
  title: string;
  detail: string;
}

function action(
  id: string,
  label: string,
  href: string,
  requiredPermission: Permission | null,
): PersonaCommandAction {
  return { id, label, href, requiredPermission };
}

function reviewRunHref(context: PersonaCommandContext): string {
  return context.latestRunId
    ? `${context.simulationHref}&run=${encodeURIComponent(context.latestRunId)}&review=pending`
    : `${context.simulationHref}&review=pending`;
}

function candidatesFor(
  family: PersonaFamilyId,
  context: PersonaCommandContext,
): PersonaCommandAction[] {
  switch (family) {
    case 'owner_admin':
      return context.scope === 'platform'
        ? [
            action('platform-readiness', 'Review platform readiness', '/admin/platform-readiness', 'platform.view_admin_console'),
            action('customer-workspaces', 'Manage customer workspaces', '/admin/customers', 'platform.manage_customers'),
            action('readiness', 'Review enterprise readiness', '/readiness/supervisor', 'analytics.view'),
            action('connections', 'Manage connections', '/manage/integrations', 'twin.edit'),
          ]
        : [
            action('readiness', 'Resolve readiness blockers', '/readiness/supervisor', 'analytics.view'),
            action('people-access', 'Manage people and access', '/teams', 'tenant.view_members'),
            action('connections', 'Manage connections', '/manage/integrations', 'twin.edit'),
            action('blueprint', 'Review facility blueprint', context.blueprintHref, 'twin.view'),
          ];
    case 'engineer_operator':
      return [
        ...(context.pendingDecisions > 0
          ? [action('review-run', 'Review pending recommendations', reviewRunHref(context), 'twin.view')]
          : [action('simulate', 'Start a bounded simulation', context.simulationHref, 'twin.view')]),
        action('blueprint', 'Inspect facility model', `${context.blueprintHref}?tab=model`, 'twin.view'),
        action('operations', 'Review operational state', '/analytics', 'analytics.view'),
      ];
    case 'executive_manager':
      return [
        action(
          'decision-queue',
          context.pendingDecisions > 0 ? 'Review pending decisions' : 'Review simulation outcomes',
          context.pendingDecisions > 0 ? reviewRunHref(context) : context.simulationHref,
          'twin.view',
        ),
        action('evidence', 'Inspect decision evidence', context.evidenceHref, 'analytics.view'),
        action('operations', 'Review capacity and risk', '/analytics', 'analytics.view'),
      ];
    case 'compliance_analyst':
      return [
        action('evidence', 'Trace claims and evidence', context.evidenceHref, 'analytics.view'),
        action('readiness', 'Review readiness findings', '/readiness/supervisor', 'analytics.view'),
        action('simulation-evidence', 'Inspect recorded run evidence', context.simulationHref, 'twin.view'),
      ];
    case 'viewer_pilot':
      return [
        ...(context.scope === 'personal'
          ? [action('access-status', 'Review access status', '/account/settings', null)]
          : []),
        action('blueprint', 'Review permitted facility context', context.blueprintHref, 'twin.view'),
        action('evidence', 'Review permitted evidence', context.evidenceHref, 'analytics.view'),
        action('simulation', 'Explore recorded scenarios', context.simulationHref, 'twin.view'),
      ];
  }
}

/** Return at most three discoverable actions; route guards remain authoritative. */
export function buildPersonaCommandActions(
  family: PersonaFamilyId,
  permissions: ReadonlySet<Permission>,
  context: PersonaCommandContext,
): PersonaCommandAction[] {
  return candidatesFor(family, context)
    .filter((candidate) => candidate.requiredPermission === null || permissions.has(candidate.requiredPermission))
    .filter((candidate, index, all) => all.findIndex((item) => item.href === candidate.href) === index)
    .slice(0, 3);
}

export function buildPersonaCurrentWork(
  family: PersonaFamilyId,
  context: PersonaCommandContext,
): PersonaCurrentWork {
  switch (family) {
    case 'owner_admin':
      return context.isFallback
        ? {
            title: 'Workspace setup requires attention',
            detail: 'The reference facility is active because no saved blueprint was loaded for this account.',
          }
        : {
            title: `${context.evidenceNeedingReview} evidence item${context.evidenceNeedingReview === 1 ? '' : 's'} require review`,
            detail: 'Confirm readiness, access and connections before handing the workspace to other participants.',
          };
    case 'engineer_operator':
      if (context.pendingDecisions > 0) {
        return {
          title: `${context.pendingDecisions} recommendation${context.pendingDecisions === 1 ? '' : 's'} awaiting review`,
          detail: 'Resume the recorded run, decide, then verify the resulting operational or evidence state.',
        };
      }
      return context.runCount > 0
        ? {
            title: 'Latest scenario is ready to inspect',
            detail: 'Review its assumptions and compare the recorded result with the current design baseline.',
          }
        : {
            title: 'No simulation run has been recorded',
            detail: 'Inspect the model assumptions before creating the first bounded scenario.',
          };
    case 'executive_manager':
      return context.pendingDecisions > 0
        ? {
            title: `${context.pendingDecisions} decision${context.pendingDecisions === 1 ? '' : 's'} awaiting review`,
            detail: 'Compare risk, capacity and evidence before recording the accountable outcome.',
          }
        : {
            title: 'No recommendation is currently awaiting a decision',
            detail: 'Review the latest recorded outcome and its evidence before treating the baseline as decision-ready.',
          };
    case 'compliance_analyst':
      return {
        title: `${context.evidenceNeedingReview} evidence item${context.evidenceNeedingReview === 1 ? '' : 's'} require review`,
        detail: 'Trace source, method and limitations before exporting or attesting to any claim.',
      };
    case 'viewer_pilot':
      return context.runCount > 0
        ? {
            title: 'A recorded scenario is available for guided review',
            detail: 'Explore permitted context and evidence; restricted actions remain controlled by authorization.',
          }
        : {
            title: 'The workspace currently shows a design baseline only',
            detail: 'Review permitted facility context and request the appropriate access for additional work.',
          };
  }
}
