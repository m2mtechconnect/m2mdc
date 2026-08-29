import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');

describe('authenticated bootstrap performance contract', () => {
  const app = read('src/App.tsx');
  const session = read('src/AuthenticatedSessionApp.tsx');
  const rbac = read('src/contexts/RBACContext.tsx');

  it('starts protected runtime siblings before entering the provider boundary', () => {
    expect(app).toContain('void loadRuntimeAppProviders()');
    expect(app).toContain('if (needsSessionResolution) void loadAuthenticatedSessionApp()');
    expect(app).toContain("const loadAuthenticatedSessionApp = () => import('./AuthenticatedSessionApp')");
    expect(app).toContain('const RuntimeAppProviders = lazy(loadRuntimeAppProviders)');
  });

  it('warms the approved router while the server-owned approval gate resolves', () => {
    const approvalStart = session.indexOf('void loadApprovedUserRouter().catch(() => undefined)');
    const approvalRead = session.indexOf("await fetchProfileFields(user.id, 'is_approved')");
    const approvedRender = session.indexOf('<ApprovedUserRouter />');

    expect(approvalStart).toBeGreaterThan(-1);
    expect(approvalRead).toBeGreaterThan(approvalStart);
    expect(approvedRender).toBeGreaterThan(approvalRead);
  });

  it('does not duplicate the explicit authorization bootstrap on INITIAL_SESSION', () => {
    const listener = rbac.slice(rbac.indexOf('onAuthStateChange((event, session)'));
    const initialSessionGuard = listener.indexOf("if (event === 'INITIAL_SESSION') return");
    expect(initialSessionGuard).toBeGreaterThan(-1);
    expect(initialSessionGuard).toBeLessThan(listener.indexOf("setResolution({ status: 'loading' })"));
  });

  it('parallelizes independent authority reads while retaining fail-closed checks', () => {
    const parallelReads = rbac.slice(
      rbac.indexOf('const [rolesResult, membershipsResult, activeOrgResult] = await Promise.all(['),
      rbac.indexOf('const { data: roleRows, error: rolesError } = rolesResult;'),
    );
    expect(parallelReads).toContain("from('user_roles')");
    expect(parallelReads).toContain("from('org_memberships')");
    expect(parallelReads).toContain("rpc('active_org_id')");
    expect(rbac).toContain('if (rolesError)');
    expect(rbac).toContain('if (membershipsError)');
    expect(rbac).toContain('if (activeOrgError)');
    expect(rbac).toContain("settle({ status: 'unauthenticated' })");
  });
});
