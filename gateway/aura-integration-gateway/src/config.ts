import { allowedConnectorIds, routeIsAllowed } from './routes.ts';

export interface GatewayConfig {
  publicOrigin: string;
  ingressToken: string;
  upstreamBaseUrl: string;
  upstreamToken: string;
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`missing_env:${name}`);
  return value;
}

export function isAuraOwnedOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === 'https:' && (host === 'm2mtechconnect.com' || host.endsWith('.m2mtechconnect.com'));
  } catch {
    return false;
  }
}

export function loadGatewayConfig(): GatewayConfig {
  const publicOrigin = requiredEnv('AURA_GATEWAY_PUBLIC_ORIGIN').replace(/\/+$/, '');
  if (!isAuraOwnedOrigin(publicOrigin)) throw new Error('invalid_env:AURA_GATEWAY_PUBLIC_ORIGIN');

  const upstreamBaseUrl = requiredEnv('AURA_CONNECTOR_UPSTREAM_URL').replace(/\/+$/, '');
  const parsedUpstream = new URL(upstreamBaseUrl);
  if (parsedUpstream.protocol !== 'https:') throw new Error('invalid_env:AURA_CONNECTOR_UPSTREAM_URL');

  return {
    publicOrigin,
    ingressToken: requiredEnv('AURA_GATEWAY_INGRESS_TOKEN'),
    upstreamBaseUrl,
    upstreamToken: requiredEnv('AURA_CONNECTOR_UPSTREAM_TOKEN'),
  };
}

export function gatewayReadiness(config: GatewayConfig) {
  return {
    ready: Boolean(config.publicOrigin && config.ingressToken && config.upstreamBaseUrl && config.upstreamToken),
    public_origin: config.publicOrigin,
    connector_ids: allowedConnectorIds(),
    managed_user_oauth: 'disabled_until_aura_owned_callback',
  };
}

export { routeIsAllowed };
