/**
 * Strict white-label policy for managed connector infrastructure.
 *
 * Customer-facing AURA surfaces must never return or redirect to a Lovable
 * hostname. Managed connector traffic may use an upstream implementation only
 * behind an AURA-owned gateway. Strict mode is ON by default and fails closed.
 */

const LEGACY_GATEWAY_BASE_URL = 'https://connector-gateway.lovable.dev';
const AURA_HOST_SUFFIX = '.m2mtechconnect.com';

export type WhiteLabelGatewayReason =
  | 'AURA_GATEWAY_READY'
  | 'AURA_GATEWAY_REQUIRED'
  | 'AURA_GATEWAY_INVALID'
  | 'LEGACY_GATEWAY_ALLOWED';

export interface WhiteLabelGatewayPolicy {
  strict: boolean;
  gatewayBaseUrl: string | null;
  auraOwned: boolean;
  runtimeAllowed: boolean;
  reason: WhiteLabelGatewayReason;
}

function env(name: string): string {
  try {
    return Deno.env.get(name)?.trim() ?? '';
  } catch {
    return '';
  }
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export function strictWhiteLabelEnabled(): boolean {
  const configured = env('AURA_STRICT_WHITE_LABEL').toLowerCase();
  if (!configured) return true;
  return !['0', 'false', 'off', 'no'].includes(configured);
}

export function isAuraOwnedGatewayUrl(value: string): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    const hostname = url.hostname.toLowerCase();
    return hostname === 'm2mtechconnect.com' || hostname.endsWith(AURA_HOST_SUFFIX);
  } catch {
    return false;
  }
}

export function managedConnectorGatewayPolicy(): WhiteLabelGatewayPolicy {
  const strict = strictWhiteLabelEnabled();
  const configured = env('AURA_MANAGED_CONNECTOR_GATEWAY_URL');

  if (configured) {
    const gatewayBaseUrl = stripTrailingSlash(configured);
    const auraOwned = isAuraOwnedGatewayUrl(gatewayBaseUrl);
    if (strict && !auraOwned) {
      return {
        strict,
        gatewayBaseUrl: null,
        auraOwned: false,
        runtimeAllowed: false,
        reason: 'AURA_GATEWAY_INVALID',
      };
    }
    return {
      strict,
      gatewayBaseUrl,
      auraOwned,
      runtimeAllowed: true,
      reason: auraOwned ? 'AURA_GATEWAY_READY' : 'LEGACY_GATEWAY_ALLOWED',
    };
  }

  if (strict) {
    return {
      strict,
      gatewayBaseUrl: null,
      auraOwned: false,
      runtimeAllowed: false,
      reason: 'AURA_GATEWAY_REQUIRED',
    };
  }

  return {
    strict,
    gatewayBaseUrl: LEGACY_GATEWAY_BASE_URL,
    auraOwned: false,
    runtimeAllowed: true,
    reason: 'LEGACY_GATEWAY_ALLOWED',
  };
}

/**
 * Never return an authorization URL that visibly routes through Lovable.
 * This is enforced even when strict mode is explicitly disabled because a
 * vendor-hosted OAuth URL would violate AURA's user-facing white-label contract.
 */
export function authorizationUrlIsWhiteLabelSafe(value: string): boolean {
  if (!value) return false;
  try {
    const decoded = decodeURIComponent(value).toLowerCase();
    if (decoded.includes('lovable.dev') || decoded.includes('lovable.app')) return false;
    const url = new URL(value);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function whiteLabelBlockedResponse(reason: WhiteLabelGatewayReason) {
  const errorCode = reason === 'AURA_GATEWAY_INVALID'
    ? 'aura_gateway_invalid'
    : 'aura_gateway_required';
  return {
    error_code: errorCode,
    safe_message: 'This managed capability requires an approved AURA gateway before runtime use.',
  };
}
