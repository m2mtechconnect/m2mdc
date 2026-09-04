// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = process.cwd();
const inventory = JSON.parse(
  readFileSync(
    join(REPO, 'docs/remediation/evidence/pr-0.1/edge-function-inventory.json'),
    'utf8',
  ),
) as Array<Record<string, unknown>>;
const config = readFileSync(join(REPO, 'supabase/config.toml'), 'utf8');
const source = readFileSync(
  join(REPO, 'supabase/functions/auth-email-hook/index.ts'),
  'utf8',
);
const packageManifest = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8')) as {
  overrides?: Record<string, string>;
};
const bunLock = readFileSync(join(REPO, 'bun.lock'), 'utf8');

describe('auth email hook production perimeter contract', () => {
  it('records the provider callback as a signed webhook, not an anonymous API', () => {
    const entry = inventory.find((item) => item.function === 'auth-email-hook');

    expect(entry).toMatchObject({
      deployed: true,
      verify_jwt_gateway: false,
      webhook_signature_verification: true,
      uses_service_role_key: true,
      production_disposition: 'signed-webhook',
    });
    expect(config).toMatch(/\[functions\.auth-email-hook\][\s\S]*?verify_jwt\s*=\s*false/);
  });

  it('verifies the provider signature before privileged email enqueue', () => {
    expect(source).toContain('verifyWebhookRequest');
    expect(source).toContain('x-lovable-signature');
    expect(source).toContain('x-lovable-timestamp');

    const verification = source.indexOf('verifyWebhookRequest');
    const serviceClient = source.indexOf('SUPABASE_SERVICE_ROLE_KEY');
    const enqueue = source.indexOf("supabase.rpc('enqueue_email'");

    expect(verification).toBeGreaterThanOrEqual(0);
    expect(serviceClient).toBeGreaterThan(verification);
    expect(enqueue).toBeGreaterThan(serviceClient);
  });

  it('keeps the webhook originless and preview CORS on the shared policy', () => {
    expect(source).toContain("from '../_shared/cors.ts'");
    expect(source).not.toMatch(/Access-Control-Allow-Origin['"`]\s*:\s*['"`]\*['"`]/);
    expect(source).toContain('handleCorsPreflightRequest');
    expect(source).toContain('getCorsHeaders(req.headers.get(\'origin\'))');
  });

  it('keeps the vulnerable fflate release out of the Bun dependency graph', () => {
    expect(packageManifest.overrides).toMatchObject({ fflate: '0.6.11' });
    expect(bunLock).toContain('"fflate": ["fflate@0.6.11"');
    expect(bunLock).not.toContain('fflate@0.6.10');
  });
});
