import { gatewayReadiness, loadGatewayConfig, routeIsAllowed } from './config.ts';

const SAFE_FORWARD_HEADERS = new Set([
  'accept',
  'content-type',
  'x-client-api-key',
  'x-connection-api-key',
  'x-aura-correlation-id',
]);

function json(status: number, body: Record<string, unknown>, correlationId?: string) {
  const headers = new Headers({
    'content-type': 'application/json',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  if (correlationId) headers.set('x-aura-correlation-id', correlationId);
  return new Response(JSON.stringify(body), { status, headers });
}

function constantTimeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  if (left.length !== right.length) return false;
  let result = 0;
  for (let i = 0; i < left.length; i += 1) result |= left[i] ^ right[i];
  return result === 0;
}

function authorized(req: Request, expectedToken: string): boolean {
  const auth = req.headers.get('authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return false;
  return constantTimeEqual(auth.slice(7), expectedToken);
}

function upstreamDisclosureDetected(value: string): boolean {
  const normalized = (() => {
    try { return decodeURIComponent(value).toLowerCase(); } catch { return value.toLowerCase(); }
  })();
  return normalized.includes('lovable.dev') || normalized.includes('lovable.app');
}

function splitConnectorPath(pathname: string): { connectorId: string; connectorPath: string } | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  const connectorId = parts[0];
  const connectorPath = `/${parts.slice(1).join('/')}`;
  return { connectorId, connectorPath };
}

async function proxyConnector(req: Request, correlationId: string): Promise<Response> {
  const config = loadGatewayConfig();
  const url = new URL(req.url);
  const resolved = splitConnectorPath(url.pathname);
  if (!resolved) return json(404, { error_code: 'route_not_found' }, correlationId);

  if (!routeIsAllowed(resolved.connectorId, req.method, resolved.connectorPath)) {
    return json(403, {
      error_code: 'gateway_route_not_allowlisted',
      safe_message: 'This connector operation is not approved by the AURA gateway policy.',
    }, correlationId);
  }

  const headers = new Headers();
  for (const [name, value] of req.headers.entries()) {
    if (SAFE_FORWARD_HEADERS.has(name.toLowerCase())) headers.set(name, value);
  }
  headers.set('authorization', `Bearer ${config.upstreamToken}`);
  headers.set('x-aura-correlation-id', correlationId);

  const upstreamUrl = new URL(`${config.upstreamBaseUrl}/${resolved.connectorId}${resolved.connectorPath}`);
  upstreamUrl.search = url.search;

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: 'manual',
  };
  if (!['GET', 'HEAD'].includes(req.method.toUpperCase())) init.body = await req.arrayBuffer();

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, init);
  } catch {
    return json(502, { error_code: 'connector_upstream_unavailable' }, correlationId);
  }

  if (upstream.status >= 300 && upstream.status < 400) {
    return json(502, {
      error_code: 'upstream_redirect_blocked',
      safe_message: 'The connector upstream attempted an unapproved redirect.',
    }, correlationId);
  }

  const body = await upstream.text();
  if (upstreamDisclosureDetected(body) || upstreamDisclosureDetected(upstream.headers.get('location') ?? '')) {
    return json(502, {
      error_code: 'upstream_disclosure_blocked',
      safe_message: 'The connector response violated the AURA white-label boundary.',
    }, correlationId);
  }

  const responseHeaders = new Headers({
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'x-aura-correlation-id': correlationId,
  });
  const contentType = upstream.headers.get('content-type');
  if (contentType) responseHeaders.set('content-type', contentType);
  return new Response(body, { status: upstream.status, headers: responseHeaders });
}

Deno.serve(async (req) => {
  const correlationId = req.headers.get('x-aura-correlation-id') || crypto.randomUUID();
  let config;
  try {
    config = loadGatewayConfig();
  } catch {
    return json(503, { error_code: 'gateway_not_configured' }, correlationId);
  }

  const url = new URL(req.url);
  if (req.method === 'GET' && url.pathname === '/healthz') {
    const readiness = gatewayReadiness(config);
    return json(readiness.ready ? 200 : 503, readiness as unknown as Record<string, unknown>, correlationId);
  }

  if (!authorized(req, config.ingressToken)) {
    return json(401, { error_code: 'gateway_unauthorized' }, correlationId);
  }

  if (url.pathname.startsWith('/api/v1/app-users/')) {
    return json(501, {
      error_code: 'managed_user_oauth_not_ready',
      safe_message: 'Per-user authorization remains disabled until the AURA-owned provider callback is configured and verified.',
    }, correlationId);
  }

  return proxyConnector(req, correlationId);
});
