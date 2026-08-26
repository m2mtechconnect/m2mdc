import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (p: string) => fs.readFileSync(path.resolve(process.cwd(), p), 'utf8');

const captureFn = read('supabase/functions/observability-capture/index.ts');
const configFn = read('supabase/functions/observability-config/index.ts');
const bootstrap = read('src/monitoring/observabilityBootstrap.ts');
const analytics = read('src/analytics/auraAnalytics.ts');

describe('observability backend contract', () => {
  describe('observability-capture edge function', () => {
    it('is fail-closed when the server-held key is absent', () => {
      expect(captureFn).toContain('POSTHOG_PROJECT_API_KEY');
      expect(captureFn).toContain("status: \"not_configured\"");
      expect(captureFn).toContain('delivered: false');
    });

    it('accepts only the constrained AURA event vocabulary', () => {
      for (const event of [
        'tenant.organization_switched',
        'platform.customer_provisioned',
        'onboarding.invite_created',
        'onboarding.invite_delivery',
        'runtime.client_error',
        'runtime.unhandled_rejection',
      ]) {
        expect(captureFn).toContain(`"${event}"`);
      }
      expect(captureFn).toContain('z.enum(ACCEPTED_EVENTS)');
    });

    it('re-sanitizes properties server-side and caps payload shape', () => {
      expect(captureFn).toContain('SENSITIVE_KEY_PATTERN');
      expect(captureFn).toContain('RESERVED_PROPERTY_KEYS');
      expect(captureFn).toContain('MAX_PROPERTY_KEYS');
      expect(captureFn).toContain('MAX_STRING_LENGTH');
    });

    it('never logs or echoes the provider key and refuses non-public upstreams', () => {
      expect(captureFn).not.toMatch(/log\([^)]*apiKey/);
      expect(captureFn).not.toContain('POSTHOG_PERSONAL_API_KEY');
      expect(captureFn).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
      expect(captureFn).toContain('url.protocol !== "https:"');
      expect(captureFn).toContain('"localhost"');
      expect(captureFn).toContain('.internal');
    });

    it('uses the governed handler with strict CORS allowlist and zod validation', () => {
      expect(captureFn).toContain('createHandler');
      expect(captureFn).toContain('authLevel: "public"');
      expect(captureFn).toContain('inputSchema');
      // CORS is enforced inside createHandler via evaluateCorsOrigin; the
      // function must not widen it with wildcard headers of its own.
      expect(captureFn).not.toContain('Access-Control-Allow-Origin');
      expect(captureFn).not.toContain('corsHeaders');
    });
  });

  describe('observability-config edge function', () => {
    it('declares enablement from secret presence without exposing material', () => {
      expect(configFn).toContain('POSTHOG_PROJECT_API_KEY');
      expect(configFn).toContain('enabled: configured');
      expect(configFn).not.toContain('apiKey');
      expect(configFn).not.toContain('Deno.env.get("POSTHOG_HOST")');
    });
  });

  describe('browser bootstrap', () => {
    it('fails closed on missing config, network error, or disabled backend', () => {
      const returns = bootstrap.match(/return \{\};/g) ?? [];
      // window guard, missing base, !ok, disabled provider, catch
      expect(returns.length).toBeGreaterThanOrEqual(5);
      expect(bootstrap).toContain('AbortSignal.timeout(CONFIG_TIMEOUT_MS)');
      expect(bootstrap).toContain("config?.enabled === true && config.provider === 'posthog'");
    });

    it('never carries provider credentials in the browser path', () => {
      expect(bootstrap).not.toContain('posthogKey');
      expect(bootstrap).not.toContain('phc_');
      expect(bootstrap).not.toContain('POSTHOG_PROJECT_API_KEY');
    });
  });

  describe('analytics adapter relay path', () => {
    it('sends relay payloads without any api_key material', () => {
      expect(analytics).toContain('relayUrl?: string');
      expect(analytics).toContain('body: JSON.stringify({ event, properties })');
      // The only api_key usage remains the explicit direct path.
      const apiKeyUsages = analytics.match(/api_key: apiKey/g) ?? [];
      expect(apiKeyUsages.length).toBe(1);
    });

    it('keeps tenant-scoped events gated on authoritative organization id before any delivery', () => {
      const gateIndex = analytics.indexOf('TENANT_SCOPED_EVENTS.has(event) && !organizationId');
      const relayIndex = analytics.indexOf('relayEndpoint(config)');
      expect(gateIndex).toBeGreaterThan(-1);
      expect(relayIndex).toBeGreaterThan(-1);
      expect(gateIndex).toBeLessThan(relayIndex);
    });
  });
});
