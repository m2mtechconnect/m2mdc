import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const shell = readFileSync(resolve(process.cwd(), 'src/AuthenticatedShell.tsx'), 'utf8');

describe('persona route authorization contracts', () => {
  it('requires operate permission for agent management routes', () => {
    expect(shell).toContain('path="/app/agents/:agentId/manage" element={<PermissionRouteGuard permission="agent.operate">');
    expect(shell).toContain('path="/app/agents/:agentId/operations" element={<PermissionRouteGuard permission="agent.operate">');
  });

  it.each([
    '/data-centre-twin',
    '/data-centre-twin/:id',
    '/data-centre-twin/:id/blueprint',
    '/blueprint/preview',
    '/blueprint/:id',
    '/simulation',
    '/simulation/preview',
    '/twin-preview',
  ])('requires twin.view for %s', (route) => {
    expect(shell).toContain(`path="${route}" element={<PermissionRouteGuard permission="twin.view">`);
  });
});
