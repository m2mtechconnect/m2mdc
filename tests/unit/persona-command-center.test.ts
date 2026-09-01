import { describe, expect, it } from 'vitest';
import type { Permission } from '@/auth/permissions';
import {
  buildPersonaCommandActions,
  buildPersonaCurrentWork,
  resolvePersonaScope,
  type PersonaCommandContext,
} from '@/workspace/dashboard/personaCommandCenter';

const baseContext: PersonaCommandContext = {
  scope: 'organization',
  blueprintHref: '/blueprint/facility-1',
  simulationHref: '/simulation?twin=facility-1',
  evidenceHref: '/evidence?facility=facility-1',
  latestRunId: 'run-1',
  pendingDecisions: 2,
  runCount: 1,
  evidenceNeedingReview: 1,
  isFallback: false,
};

const permissions = (...values: Permission[]) => new Set<Permission>(values);

describe('persona-prioritized Command Center', () => {
  it('returns at most three permission-supported actions', () => {
    const actions = buildPersonaCommandActions(
      'owner_admin',
      permissions('analytics.view', 'tenant.view_members'),
      baseContext,
    );

    expect(actions.map((item) => item.id)).toEqual(['readiness', 'people-access']);
    expect(actions.every((item) => (
      item.requiredPermission === null
      || permissions('analytics.view', 'tenant.view_members').has(item.requiredPermission)
    ))).toBe(true);
    expect(actions.length).toBeLessThanOrEqual(3);
  });

  it('uses platform-scoped owner actions only when their permissions exist', () => {
    const actions = buildPersonaCommandActions(
      'owner_admin',
      permissions('platform.view_admin_console', 'platform.manage_customers', 'analytics.view'),
      { ...baseContext, scope: 'platform' },
    );

    expect(actions.map((item) => item.id)).toEqual([
      'platform-readiness',
      'customer-workspaces',
      'readiness',
    ]);
    expect(actions.map((item) => item.href)).not.toContain('/teams');
  });

  it('puts pending recommendations first for engineers and operators', () => {
    const actions = buildPersonaCommandActions(
      'engineer_operator',
      permissions('twin.view', 'analytics.view'),
      baseContext,
    );

    expect(actions[0]).toMatchObject({
      id: 'review-run',
      href: '/simulation?twin=facility-1&step=decide&run=run-1',
    });
  });

  it('reports current work from recorded state without inventing completion', () => {
    expect(buildPersonaCurrentWork('executive_manager', baseContext).title).toBe('2 decisions awaiting review');
    expect(buildPersonaCurrentWork('engineer_operator', {
      ...baseContext,
      latestRunId: null,
      pendingDecisions: 0,
      runCount: 0,
    }).title).toBe('No simulation run has been recorded');
    expect(buildPersonaCurrentWork('owner_admin', {
      ...baseContext,
      isFallback: true,
    }).title).toBe('Workspace setup requires attention');
  });

  it('gives a grant-less pilot one safe recovery action without granting product access', () => {
    expect(buildPersonaCommandActions('viewer_pilot', permissions(), {
      ...baseContext,
      scope: 'personal',
    })).toEqual([{
      id: 'access-status',
      label: 'Review access status',
      href: '/account/settings',
      requiredPermission: null,
    }]);

    expect(buildPersonaCommandActions('viewer_pilot', permissions(), baseContext)).toEqual([]);
  });

  it('does not describe tenant-only global labels as platform scope', () => {
    expect(resolvePersonaScope(false, 'viewer')).toBe('personal');
    expect(resolvePersonaScope(false, 'operator')).toBe('personal');
    expect(resolvePersonaScope(false, 'owner')).toBe('platform');
    expect(resolvePersonaScope(false, 'admin')).toBe('platform');
    expect(resolvePersonaScope(true, 'admin')).toBe('organization');
  });
});
