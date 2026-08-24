import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { AURA_BILLING_PROVIDERS } from '../../src/billing/billingCapabilities';

const migration = fs.readFileSync(
  path.resolve(process.cwd(), 'supabase/migrations/20260824000500_organization_entitlements.sql'),
  'utf8',
);
const catalogue = fs.readFileSync(path.resolve(process.cwd(), 'src/billing/billingCapabilities.ts'), 'utf8');

describe('AURA organization entitlement and billing contract', () => {
  it('creates exactly one entitlement record per organization and seeds existing/new organizations', () => {
    expect(migration).toContain('org_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE');
    expect(migration).toContain('INSERT INTO public.organization_entitlements (org_id)');
    expect(migration).toContain('CREATE TRIGGER organizations_seed_entitlements');
    expect(migration).toContain('AFTER INSERT ON public.organizations');
  });

  it('defaults to unconfigured observe-only commercial state with nullable limits', () => {
    expect(migration).toContain("plan_code text NOT NULL DEFAULT 'unassigned'");
    expect(migration).toContain("entitlement_status text NOT NULL DEFAULT 'UNCONFIGURED'");
    expect(migration).toContain("enforcement_mode text NOT NULL DEFAULT 'OBSERVE_ONLY'");
    expect(migration).toContain('max_facilities integer');
    expect(migration).toContain('max_users integer');
    expect(migration).toContain('max_twins integer');
    expect(migration).toContain('max_connections integer');
    expect(migration).not.toContain('max_facilities integer NOT NULL');
  });

  it('keeps entitlement writes service-role controlled and reads tenant-scoped', () => {
    expect(migration).toContain('ALTER TABLE public.organization_entitlements ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('GRANT SELECT ON public.organization_entitlements TO authenticated');
    expect(migration).toContain('GRANT ALL ON public.organization_entitlements TO service_role');
    expect(migration).toContain('public.is_org_member(org_id, auth.uid())');
    expect(migration).toContain("public.user_has_role(auth.uid(), 'owner', 'global')");
    expect(migration).not.toMatch(/FOR (INSERT|UPDATE|DELETE)\s+TO authenticated/);
  });

  it('models Chargebee, Stripe and Paddle as connector availability only', () => {
    expect(AURA_BILLING_PROVIDERS.map((entry) => entry.provider)).toEqual(['chargebee', 'stripe', 'paddle']);
    for (const provider of AURA_BILLING_PROVIDERS) {
      expect(provider.status).toBe('CONNECTOR_AVAILABLE');
      expect(provider.liveSideEffectsEnabled).toBe(false);
    }
    expect(catalogue).not.toContain('ACTIVE_BILLING');
    expect(catalogue).not.toContain('checkout.sessions.create');
    expect(catalogue).not.toContain('subscriptions.create');
  });

  it('stores only external billing references and never provider secrets', () => {
    expect(migration).toContain('billing_customer_ref text');
    expect(migration).toContain('billing_subscription_ref text');
    for (const forbidden of ['stripe_secret', 'chargebee_api', 'paddle_api', 'api_key', 'client_secret']) {
      expect(migration.toLowerCase()).not.toContain(forbidden);
    }
  });

  it('keeps private and hybrid hosting independent from any billing provider', () => {
    expect(migration).toContain("'private_cloud'");
    expect(migration).toContain("'hybrid'");
    expect(migration).toContain("billing_provider text NOT NULL DEFAULT 'none'");
    expect(catalogue).not.toContain('lovable.app');
    expect(catalogue).not.toContain('lovable.dev');
  });
});
