import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { sanitizeAnalyticsProperties } from '../../src/analytics/auraAnalytics';

const source = fs.readFileSync(path.resolve(process.cwd(), 'src/analytics/auraAnalytics.ts'), 'utf8');

describe('AURA tenant analytics contract', () => {
  it('defaults analytics to disabled and supports only PostHog as an optional adapter', () => {
    expect(source).toContain("VITE_AURA_ANALYTICS_PROVIDER ?? 'disabled'");
    expect(source).toContain("raw === 'posthog' ? 'posthog' : 'disabled'");
    expect(source).toContain("provider === 'disabled'");
    expect(source).not.toContain('lovable.app');
    expect(source).not.toContain('lovable.dev');
  });

  it('requires an organization id on every event envelope', () => {
    expect(source).toContain('organizationId: string');
    expect(source).toContain('!context.organizationId.trim()');
    expect(source).toContain('organization_id: context.organizationId');
  });

  it('uses a constrained AURA-owned event vocabulary', () => {
    for (const event of [
      'tenant.organization_switched',
      'platform.customer_provisioned',
      'onboarding.invite_created',
      'onboarding.invite_delivery',
    ]) {
      expect(source).toContain(`'${event}'`);
    }
    expect(source).toContain('event: AuraAnalyticsEventName');
  });

  it('removes sensitive and direct-contact fields before capture', () => {
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
    });

    expect(sanitized).toEqual({ source: 'customer_console', count: 2, enabled: true });
  });

  it('uses only public PostHog browser configuration and a pseudonymous session id', () => {
    expect(source).toContain('VITE_POSTHOG_KEY');
    expect(source).toContain('VITE_POSTHOG_HOST');
    expect(source).toContain('window.sessionStorage');
    expect(source).toContain('crypto.randomUUID()');
    expect(source).not.toContain('POSTHOG_PERSONAL_API_KEY');
    expect(source).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('fails closed on insecure analytics hosts', () => {
    expect(source).toContain("url.protocol !== 'https:'");
    expect(source).toContain("url.hostname !== 'localhost'");
    expect(source).toContain("url.hostname !== '127.0.0.1'");
  });
});
