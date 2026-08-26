/**
 * /observability-capture
 *
 * PURPOSE: Governed relay for privacy-safe runtime diagnostics. The browser
 * sends an already-sanitized AURA event envelope; this function re-validates
 * and re-sanitizes it, injects the server-held PostHog project API key, and
 * forwards it to the provider capture endpoint.
 *
 * Truth rules:
 * - Fail-closed: when POSTHOG_PROJECT_API_KEY is absent the function reports
 *   { delivered: false, status: 'not_configured' } instead of pretending to
 *   accept events.
 * - The project key is never logged, echoed, or returned.
 * - Only the constrained AURA event vocabulary is accepted.
 *
 * AUTH: public (ingest endpoint; strict CORS allowlist enforced by handler)
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";

const ACCEPTED_EVENTS = [
  "tenant.organization_switched",
  "platform.customer_provisioned",
  "onboarding.invite_created",
  "onboarding.invite_delivery",
  "runtime.client_error",
  "runtime.unhandled_rejection",
] as const;

const SENSITIVE_KEY_PATTERN =
  /(token|secret|password|authorization|credential|cookie|content|document|body|email|phone|address|api[_-]?key)/i;
const RESERVED_PROPERTY_KEYS = new Set(["organization_id", "distinct_id", "api_key"]);
const MAX_PROPERTY_KEYS = 25;
const MAX_STRING_LENGTH = 200;
const UPSTREAM_TIMEOUT_MS = 5000;

const inputSchema = z.object({
  event: z.enum(ACCEPTED_EVENTS),
  properties: z
    .record(z.union([z.string().max(MAX_STRING_LENGTH), z.number(), z.boolean(), z.null()]))
    .optional(),
});

type Primitive = string | number | boolean | null;

/** Defense in depth: re-apply the client sanitization rules server-side. */
function sanitizeProperties(
  input: Record<string, Primitive> | undefined,
): Record<string, Primitive> {
  if (!input) return {};
  const out: Record<string, Primitive> = {};
  for (const [key, value] of Object.entries(input)) {
    if (Object.keys(out).length >= MAX_PROPERTY_KEYS) break;
    if (RESERVED_PROPERTY_KEYS.has(key)) continue;
    if (SENSITIVE_KEY_PATTERN.test(key)) continue;
    if (value !== null && !["string", "number", "boolean"].includes(typeof value)) continue;
    out[key] = value;
  }
  return out;
}

/** Upstream must be a public HTTPS endpoint; local/private targets are refused. */
function sanitizeHost(raw: string | undefined): string | null {
  const value = (raw ?? "https://us.i.posthog.com").trim();
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".internal")) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

serve(createHandler({
  name: "observability-capture",
  authLevel: "public",
  inputSchema,
  handler: async (input, { log }) => {
    const apiKey = Deno.env.get("POSTHOG_PROJECT_API_KEY")?.trim();
    if (!apiKey) {
      // Honest negative: the caller must not read this as acceptance.
      return { delivered: false, status: "not_configured" as const };
    }

    const host = sanitizeHost(Deno.env.get("POSTHOG_HOST"));
    if (!host) {
      return { delivered: false, status: "invalid_upstream_host" as const };
    }

    const properties = sanitizeProperties(input.properties);
    const distinctId = input.properties?.distinct_id;
    if (typeof distinctId === "string" && distinctId.length > 0 && distinctId.length <= 64) {
      properties.distinct_id = distinctId;
    }
    const organizationId = input.properties?.organization_id;
    if (typeof organizationId === "string" && organizationId.length > 0 && organizationId.length <= 64) {
      properties.organization_id = organizationId;
    }

    try {
      const response = await fetch(`${host}/capture/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey, event: input.event, properties }),
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
      if (!response.ok) {
        log("Upstream rejected event", { upstreamStatus: response.status, event: input.event });
        return { delivered: false, status: "upstream_rejected" as const, upstreamStatus: response.status };
      }
      return { delivered: true, status: "queued" as const };
    } catch (err) {
      log("Upstream delivery failed", { error: String(err), event: input.event });
      return { delivered: false, status: "upstream_unreachable" as const };
    }
  },
}));
