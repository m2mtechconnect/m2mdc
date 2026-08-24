import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('end-to-end audit remediation boundaries', () => {
  it('enforces direct-route permissions for navigation-protected surfaces', () => {
    const shell = read('src/AuthenticatedShell.tsx');
    const required = [
      ['twin.edit', '/builder'],
      ['deployment.execute', '/deploy'],
      ['deployment.view', '/deployments'],
      ['analytics.view', '/analytics'],
      ['tenant.view_members', '/teams'],
      ['authz.manage_assignments', '/teams/access-control'],
      ['twin.edit', '/manage/integrations'],
      ['twin.edit', '/manage/facilities'],
      ['agent.view', '/app/agents'],
      ['agent.administer', '/settings/ai'],
    ] as const;

    expect(shell).toContain("import { PermissionRouteGuard } from '@/routing/PermissionRouteGuard'");
    for (const [permission, path] of required) {
      expect(shell).toContain(`path=\"${path}\"`);
      expect(shell).toContain(`permission=\"${permission}\"`);
    }
  });

  it('keeps the generic permission route guard fail closed', () => {
    const guard = read('src/routing/PermissionRouteGuard.tsx');
    expect(guard).toContain("resolution.status === 'internal' || resolution.status === 'tenant'");
    expect(guard).toContain('!admitted || !can(permission)');
    expect(guard).toContain('<Navigate to="/dashboard" replace />');
  });

  it('requires authenticated callers for ai-config and returns provider-neutral state', () => {
    const config = read('supabase/config.toml');
    const handler = read('supabase/functions/ai-config/index.ts');

    expect(config).toMatch(/\[functions\.ai-config\]\s*\nverify_jwt = true/);
    expect(handler).toContain('await requireCaller(req)');
    expect(handler).toContain('callerRejectedResponse(error, req)');
    expect(handler).not.toContain("provider: 'lovable_managed'");
    expect(handler).not.toContain("active_provider");
    expect(handler).not.toContain('vertexDataStoreId');
    expect(handler).not.toContain('projectId:');
  });
});
