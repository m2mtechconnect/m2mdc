/**
 * Strict white-label policy for managed connector infrastructure.
 *
 * Customer-facing AURA surfaces must never return or redirect to an
 * implementation-platform hostname in production. Managed connector traffic
 * may use an upstream implementation only behind an AURA-owned gateway.
 * Strict mode is ON by default and fails closed.
 *
 * Demo exception: interactive Managed User OAuth may use the legacy connector
 * authorization transport only when BOTH the server environment is explicitly
 * `demo` and `AURA_DEMO_MANAGED_OAUTH=true`. This does not relax managed-shared
 * connector policy and cannot activate from a browser/VITE flag alone.
 */

const LEGACY_GATEWAY_BASE_URL = 'https://connector-gateway.lovable.dev';
const AURA_HOST_SUFFIX = '.m2mtechconnect.com';

export type WhiteLabelGatewayReason =
  | 'AURA_GATEWAY_READY'
  | 'AURA_GATEWAY_REQUIRED'
  | 'AURA_GATEWAY_INVALID'
  | 'LEGACY_GATEWAY_ALLOWED'
  | 'DEMO_MANAGED_OAUTH_ALLOWED';

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

function truthy(value: string): boolean {
  return ['1', 'true', 'on', 'yes'].includes(value.trim().toLowerCase());
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export function strictWhiteLabelEnabled(): boolean {
  const configured = env('AURA_STRICT_WHITE_LABEL').toLowerCase();
  if (!configured) return true;
  return !['0', 'false', 'off', 'no'].includes(configured);
}

/**
 * Demo OAuth is a server-side capability gate. A client-side build flag cannot
 * enable it, and production/staging environments can never satisfy this check.
 */
export function demoManagedOAuthEnabled(): boolean {
  return env('AURA_RELEASE_ENVIRONMENT').toLowerCase() === 'demo' && truthy(env('AURA_DEMO_MANAGED_OAUTH'));
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
 * Per-user OAuth may use a demo transport without weakening the shared runtime.
 * Demo mode deliberately takes precedence because Phase 7A's AURA gateway does
 * not yet expose app-user OAuth endpoints. Production remains identical to the
 * normal managed gateway policy.
 */
export function managedUserOAuthGatewayPolicy(): WhiteLabelGatewayPolicy {
  const standard = managedConnectorGatewayPolicy();
  if (demoManagedOAuthEnabled()) {
    return {
      strict: standard.strict,
      gatewayBaseUrl: LEGACY_GATEWAY_BASE_URL,
      auraOwned: false,
      runtimeAllowed: true,
      reason: 'DEMO_MANAGED_OAUTH_ALLOWED',
    };
  }
  return standard;
}

/**
 * Production-safe provider authorization URL. The decoded URL must not contain
 * an implementation-platform hostname anywhere, including nested redirect URI
 * parameters.
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

/**
 * Demo-only authorization validation. The browser may be sent only to an
 * explicitly allowlisted provider authorization host. Nested callback
 * parameters are not treated as customer-facing branding in demo mode, but the
 * top-level browser destination can never be the implementation gateway.
 */
export function authorizationUrlIsDemoProviderSafe(value: string, allowedHosts: string[]): boolean {
  if (!value || allowedHosts.length === 0 || !demoManagedOAuthEnabled()) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    const hostname = url.hostname.toLowerCase();
    if (hostname.includes('lovable.dev') || hostname.includes('lovable.app')) return false;
    return allowedHosts.some((host) => {
      const allowed = host.trim().toLowerCase();
      return Boolean(allowed) && (hostname === allowed || hostname.endsWith(`.${allowed}`));
    });
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
