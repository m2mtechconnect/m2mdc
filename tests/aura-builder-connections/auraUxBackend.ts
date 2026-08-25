import type { BrowserContext, Route } from '@playwright/test';

export type AcceptanceRole = 'admin' | 'manager' | 'engineer' | 'executive' | 'compliance';

const SUPABASE_ORIGIN = 'https://demo-placeholder.supabase.co';
const STORAGE_KEY = 'sb-demo-placeholder-auth-token';
const USER_ID = '00000000-0000-4000-8000-000000000013';
const TENANT_ID = '00000000-0000-4000-8000-000000000113';
const BUILDER_ID = '00000000-0000-4000-8000-000000000213';

function b64url(value: unknown): string {
  return Buffer.from(typeof value === 'string' ? value : JSON.stringify(value), 'utf8')
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function fakeJwt(): string {
  const now = Math.floor(Date.now() / 1000);
  return [
    b64url({ alg: 'HS256', typ: 'JWT' }),
    b64url({ sub: USER_ID, aud: 'authenticated', role: 'authenticated', exp: now + 3600, iat: now - 30 }),
    b64url('acceptance-signature-not-verified'),
  ].join('.');
}

function sessionPayload() {
  const nowIso = new Date().toISOString();
  return {
    access_token: fakeJwt(),
    refresh_token: 'acceptance-refresh-not-verified',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: {
      id: USER_ID,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'acceptance@aura.local',
      email_confirmed_at: nowIso,
      created_at: nowIso,
      updated_at: nowIso,
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: {},
      identities: [],
    },
  };
}

function isNonFunctionalExternal(url: URL): boolean {
  return url.hostname === 'fonts.googleapis.com'
    || url.hostname === 'fonts.gstatic.com'
    || url.hostname === 'clarity.ms'
    || url.hostname.endsWith('.clarity.ms');
}

const DEFINITIONS = [
  {
    id: 'bacnet_ip', name: 'BACnet/IP', category: 'Facility and OT', provider: 'AURA', version: '1.0',
    implementation_status: 'IMPLEMENTED', supported_directions: ['INGEST'], supported_auth_methods: ['none'],
    supported_data_classes: ['telemetry'], supported_protocols: ['BACnet/IP'], configuration_schema: {},
    mapping_required: true, documentation_url: null, validation_status: 'VERIFIED', runtime_adapter: 'bacnet',
    availability: 'DEPLOYED', capability_evidence: [{ kind: 'runtime', note: 'Runtime adapter present in the acceptance fixture.' }],
  },
  {
    id: 'dsx_ingest_gateway', name: 'DSX Ingest Gateway', category: 'DSX Exchange', provider: 'AURA', version: '1.0',
    implementation_status: 'IMPLEMENTED', supported_directions: ['INGEST'], supported_auth_methods: ['api_key'],
    supported_data_classes: ['events'], supported_protocols: ['HTTPS'], configuration_schema: {},
    mapping_required: false, documentation_url: null, validation_status: 'VERIFIED', runtime_adapter: 'dsx_ingest',
    availability: 'DEPLOYED', capability_evidence: [{ kind: 'runtime', note: 'Server-side ingest adapter present.' }],
  },
];

const CONNECTIONS = [
  {
    id: 'connection-healthy', connector_id: 'bacnet_ip', tenant_id: TENANT_ID, facility_id: 'facility-1',
    environment: 'acceptance', display_name: 'Facility telemetry', status: 'HEALTHY', data_direction: 'INGEST',
    endpoint_reference: 'server-managed', credential_reference: 'vault:healthy', configuration: { auth_method: 'none' },
    owner_id: USER_ID, is_system: false, enabled: true, status_reason: null,
    last_tested_at: '2026-08-25T10:00:00.000Z', last_success_at: '2026-08-25T10:00:00.000Z',
    last_ingest_at: '2026-08-25T10:01:00.000Z', last_error: null,
    created_at: '2026-08-25T09:00:00.000Z', updated_at: '2026-08-25T10:01:00.000Z',
    verification_state: 'VERIFIED', verification_reason: 'Acceptance fixture has successful evidence.',
    last_verification_at: '2026-08-25T10:00:00.000Z',
  },
  {
    id: 'connection-needs-credential', connector_id: 'dsx_ingest_gateway', tenant_id: TENANT_ID, facility_id: null,
    environment: 'acceptance', display_name: 'Governed event ingest', status: 'CREDENTIAL_REQUIRED', data_direction: 'INGEST',
    endpoint_reference: 'server-managed', credential_reference: null, configuration: { auth_method: 'api_key' },
    owner_id: USER_ID, is_system: false, enabled: true, status_reason: 'Server credential is required before testing.',
    last_tested_at: null, last_success_at: null, last_ingest_at: null, last_error: null,
    created_at: '2026-08-25T09:05:00.000Z', updated_at: '2026-08-25T09:05:00.000Z',
    verification_state: 'NOT_VERIFIED', verification_reason: 'Credential required.', last_verification_at: null,
  },
];

const HEALTH_CHECKS = [{
  id: 'health-1', connection_id: 'connection-healthy', check_type: 'runtime',
  started_at: '2026-08-25T10:00:00.000Z', completed_at: '2026-08-25T10:00:01.000Z', status: 'PASSED',
  latency_ms: 42, dns_result: 'PASSED', network_result: 'PASSED', tls_result: 'PASSED', auth_result: 'PASSED',
  schema_result: 'PASSED', mapping_result: 'PASSED', data_availability: 'DATA_PRESENT', error_code: null,
  safe_message: 'Health evidence passed.', correlation_id: 'acceptance-health-1',
}];

const INGEST_RUNS = [{
  id: 'ingest-1', connection_id: 'connection-healthy', started_at: '2026-08-25T10:01:00.000Z',
  completed_at: '2026-08-25T10:01:02.000Z', records_received: 42, records_accepted: 42,
  records_rejected: 0, mapping_failures: 0, duplicate_events: 0, retries: 0, dead_letter_count: 0,
  final_status: 'SUCCEEDED',
}];

const MAPPINGS = [{
  id: 'mapping-1', connection_id: 'connection-healthy', source_identifier: 'ahu-01.supply_temp',
  target_facility_id: 'facility-1', target_entity: 'AHU-01', target_prim_path: '/Facility/AHU_01',
  target_property: 'supplyTemperature', source_unit: 'degC', target_unit: 'degC', conversion_rule: null,
  data_type: 'number', direction: 'INGEST', quality_rule: 'valid_number', timestamp_rule: 'source_time',
  validation_status: 'VALID', active: true, last_mapped_value: 19.4, last_mapped_at: '2026-08-25T10:01:01.000Z',
}];

const AUDIT_EVENTS = [{
  id: 'audit-1', actor_id: USER_ID, action: 'health_check_completed', connection_id: 'connection-healthy',
  previous_state: 'READY_TO_TEST', new_state: 'HEALTHY', correlation_id: 'acceptance-health-1',
  created_at: '2026-08-25T10:00:01.000Z',
}];

export interface AuraUxBackendHandle {
  requests: () => string[];
  blockedRequests: () => string[];
  nonFunctionalRequests: () => string[];
  deploymentCalls: () => number;
  countPath: (pathname: string) => number;
}

export async function installAuraUxBackend(
  context: BrowserContext,
  options: { role?: AcceptanceRole; failFirstDeployment?: boolean } = {},
): Promise<AuraUxBackendHandle> {
  const role = options.role ?? 'admin';
  const session = sessionPayload();
  const requests: string[] = [];
  const blocked: string[] = [];
  const nonFunctional: string[] = [];
  let deploymentCalls = 0;
  let builderConfig: Record<string, unknown> = {
    source: 'blank',
    goal: 'Finance compliance system',
    industry: 'Finance',
    department: 'Finance',
    type: 'agent',
    template_id: null,
    workflow: {
      triggers: ['New approved evidence'],
      actions: ['Evaluate evidence', 'Create governed finding'],
      integrations: [],
      hitl: ['Compliance approval'],
    },
    model_config: {
      provider: 'aura',
      model: 'aura-balanced',
      rag: { temperature: 0.3 },
      policies: { intelligenceProfile: 'balanced' },
      mcp_servers: [],
    },
  };

  const profile = {
    id: USER_ID, user_id: USER_ID, email: 'acceptance@aura.local', is_approved: true, approved: true,
    role, org_id: TENANT_ID, active_twin_id: null, created_at: '2026-08-25T09:00:00.000Z',
  };

  const makeBuilder = () => ({
    id: BUILDER_ID,
    name: String(builderConfig.goal ?? 'Acceptance build'),
    description: String(builderConfig.goal ?? ''),
    status: 'draft',
    config: builderConfig,
    created_at: '2026-08-25T09:00:00.000Z',
    updated_at: '2026-08-25T10:00:00.000Z',
  });

  const cors = {
    'access-control-allow-origin': '*',
    'access-control-expose-headers': 'content-range,content-profile',
  };

  const fulfillJson = (route: Route, body: unknown, status = 200, headers: Record<string, string> = {}) =>
    route.fulfill({
      status,
      headers: { ...cors, 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });

  await context.route('**/*', async (route) => {
    const request = route.request();
    let url: URL;
    try { url = new URL(request.url()); }
    catch { return route.abort('blockedbyclient'); }

    if (url.origin !== SUPABASE_ORIGIN) {
      if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') return route.fallback();
      const entry = `${request.method()} ${url.origin}${url.pathname}`;
      if (isNonFunctionalExternal(url)) {
        nonFunctional.push(entry);
        return route.abort('blockedbyclient');
      }
      blocked.push(entry);
      return route.abort('blockedbyclient');
    }

    requests.push(`${request.method()} ${url.pathname}`);
    const method = request.method().toUpperCase();
    const path = url.pathname;

    if (method === 'OPTIONS') {
      return route.fulfill({
        status: 204,
        headers: {
          ...cors,
          'access-control-allow-methods': 'GET,POST,PATCH,DELETE,HEAD,OPTIONS',
          'access-control-allow-headers': 'authorization,apikey,content-type,accept,accept-profile,content-profile,prefer,x-client-info',
        },
        body: '',
      });
    }

    if (path.startsWith('/auth/v1/user')) return fulfillJson(route, session.user);
    if (path.startsWith('/auth/v1/token')) return fulfillJson(route, session);
    if (path.startsWith('/auth/v1/logout')) return route.fulfill({ status: 204, headers: cors, body: '' });
    if (path.startsWith('/realtime/')) return route.abort('blockedbyclient');

    if (path.startsWith('/rest/v1/profiles')) {
      const wantsSingle = (request.headers()['accept'] ?? '').toLowerCase().includes('pgrst.object');
      return fulfillJson(route, wantsSingle ? profile : [profile], 200,
        wantsSingle ? { 'content-type': 'application/vnd.pgrst.object+json' } : {});
    }
    if (path.startsWith('/rest/v1/user_roles')) {
      return fulfillJson(route, [{ role, scope: 'global', expires_at: null }]);
    }
    if (path.startsWith('/rest/v1/connector_definitions')) return fulfillJson(route, DEFINITIONS);
    if (path.startsWith('/rest/v1/connection_instances')) return fulfillJson(route, CONNECTIONS);
    if (path.startsWith('/rest/v1/connection_twin_mappings')) return fulfillJson(route, MAPPINGS);
    if (path.startsWith('/rest/v1/connection_health_checks')) return fulfillJson(route, HEALTH_CHECKS);
    if (path.startsWith('/rest/v1/connection_ingest_runs')) return fulfillJson(route, INGEST_RUNS);
    if (path.startsWith('/rest/v1/connection_audit_events')) return fulfillJson(route, AUDIT_EVENTS);
    if (path.startsWith('/rest/v1/connection_data_contracts')) return fulfillJson(route, []);
    if (path.startsWith('/rest/v1/data_centre_twins')) {
      return fulfillJson(route, [{ id: 'facility-1', name: 'Acceptance Facility' }]);
    }
    if (path.startsWith('/rest/v1/organizations')) return fulfillJson(route, [{ id: TENANT_ID, name: 'Acceptance Tenant' }]);
    if (path.startsWith('/rest/v1/dsx_events')) {
      if (method === 'HEAD') return route.fulfill({ status: 200, headers: { ...cors, 'content-range': '0-0/42' }, body: '' });
      return fulfillJson(route, []);
    }
    if (path.startsWith('/rest/v1/')) {
      if (method === 'HEAD') return route.fulfill({ status: 200, headers: { ...cors, 'content-range': '*/0' }, body: '' });
      return fulfillJson(route, method === 'GET' ? [] : {});
    }

    if (path.startsWith('/functions/v1/builders-create')) {
      const incoming = (request.postDataJSON?.() ?? {}) as Record<string, unknown>;
      builderConfig = {
        ...builderConfig,
        ...Object.fromEntries(Object.entries(incoming).filter(([, value]) => value !== undefined && value !== null && value !== '')),
      };
      return fulfillJson(route, { data: { id: BUILDER_ID, builder: makeBuilder() } });
    }
    if (path.startsWith('/functions/v1/builders-update')) {
      const incoming = (request.postDataJSON?.() ?? {}) as { updates?: Record<string, unknown> };
      builderConfig = { ...builderConfig, ...(incoming.updates ?? {}) };
      return fulfillJson(route, { data: { builder: makeBuilder() } });
    }
    if (path.startsWith('/functions/v1/builders-get')) {
      return fulfillJson(route, { data: { builder: makeBuilder() } });
    }
    if (path.startsWith('/functions/v1/builders-deploy')) {
      deploymentCalls += 1;
      if (options.failFirstDeployment && deploymentCalls === 1) {
        return fulfillJson(route, { message: 'Acceptance fixture rejected the first deployment request.' }, 500);
      }
      return fulfillJson(route, {
        deployment_id: 'acceptance-deployment-1',
        status: 'success',
        agent_url: '/app/agents/acceptance/manage',
        message: 'Acceptance deployment service returned success.',
      });
    }
    if (path.startsWith('/functions/v1/connection-health-check')) {
      return fulfillJson(route, { status: 'PASSED', latency_ms: 42, safe_message: 'Health evidence passed.', correlation_id: 'acceptance-health-2' });
    }
    if (path.startsWith('/functions/v1/connection-credential')) {
      const incoming = (request.postDataJSON?.() ?? {}) as { action?: string };
      if (incoming.action === 'list') return fulfillJson(route, { credentials: [] });
      return fulfillJson(route, { credential: null });
    }
    if (path.startsWith('/functions/v1/managed-connector-capabilities')) return fulfillJson(route, { entries: [] });
    if (path.startsWith('/functions/v1/connection-provision')) return fulfillJson(route, { connection: CONNECTIONS[0], status: 'READY_TO_TEST' });
    if (path.startsWith('/functions/v1/')) return fulfillJson(route, {});

    return fulfillJson(route, {});
  });

  await context.addInitScript(([key, value]) => {
    try { window.localStorage.setItem(key, value); }
    catch { /* hardened browser mode */ }
  }, [STORAGE_KEY, JSON.stringify(session)] as const);

  return {
    requests: () => requests.slice(),
    blockedRequests: () => blocked.slice(),
    nonFunctionalRequests: () => nonFunctional.slice(),
    deploymentCalls: () => deploymentCalls,
    countPath: (pathname: string) => requests.filter((entry) => entry.endsWith(` ${pathname}`)).length,
  };
}
