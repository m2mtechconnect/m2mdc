import {
  authorizationUrlIsDemoProviderSafe,
  authorizationUrlIsWhiteLabelSafe,
  demoManagedOAuthEnabled,
  managedUserOAuthGatewayPolicy,
} from './whiteLabelGateway.ts';

function setEnv(name: string, value: string | null) {
  if (value === null) Deno.env.delete(name);
  else Deno.env.set(name, value);
}

function withEnv(values: Record<string, string | null>, fn: () => void) {
  const before = new Map<string, string | undefined>();
  for (const [name, value] of Object.entries(values)) {
    before.set(name, Deno.env.get(name));
    setEnv(name, value);
  }
  try {
    fn();
  } finally {
    for (const [name, value] of before.entries()) setEnv(name, value ?? null);
  }
}

Deno.test('demo managed oauth requires both demo environment and server enablement', () => {
  withEnv({ AURA_RELEASE_ENVIRONMENT: 'production', AURA_DEMO_MANAGED_OAUTH: 'true' }, () => {
    if (demoManagedOAuthEnabled()) throw new Error('production must not enable demo oauth');
  });
  withEnv({ AURA_RELEASE_ENVIRONMENT: 'demo', AURA_DEMO_MANAGED_OAUTH: 'false' }, () => {
    if (demoManagedOAuthEnabled()) throw new Error('demo flag must be explicit');
  });
  withEnv({ AURA_RELEASE_ENVIRONMENT: 'demo', AURA_DEMO_MANAGED_OAUTH: 'true' }, () => {
    if (!demoManagedOAuthEnabled()) throw new Error('explicit demo oauth should be enabled');
  });
});

Deno.test('demo oauth transport is isolated from managed shared connector policy', () => {
  withEnv({
    AURA_RELEASE_ENVIRONMENT: 'demo',
    AURA_DEMO_MANAGED_OAUTH: 'true',
    AURA_STRICT_WHITE_LABEL: 'true',
    AURA_MANAGED_CONNECTOR_GATEWAY_URL: null,
  }, () => {
    const policy = managedUserOAuthGatewayPolicy();
    if (!policy.runtimeAllowed) throw new Error('demo managed-user oauth should be allowed');
    if (policy.reason !== 'DEMO_MANAGED_OAUTH_ALLOWED') throw new Error(`unexpected reason: ${policy.reason}`);
    if (policy.auraOwned) throw new Error('demo transport must not claim AURA-owned infrastructure');
  });
});

Deno.test('demo authorization accepts only the explicit provider host', () => {
  withEnv({ AURA_RELEASE_ENVIRONMENT: 'demo', AURA_DEMO_MANAGED_OAUTH: 'true' }, () => {
    const providerUrl = 'https://accounts.google.com/o/oauth2/v2/auth?redirect_uri=https%3A%2F%2Fconnector-gateway.lovable.dev%2Fcallback';
    if (!authorizationUrlIsDemoProviderSafe(providerUrl, ['accounts.google.com'])) {
      throw new Error('approved Google authorization host should be accepted in demo mode');
    }
    if (authorizationUrlIsDemoProviderSafe('https://connector-gateway.lovable.dev/oauth', ['accounts.google.com'])) {
      throw new Error('implementation gateway must never be a top-level browser destination');
    }
    if (authorizationUrlIsDemoProviderSafe('https://evil.example/oauth', ['accounts.google.com'])) {
      throw new Error('unapproved authorization host must be rejected');
    }
    if (authorizationUrlIsWhiteLabelSafe(providerUrl)) {
      throw new Error('production white-label URL check must still reject nested implementation callback');
    }
  });
});
