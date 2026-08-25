import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

const settings = read('src/pages/AISettings.tsx');
const health = read('supabase/functions/copilot-health/index.ts');
const config = read('supabase/functions/ai-config/index.ts');
const modelsTest = read('supabase/functions/models-test/index.ts');
const adminRegistry = read('src/pages/admin/DsxCapabilityRegistryPage.tsx');

describe('Phase 4 managed AI runtime truth', () => {
  it('keeps runtime authority server-owned instead of browser-configurable', () => {
    expect(settings).toContain('server-owned');
    expect(settings).not.toContain('Managed AI Workspace ID');
    expect(settings).not.toContain('Data residency');
    expect(settings).not.toContain('gemini-');
    expect(config).toContain("runtimeControl: 'server_owned'");
    expect(config).not.toContain('GOOGLE_APPLICATION_CREDENTIALS_JSON');
    expect(config).not.toContain('GOOGLE_PROJECT_ID');
  });

  it('health-checks the same centralized AI runtime used by execution', () => {
    expect(health).toContain("from '../_shared/ai-client.ts'");
    expect(health).toContain('checkAIHealth');
    expect(health).not.toContain('aiplatform.googleapis.com');
    expect(health).not.toContain('ai.gateway.lovable.dev');
    expect(health).not.toContain('projectId');
  });

  it('removes arbitrary client model selection from the legacy model test endpoint', () => {
    expect(modelsTest).toContain('client_model_selection_removed');
    expect(modelsTest).toContain('checkAIHealth');
    expect(modelsTest).not.toContain("modelId.startsWith");
    expect(modelsTest).not.toContain('openai/');
    expect(modelsTest).not.toContain('anthropic/');
  });

  it('keeps NVIDIA and Nemotron truth admin-only and explicitly non-runtime', () => {
    expect(settings).not.toContain('Nemotron');
    expect(adminRegistry).toContain('Nemotron 3.5 Lightning 30B-A3B');
    expect(adminRegistry).toContain('Nemotron 3 Super 120B-A12B');
    expect(adminRegistry).toContain('No NVIDIA NIM runtime is invoked');
  });
});
