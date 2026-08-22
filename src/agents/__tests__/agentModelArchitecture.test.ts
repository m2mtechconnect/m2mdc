import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const read = (path: string) => readFileSync(resolve(ROOT, path), 'utf8');

const ROUTED_ENDPOINTS = [
  'supabase/functions/agent-run/index.ts',
  'supabase/functions/agent-execute/index.ts',
  'supabase/functions/agent-stream/index.ts',
  'supabase/functions/agent-plan-chat/index.ts',
  'supabase/functions/agent-suggestions/index.ts',
  'supabase/functions/models-test/index.ts',
] as const;

const CONNECTION_RESOLVED_ENDPOINTS = [
  ...ROUTED_ENDPOINTS,
  'supabase/functions/ai-config/index.ts',
] as const;

describe('agent/model architecture guards', () => {
  it('keeps direct provider gateway calls out of agent endpoints', () => {
    for (const path of ROUTED_ENDPOINTS) {
      const source = read(path);
      expect(source, path).not.toContain('ai.gateway.lovable.dev');
      expect(source, path).not.toContain("Deno.env.get('LOVABLE_API_KEY')");
      expect(source, path).not.toContain('Deno.env.get("LOVABLE_API_KEY")');
      expect(source, path).toMatch(/model-router\.ts/);
    }
  });

  it('resolves provider configuration through the Connections control plane everywhere', () => {
    for (const path of CONNECTION_RESOLVED_ENDPOINTS) {
      const source = read(path);
      expect(source, path).toContain('resolveRouterEnvironmentForUser');
      expect(source, path).toMatch(/ai-provider-connection\.ts/);
    }
  });

  it('requires authenticated users for paid preview and recommendation paths', () => {
    for (const path of [
      'supabase/functions/agent-plan-chat/index.ts',
      'supabase/functions/agent-suggestions/index.ts',
    ]) {
      const source = read(path);
      expect(source, path).toMatch(/authLevel:\s*["']user["']/);
      expect(source, path).not.toMatch(/authLevel:\s*["']public["']/);
    }
  });

  it('keeps provider/model truth centralized', () => {
    const router = read('supabase/functions/_shared/model-router.ts');
    expect(router).toContain('nvidia/nemotron-3.5-lightning-30b-a3b');
    expect(router).toContain('nvidia/nemotron-3-super-120b-a12b');
    expect(router).toContain('MODEL_PROVIDER_MISMATCH');
    expect(router).toContain('profile:reasoning');
    expect(router).toContain('profile:supervisor');
  });

  it('keeps the NVIDIA connection probe server-owned and secret-free to the browser', () => {
    const source = read('supabase/functions/connection-health-check/index.ts');
    const policy = read('supabase/functions/_shared/ai-provider-policy.ts');
    expect(source).toContain('NVIDIA_AI_CONNECTOR_ID');
    expect(policy).toContain("NVIDIA_AI_CONNECTOR_ID = 'nvidia_ai_provider'");
    expect(source).toContain('decryptCredential');
    expect(source).toContain('NVIDIA_HOSTED_API_BASE');
    expect(source).not.toMatch(/body\?\.(endpoint|url)/);
    expect(source).not.toContain('NVIDIA_API_KEY');

    const connectionModel = read('src/connections/model.ts');
    expect(connectionModel).toContain("'nvidia_ai_provider'");
  });

  it('uses one active-global admin policy across provider provisioning, credentials and health', () => {
    for (const path of [
      'supabase/functions/connection-provision/index.ts',
      'supabase/functions/connection-credential/index.ts',
      'supabase/functions/connection-health-check/index.ts',
    ]) {
      const source = read(path);
      expect(source, path).toContain('hasConnectionAdminAuthority');
      expect(source, path).toMatch(/connection-admin-policy\.ts/);
    }
  });

  it('promotes a passing NVIDIA model response to observed runtime evidence', () => {
    const provision = read('supabase/functions/connection-provision/index.ts');
    expect(provision).toContain("'model_response_present'");
    expect(provision).toContain("const newStatus = dataObserved ? 'HEALTHY' : 'CONNECTED_NO_DATA'");
  });

  it('does not let the marketplace erase unrelated agent config', () => {
    const source = read('src/components/builder/ModelMarketplace.tsx');
    expect(source).toContain('mergeAgentModelConfig');
    expect(source).toMatch(/select\(['"]config['"]\)/);
    expect(source).not.toMatch(/config:\s*\{\s*model:/);
  });

  it('uses canonical AI permissions instead of marketplace role labels', () => {
    const source = read('src/components/builder/ModelMarketplace.tsx');
    expect(source).toContain("can('ai.model.test')");
    expect(source).toContain("can('ai.model.configure')");
    expect(source).not.toContain('hasAccess(');

    const permissions = read('src/auth/permissions.ts');
    expect(permissions).toContain("'ai.model.test'");
    expect(permissions).toContain("'ai.model.configure'");
  });

  it('keeps AI settings provider-neutral', () => {
    const source = read('src/pages/AISettings.tsx');
    expect(source).toContain('profile:');
    expect(source).toContain("supabase.functions.invoke('ai-config'");
    expect(source).toContain("supabase.functions.invoke('models-test'");
    expect(source).not.toContain('gemini-1.5-pro (Recommended)');
    expect(source).not.toContain('copilot-health');
  });
});
