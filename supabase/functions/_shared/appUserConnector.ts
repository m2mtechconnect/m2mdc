/**
 * Managed connector gateway helpers for per-user (AURA Managed User
 * Connection) bindings.
 *
 * RESTRICTED ENGINEERING SURFACE - server-only. Reads the approved AURA
 * gateway token and handles opaque per-user connection handles. Never import
 * from browser code and never echo these values in a response.
 */
import { demoManagedOAuthEnabled, strictWhiteLabelEnabled } from './whiteLabelGateway.ts';

const LEGACY_GATEWAY_HOST = 'connector-gateway.lovable.dev';

function isLegacyGateway(gatewayBaseUrl: string): boolean {
  try {
    return new URL(gatewayBaseUrl).hostname.toLowerCase() === LEGACY_GATEWAY_HOST;
  } catch {
    return false;
  }
}

function requireApiKey(gatewayBaseUrl: string): string {
  if (isLegacyGateway(gatewayBaseUrl)) {
    if (demoManagedOAuthEnabled() || !strictWhiteLabelEnabled()) {
      const legacyKey = Deno.env.get('LOVABLE_API_KEY')?.trim();
      if (legacyKey) return legacyKey;
    }
    throw new Error('managed_demo_oauth_credential_unavailable');
  }

  const auraKey = Deno.env.get('AURA_MANAGED_GATEWAY_TOKEN')?.trim();
  if (auraKey) return auraKey;
  throw new Error('aura_managed_gateway_token_unavailable');
}

export interface AuthorizeParams {
  gatewayBaseUrl: string;
  connectorId: string;
  appUserId: string;
  clientAPIKey: string;
  returnUrl: string;
  credentialsConfiguration?: Record<string, unknown>;
  connectionAPIKey?: string;
}

export async function authorizeAppUserOAuth(params: AuthorizeParams): Promise<{ authorizationUrl: string; sessionId: string }> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${requireApiKey(params.gatewayBaseUrl)}`,
    'Content-Type': 'application/json',
    'X-Client-Api-Key': params.clientAPIKey,
  };
  if (params.connectionAPIKey) headers['X-Connection-Api-Key'] = params.connectionAPIKey;

  const res = await fetch(`${params.gatewayBaseUrl}/api/v1/app-users/oauth2/authorize`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      connector_id: params.connectorId,
      app_user_id: params.appUserId,
      return_url: params.returnUrl,
      credentials_configuration: params.credentialsConfiguration,
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`managed_authorization_start_failed:${res.status}`);
  const body = text ? JSON.parse(text) : {};
  if (!body.authorization_url) throw new Error('managed_authorization_start_failed:no_url');
  return { authorizationUrl: body.authorization_url as string, sessionId: (body.session_id as string) ?? '' };
}

export async function exchangeAppUserOAuthCode(
  gatewayBaseUrl: string,
  code: string,
): Promise<{ connectionAPIKey: string; connectorId: string }> {
  const res = await fetch(`${gatewayBaseUrl}/api/v1/app-users/oauth2/exchange`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${requireApiKey(gatewayBaseUrl)}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`managed_authorization_exchange_failed:${res.status}`);
  const body = text ? JSON.parse(text) : {};
  if (!body.api_key || !body.connector_id) throw new Error('managed_authorization_exchange_failed:incomplete');
  return { connectionAPIKey: body.api_key as string, connectorId: body.connector_id as string };
}

export async function callAsAppUser(args: {
  gatewayBaseUrl: string;
  connectionAPIKey: string;
  connectorId: string;
  path: string;
  init?: RequestInit;
}): Promise<Response> {
  const path = args.path.startsWith('/') ? args.path : `/${args.path}`;
  const headers = new Headers(args.init?.headers);
  headers.set('Authorization', `Bearer ${requireApiKey(args.gatewayBaseUrl)}`);
  headers.set('X-Connection-Api-Key', args.connectionAPIKey);
  return fetch(`${args.gatewayBaseUrl}/${args.connectorId}${path}`, { ...args.init, headers });
}

export async function disconnectAppUser(args: {
  gatewayBaseUrl: string;
  connectionAPIKey: string;
  connectorId: string;
}): Promise<void> {
  const headers = new Headers();
  headers.set('Authorization', `Bearer ${requireApiKey(args.gatewayBaseUrl)}`);
  headers.set('X-Connection-Api-Key', args.connectionAPIKey);
  headers.set('Content-Type', 'application/json');
  const res = await fetch(`${args.gatewayBaseUrl}/api/v1/app-users/connection`, {
    method: 'DELETE',
    headers,
    body: JSON.stringify({ connector_id: args.connectorId }),
  });
  if (!res.ok) throw new Error(`managed_disconnect_failed:${res.status}`);
}
