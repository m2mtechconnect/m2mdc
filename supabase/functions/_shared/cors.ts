const DEVELOPMENT_LOCALHOST_ORIGINS = [
  "http://localhost:8080",
  "http://localhost:5173",
  "http://localhost:3000",
] as const;

const ALLOW_HEADERS = "authorization, x-client-info, apikey, content-type, x-idempotency-key";
const ALLOW_METHODS = "GET, POST, PUT, DELETE, OPTIONS";

export const CORS_ALLOWLIST_ENV = "CORS_ALLOWED_ORIGINS";

export interface CorsPolicyOptions {
  environment?: string;
  configuredOrigins?: string;
}

export interface CorsDecision {
  allowed: boolean;
  origin: string | null;
  headers: Record<string, string>;
  reason?: "missing_origin" | "malformed_origin" | "origin_denied";
}

function runtimeEnvironment(name: string): string | undefined {
  const runtime = globalThis as typeof globalThis & {
    Deno?: { env?: { get?: (key: string) => string | undefined } };
  };
  return runtime.Deno?.env?.get?.(name);
}

function canonicalOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if ((url.protocol !== "https:" && url.protocol !== "http:") || url.origin !== value) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function configuredAllowlist(options: CorsPolicyOptions): Set<string> {
  const environment = options.environment ?? runtimeEnvironment("ENVIRONMENT") ?? "production";
  const configured = options.configuredOrigins ?? runtimeEnvironment(CORS_ALLOWLIST_ENV) ?? "";
  const values = configured.split(",").map((origin) => origin.trim()).filter(Boolean);
  const candidates = [...values];
  if (environment === "development") candidates.push(...DEVELOPMENT_LOCALHOST_ORIGINS);
  return new Set(candidates.map(canonicalOrigin).filter((origin): origin is string => Boolean(origin)));
}

function baseHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Headers": ALLOW_HEADERS,
    "Access-Control-Allow-Methods": ALLOW_METHODS,
    "Vary": "Origin",
  };
}

export function evaluateCorsOrigin(
  origin: string | null | undefined,
  options: CorsPolicyOptions = {},
  requireOrigin = false,
): CorsDecision {
  if (!origin) {
    return {
      allowed: !requireOrigin,
      origin: null,
      headers: baseHeaders(),
      reason: requireOrigin ? "missing_origin" : undefined,
    };
  }

  const normalized = canonicalOrigin(origin);
  if (!normalized) {
    return { allowed: false, origin: null, headers: baseHeaders(), reason: "malformed_origin" };
  }
  if (!configuredAllowlist(options).has(normalized)) {
    return { allowed: false, origin: normalized, headers: baseHeaders(), reason: "origin_denied" };
  }
  return {
    allowed: true,
    origin: normalized,
    headers: {
      ...baseHeaders(),
      "Access-Control-Allow-Origin": normalized,
      "Access-Control-Allow-Credentials": "true",
    },
  };
}

export function getCorsHeaders(
  origin?: string | null,
  options: CorsPolicyOptions = {},
): Record<string, string> {
  return evaluateCorsOrigin(origin, options).headers;
}

export function createCorsJsonResponse(
  req: Request,
  body: unknown,
  status: number,
  options: CorsPolicyOptions = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...evaluateCorsOrigin(req.headers.get("origin"), options).headers,
    },
  });
}

export function handleCorsPreflightRequest(
  req: Request,
  options: CorsPolicyOptions = {},
): Response {
  const decision = evaluateCorsOrigin(req.headers.get("origin"), options, true);
  return new Response(null, {
    status: decision.allowed ? 204 : 403,
    headers: decision.headers,
  });
}
