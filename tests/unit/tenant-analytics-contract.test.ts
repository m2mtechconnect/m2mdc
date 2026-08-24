import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { captureAuraEvent, sanitizeAnalyticsProperties } from '../../src/analytics/auraAnalytics';

const source = fs.readFileSync(path.resolve(process.cwd(), 'src/analytics/auraAnalytics.ts'), 'utf8');

describe('AURA tenant analytics contract', () => {
  it('defaults analytics to disabled and supports only an explicit PostHog adapter', async () => {
    const result = await captureAuraEvent('tenant.organization_switched', { organizationId: 'org-1' });
    expect(result).toEqual({ provider: 'disabled', status: 'disabled' });
    expect(source).toContain("config.provider === 'posthog'");
    expect(source).not.toContain('import.meta.env');
    expect(source).not.toContain('lovable.app');
    expect(source).not.toContain('lovable.dev');
  });

  it('requires organization identity for tenant-scoped business events and keeps it authoritative', () => {
    expect(source).toContain('organizationId?: string');
    expect(source).toContain('TENANT_SCOPED_EVENTS');
    expect(source).toContain("TENANT_SCOPED_EVENTS.has(event) && !organizationId");
    expect(source).toContain("RESERVED_PROPERTY_KEYS = new Set(['organization_id', 'distinct_id'])");
    expect(source).toContain('properties.organization_id = organizationId');
    expect(source.indexOf('...sanitizeAnalyticsProperties(context.properties)')).toBeLessThan(
      source.indexOf('properties.organization_id = organizationId'),
    );
  });

  it('uses a constrained AURA-owned event vocabulary', () => {
    for (const event of [
      'tenant.organization_switched',
      'platform.customer_provisioned',
      'onboarding.invite_created',
      'onboarding.invite_delivery',
      'runtime.client_error',
      'runtime.unhandled_rejection',
    ]) {
      expect(source).toContain(`'${event}'`);
    }
    expect(source).toContain('event: AuraAnalyticsEventName');
  });

  it('removes sensitive, direct-contact and reserved fields before capture', () => {
    const sanitized = sanitizeAnalyticsProperties({
      source: 'customer_console',
      count: 2,
      enabled: true,
      invite_token: 'do-not-send',
      credential_reference: 'do-not-send',
      authorization: 'do-not-send',
      email: 'person@example.com',
      document_content: 'do-not-send',
      api_key: 'do-not-send',
      organization_id: 'attacker-controlled-org',
      distinct_id: 'attacker-controlled-user',
    });

    expect(sanitized).toEqual({ source: 'customer_console', count: 2, enabled: true });
  });

  it('uses only caller-supplied public browser configuration and a pseudonymous session id', () => {
    expect(source).toContain('posthogKey?: string');
    expect(source).toContain('posthogHost?: string');
    expect(source).toContain('window.sessionStorage');
    expect(source).toContain('crypto.randomUUID()');
    expect(source).not.toContain('POSTHOG_PERSONAL_API_KEY');
    expect(source).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('accepts HTTPS and local HTTP only, and bounds browser delivery', () => {
    expect(source).toContain("url.protocol === 'https:'");
    expect(source).toContain("url.protocol === 'http:'");
    expect(source).toContain("url.hostname === 'localhost'");
    expect(source).toContain("url.hostname === '127.0.0.1'");
    expect(source).toContain('AbortSignal.timeout(ANALYTICS_TIMEOUT_MS)');
  });
});
