import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { NON_EMITTABLE_PATHS } from '@/config/routeRegistry';
import { ROLE_PERMISSIONS, type AnyRole, type Permission } from '@/auth/permissions';
import {
  MANAGE_NAV,
  WORKSPACE_NAV,
  isNavItemActive,
  primaryNavigation,
  visibleNavChildren,
} from '@/config/appNavigation';

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');

function canFor(role: AnyRole) {
  const permissions = new Set<Permission>(ROLE_PERMISSIONS[role]);
  return (permission: Permission) => permissions.has(permission);
}

function flattenVisible(role: AnyRole) {
  const can = canFor(role);
  const roots = primaryNavigation(can);
  return roots.flatMap((item) => {
    const children = visibleNavChildren(item, can);
    return [item, ...children, ...children.flatMap((child) => visibleNavChildren(child, can))];
  });
}

function visibleHrefs(role: AnyRole) {
  return flattenVisible(role).map((item) => item.href);
}

function activeRoots(role: AnyRole, pathname: string) {
  const can = canFor(role);
  return primaryNavigation(can).filter((item) =>
    isNavItemActive(item, pathname)
    || visibleNavChildren(item, can).some((child) => isNavItemActive(child, pathname)),
  );
}

describe('persona-aware consolidated navigation matrix', () => {
  it.each(Object.keys(ROLE_PERMISSIONS) as AnyRole[])(
    '%s sees only permission-supported lifecycle workspaces in the permanent shell',
    (role) => {
      const can = canFor(role);
      const expected = WORKSPACE_NAV
        .filter((item) => !item.permission || can(item.permission))
        .map((item) => item.href);
      expect(visibleHrefs(role)).toEqual(expected);
      expect(primaryNavigation(can).every((item) => !item.children?.length)).toBe(true);
    },
  );

  it('never promotes or emits retired Marketplace in discoverable navigation', () => {
    expect(MANAGE_NAV.map((item) => item.href)).not.toContain('/marketplace');
    expect(NON_EMITTABLE_PATHS).toContain('/marketplace');

    for (const role of Object.keys(ROLE_PERMISSIONS) as AnyRole[]) {
      expect(visibleHrefs(role), `${role} primary navigation`).not.toContain('/marketplace');
    }
  });

  it.each([
    ['viewer', '/blueprint/facility-1', '/builder'],
    ['viewer', '/app/agents', '/analytics'],
    ['viewer', '/deployments', '/analytics'],
    ['viewer', '/readiness/supervisor', '/evidence/overview'],
    ['admin', '/settings/ai', '/builder'],
    ['admin', '/admin/platform-readiness', null],
    ['executive', '/teams', null],
  ] satisfies Array<[AnyRole, string, string | null]>)(
    'selects exactly one root for %s at %s',
    (role, pathname, expectedRoot) => {
      const active = activeRoots(role, pathname);
      expect(active.map((item) => item.href)).toEqual(expectedRoot ? [expectedRoot] : []);
    },
  );
});

describe('direct-route and read-only boundary contracts', () => {
  const shell = read('src/AuthenticatedShell.tsx');
  const blueprint = read('src/pages/Blueprint.tsx');
  const designerHeader = read('src/components/blueprint/DesignerModeHeader.tsx');

  it('redirects Marketplace into Builder only after enforcing edit authority', () => {
    expect(shell).not.toContain('import("./pages/Marketplace")');
    expect(shell).toContain(
      'path="/marketplace" element={<PermissionRouteGuard permission="twin.edit"><PreserveNavigate to="/builder#templates" /></PermissionRouteGuard>}',
    );
  });

  it('guards direct URLs consistently with their navigation permissions', () => {
    const contracts = [
      ['path="/builder"', 'permission="twin.edit"'],
      ['path="/manage/facilities"', 'permission="twin.view"'],
      ['path="/app/agents"', 'permission="agent.view"'],
      ['path="/app/agents/:agentId/manage"', 'permission="agent.operate"'],
      ['path="/blueprint"', 'permission="twin.view"'],
      ['path="/blueprint/:id"', 'permission="twin.view"'],
      ['path="/simulation"', 'permission="twin.view"'],
      ['path="/evidence"', 'permission="analytics.view"'],
      ['path="/readiness/supervisor"', 'permission="analytics.view"'],
    ] as const;

    for (const [route, permission] of contracts) {
      const start = shell.indexOf(route);
      expect(start, `${route} must exist`).toBeGreaterThanOrEqual(0);
      expect(shell.slice(start, start + 260), `${route} must require ${permission}`).toContain(permission);
    }
  });

  it('admits Blueprint readers while suppressing edit-only header actions', () => {
    expect(blueprint).toContain("const canEdit = can('twin.edit')");
    expect(blueprint).toContain('canEdit={canEdit}');
    expect(designerHeader).toContain("canEdit ? 'Designer - editable' : 'Blueprint - read only'");
    expect(designerHeader).toContain('canEdit && onSave');
  });

  it('keeps simulation discoverable to readers without granting deployment execution', () => {
    expect(ROLE_PERMISSIONS.viewer).toContain('twin.view');
    expect(ROLE_PERMISSIONS.viewer).not.toContain('deployment.execute');
    expect(ROLE_PERMISSIONS.operator).toContain('deployment.execute');
  });
});

describe('mobile consolidated navigation contract', () => {
  const layout = read('src/components/Layout.tsx');

  it('uses the same permission-filtered hierarchy and reserves scroll room above sign out', () => {
    expect(layout).toContain('const workspaceNavigation = roleLoading ? [] : primaryNavigation(can)');
    expect(layout).toContain('className="w-full sm:w-[400px] bg-card border-border overflow-y-auto"');
    expect(layout).toContain('className="mt-6 space-y-1 pb-40"');
    expect(layout).toContain('className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-card"');
    expect(layout).toContain('Sign Out');
  });
});
