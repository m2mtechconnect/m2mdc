import type { BrowserContext, Route } from '@playwright/test';
import {
  installAuraUxBackend,
  type AcceptanceRole,
  type AuraUxBackendHandle,
} from '../aura-builder-connections/auraUxBackend';

export type PlatformPersonaRole = AcceptanceRole | 'owner' | 'operator' | 'viewer';

const SUPABASE_ORIGIN = 'https://demo-placeholder.supabase.co';
const USER_ID = '00000000-0000-4000-8000-000000000013';
const TENANT_ID = '00000000-0000-4000-8000-000000000113';
const SYSTEM_ID = 'system-1';

export interface PlatformBackendHandle extends AuraUxBackendHandle {
  writes: () => string[];
  functionCalls: () => string[];
  countWrite: (pathname: string) => number;
  countFunction: (pathname: string) => number;
}

export async function installPlatformBackend(
  context: BrowserContext,
  role: PlatformPersonaRole = 'admin',
): Promise<PlatformBackendHandle> {
  const base = await installAuraUxBackend(context, { role: role as AcceptanceRole });
  const writes: string[] = [];
  const functionCalls: string[] = [];

  let organization = {
    id: TENANT_ID,
    name: 'Acceptance Tenant',
    domain: 'acceptance.example',
    industry: 'technology',
    default_role: 'engineer',
    mfa_enabled: false,
    sso_enabled: false,
    created_at: '2026-08-25T09:00:00.000Z',
    updated_at: '2026-08-25T10:00:00.000Z',
  };

  const profile = {
    id: USER_ID,
    user_id: USER_ID,
    email: 'acceptance@aura.local',
    full_name: 'Acceptance User',
    is_approved: true,
    approved: true,
    approved_at: '2026-08-25T09:00:00.000Z',
    role,
    org_id: TENANT_ID,
    active_twin_id: null,
    avatar_url: null,
    avatar_bg_color: null,
    avatar_initials: 'AU',
    created_at: '2026-08-25T09:00:00.000Z',
  };

  const roleRow = {
    id: `role-${USER_ID}`,
    user_id: USER_ID,
    role,
    scope: 'global',
    granted_by: USER_ID,
    granted_at: '2026-08-25T09:00:00.000Z',
    expires_at: null,
  };

  const agent = {
    id: SYSTEM_ID,
    name: 'Acceptance Operations System',
    description: 'Acceptance fixture for platform persona testing.',
    status: 'active',
    version: '1.0.0',
    template_id: null,
    created_at: '2026-08-25T09:00:00.000Z',
    updated_at: '2026-08-25T10:00:00.000Z',
    deployed_at: '2026-08-25T10:00:00.000Z',
    success_rate: 98,
    total_runs: 12,
    owner_id: USER_ID,
    config: { department: 'Operations' },
  };

  const cors = {
    'access-control-allow-origin': '*',
    'access-control-expose-headers': 'content-range,content-profile',
  };

  const fulfillJson = (
    route: Route,
    body: unknown,
    status = 200,
    headers: Record<string, string> = {},
  ) => route.fulfill({
    status,
    headers: { ...cors, 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

  await context.route('**/*', async (route) => {
    const request = route.request();
    let url: URL;
    try {
      url = new URL(request.url());
    } catch {
      return route.fallback();
    }

    if (url.origin !== SUPABASE_ORIGIN) return route.fallback();

    const method = request.method().toUpperCase();
    const path = url.pathname;
    const wantsSingle = (request.headers()['accept'] ?? '').toLowerCase().includes('pgrst.object');

    if (path.startsWith('/rest/v1/profiles')) {
      if (method !== 'GET' && method !== 'HEAD') writes.push(`${method} ${path}`);
      if (method === 'HEAD') return route.fulfill({ status: 200, headers: cors, body: '' });
      return fulfillJson(
        route,
        wantsSingle ? profile : [profile],
        200,
        wantsSingle ? { 'content-type': 'application/vnd.pgrst.object+json' } : {},
      );
    }

    if (path.startsWith('/rest/v1/user_roles')) {
      if (method !== 'GET' && method !== 'HEAD') writes.push(`${method} ${path}`);
      if (method === 'HEAD') return route.fulfill({ status: 200, headers: cors, body: '' });
      return fulfillJson(
        route,
        wantsSingle ? roleRow : [roleRow],
        200,
        wantsSingle ? { 'content-type': 'application/vnd.pgrst.object+json' } : {},
      );
    }

    if (path.startsWith('/rest/v1/organizations')) {
      if (method === 'PATCH' || method === 'POST') {
        writes.push(`${method} ${path}`);
        const incoming = (request.postDataJSON?.() ?? {}) as Record<string, unknown>;
        organization = {
          ...organization,
          name: typeof incoming.name === 'string' ? incoming.name : organization.name,
          domain: typeof incoming.domain === 'string' ? incoming.domain : organization.domain,
          industry: typeof incoming.industry === 'string' ? incoming.industry : organization.industry,
          default_role: typeof incoming.default_role === 'string' ? incoming.default_role : organization.default_role,
          updated_at: new Date().toISOString(),
        };
      }
      if (method === 'HEAD') return route.fulfill({ status: 200, headers: cors, body: '' });
      return fulfillJson(
        route,
        wantsSingle ? organization : [organization],
        200,
        wantsSingle ? { 'content-type': 'application/vnd.pgrst.object+json' } : {},
      );
    }

    if (path.startsWith('/rest/v1/agents')) {
      if (method === 'PATCH' || method === 'POST' || method === 'DELETE') {
        writes.push(`${method} ${path}`);
      }
      if (method === 'HEAD') return route.fulfill({ status: 200, headers: { ...cors, 'content-range': '0-0/1' }, body: '' });
      return fulfillJson(
        route,
        wantsSingle ? agent : [agent],
        200,
        wantsSingle ? { 'content-type': 'application/vnd.pgrst.object+json' } : {},
      );
    }

    if (path.startsWith('/rest/v1/agent_runs')) {
      return fulfillJson(route, [{
        id: 'run-1',
        agent_id: SYSTEM_ID,
        status: 'success',
        duration_ms: 420,
        user_id: USER_ID,
        error: null,
        created_at: '2026-08-25T10:05:00.000Z',
        input: {},
        output: { summary: 'Acceptance run completed.' },
      }]);
    }

    if (path.startsWith('/rest/v1/intelligence_settings')) {
      const intelligence = {
        id: 'intelligence-1',
        system_id: SYSTEM_ID,
        model_id: 'aura-balanced',
        temperature: 0.3,
      };
      return fulfillJson(
        route,
        wantsSingle ? intelligence : [intelligence],
        200,
        wantsSingle ? { 'content-type': 'application/vnd.pgrst.object+json' } : {},
      );
    }

    if (path.startsWith('/rest/v1/team_invites')) {
      if (method !== 'GET' && method !== 'HEAD') writes.push(`${method} ${path}`);
      return fulfillJson(route, []);
    }

    if (path.startsWith('/rest/v1/audit_logs')) return fulfillJson(route, []);

    if (path.startsWith('/rest/v1/notification_preferences')) {
      const preferences = {
        user_id: USER_ID,
        system_alerts: true,
        team_activity: true,
        updated_at: '2026-08-25T10:00:00.000Z',
      };
      if (method !== 'GET' && method !== 'HEAD') writes.push(`${method} ${path}`);
      return fulfillJson(
        route,
        wantsSingle ? preferences : [preferences],
        200,
        wantsSingle ? { 'content-type': 'application/vnd.pgrst.object+json' } : {},
      );
    }

    if (path.startsWith('/functions/v1/copilot-health')) {
      functionCalls.push(`${method} ${path}`);
      return fulfillJson(route, {
        gemini: { status: 'ok', latency: 20 },
        vertexSearch: { status: 'ok', latency: 25 },
        region: 'ca-central',
      });
    }

    if (path.startsWith('/functions/v1/teams-invite')) {
      functionCalls.push(`${method} ${path}`);
      return fulfillJson(route, { invited: true, status: 'queued' });
    }

    return route.fallback();
  });

  return {
    ...base,
    writes: () => writes.slice(),
    functionCalls: () => functionCalls.slice(),
    countWrite: (pathname: string) => writes.filter((entry) => entry.endsWith(` ${pathname}`)).length,
    countFunction: (pathname: string) => functionCalls.filter((entry) => entry.endsWith(` ${pathname}`)).length,
  };
}
