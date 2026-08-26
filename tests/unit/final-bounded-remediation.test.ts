import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  modelCapabilityDescription,
  modelDisplayLabel,
  providerDisplayLabel,
} from '../../src/lib/llm/modelLabels';

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
const exists = (relativePath: string) =>
  fs.existsSync(path.resolve(process.cwd(), relativePath));

const shell = read('src/AuthenticatedShell.tsx');
const config = read('supabase/config.toml');
const aiConfigFn = read('supabase/functions/ai-config/index.ts');
const copilotHealthFn = read('supabase/functions/copilot-health/index.ts');

describe('final bounded remediation - route truth and RBAC', () => {
  it('guards builder, deploy, deployments and system manage with the audited permissions', () => {
    expect(shell).toContain(
      '<Route path="/builder" element={<PermissionRouteGuard permission="twin.edit"><Builder /></PermissionRouteGuard>} />',
    );
    expect(shell).toContain(
      '<Route path="/deploy" element={<PermissionRouteGuard permission="deployment.execute"><Deploy /></PermissionRouteGuard>} />',
    );
    expect(shell).toContain(
      '<Route path="/deployments" element={<PermissionRouteGuard permission="deployment.view"><DeploymentHistory /></PermissionRouteGuard>} />',
    );
    expect(shell).toContain(
      '<Route path="/studio/systems/:systemId/manage" element={<PermissionRouteGuard permission="twin.edit"><SystemManage /></PermissionRouteGuard>} />',
    );
  });

  it('keeps the illustrative infrastructure page unmounted and the funding demo development only', () => {
    expect(shell).not.toContain('InfrastructurePage');
    expect(shell).not.toContain('path="/infrastructure"');
    expect(shell).toContain('const FundingIntakeDemo = import.meta.env.DEV');
    expect(shell).toContain('{import.meta.env.DEV && FundingIntakeDemo && (');
  });
});

describe('final bounded remediation - AI edge function boundary', () => {
  it('requires an explicit JWT gate for ai-config and copilot-health', () => {
    expect(config).toContain('[functions.ai-config]');
    expect(config).toContain('[functions.copilot-health]');
    for (const block of ['[functions.ai-config]', '[functions.copilot-health]']) {
      const section = config.slice(config.indexOf(block), config.indexOf(block) + 120);
      expect(section).toContain('verify_jwt = true');
    }
  });

  it('validates the caller in code for both AI handlers', () => {
    for (const source of [aiConfigFn, copilotHealthFn]) {
      expect(source).toContain('requireCaller');
      expect(source).toContain('callerRejectedResponse');
    }
  });

  it('returns only server-owned, provider-neutral runtime capability state', () => {
    for (const source of [aiConfigFn, copilotHealthFn]) {
      expect(source).toContain("runtimeControl: 'server_owned'");
      expect(source).toContain('managedAi');
      expect(source).toContain('groundingSearch');
      expect(source).not.toContain('active_provider');
      expect(source).not.toContain('external_google');
      expect(source).not.toContain("provider: 'lovable_managed'");
    }

    // Browser-visible contracts do not echo provider project, location,
    // residency-region, raw model or credential authority.
    expect(aiConfigFn).not.toContain('projectId:');
    expect(aiConfigFn).not.toContain('location:');
    expect(aiConfigFn).not.toContain('model:');
    expect(copilotHealthFn).not.toContain("Deno.env.get('GEMINI_MODEL')");
    expect(copilotHealthFn).toContain("checkAIHealth({ model: 'primary' })");
  });

  it('keeps the AI settings consumer on the server-owned neutral contract', () => {
    const aiSettings = read('src/pages/AISettings.tsx');
    expect(aiSettings).toContain("runtimeControl: 'server_owned';");
    expect(aiSettings).toContain('managedAi: { available: boolean };');
    expect(aiSettings).toContain('groundingSearch: { available: boolean; reason: string };');
    expect(aiSettings).toContain('managedAi: ProbeResult;');
    expect(aiSettings).toContain('groundingSearch: ProbeResult;');
    expect(aiSettings).toContain("invokeEdgeFunction('ai-config', {})");
    expect(aiSettings).toContain("invokeEdgeFunction('copilot-health', {})");
    expect(aiSettings).not.toContain('healthStatus.gemini');
    expect(aiSettings).not.toContain('healthStatus.vertexSearch');
    expect(aiSettings).not.toContain('DEFAULT_EXTERNAL_MODEL');
    expect(aiSettings).not.toContain('projectId');
  });
});

describe('final bounded remediation - rendered provider strings', () => {
  const cases: Array<[string, string]> = [
    ['src/pages/Deploy.tsx', 'Vertex AI for model serving'],
    ['src/lib/builderValidation.ts', 'Gemini or Vertex'],
    ['src/twins/sovereignDataCenter/components/SovereignDCDeploymentChecklist.tsx', 'Gemini/GPT model set'],
    ['src/i18n/locales/en.ts', 'GCP metrics'],
    ['src/i18n/locales/fr-CA.ts', 'Métriques GCP'],
  ];

  it.each(cases)('%s no longer renders %s', (file, needle) => {
    expect(read(file)).not.toContain(needle);
  });

  it('renders neutral replacements', () => {
    expect(read('src/pages/Deploy.tsx')).toContain('Managed AI model serving');
    expect(read('src/lib/builderValidation.ts')).toContain('Enable at least one approved AI engine');
    expect(read('src/twins/sovereignDataCenter/components/SovereignDCDeploymentChecklist.tsx')).toContain(
      'Managed AI model set for multi-objective optimization',
    );
    expect(read('src/i18n/locales/en.ts')).toContain("intGcp: 'Cloud data', intGcpDesc: 'Cloud metrics',");
  });

  it('never renders a raw model identifier in the template preview or decision replay', () => {
    const preview = read('src/components/templates/StandardizedTemplatePreview.tsx');
    expect(preview).toContain("modelDisplayLabel(config.model || 'google/gemini-2.5-flash')");
    const replay = read('src/components/rag/DecisionReplayModal.tsx');
    expect(replay).not.toMatch(/>gemini-1\.5-pro</);
    expect(replay).toContain('modelDisplayLabel("gemini-1.5-pro")');
    expect(replay).not.toContain('Vertex AI Grounding');
  });

  it('drops dead provider-named i18n keys', () => {
    for (const file of ['src/i18n/locales/en.ts', 'src/i18n/locales/fr-CA.ts']) {
      expect(read(file)).not.toContain('Vertex AI');
    }
  });
});

describe('final bounded remediation - model catalogue', () => {
  it('removes the dead marketplace UI and keeps ModelPreview on the lightweight catalogue', () => {
    expect(exists('src/components/builder/ModelMarketplace.tsx')).toBe(false);
    expect(exists('src/lib/llm/modelCatalog.ts')).toBe(true);
    const preview = read('src/components/builder/ModelPreview.tsx');
    expect(preview).toContain('from "@/lib/llm/modelCatalog"');
    expect(preview).not.toContain('ModelMarketplace');
    expect(preview).toContain('modelDisplayLabel(selectedModel.id)');
    expect(preview).toContain('providerDisplayLabel(selectedModel.provider)');
    expect(preview).toContain('modelCapabilityDescription(selectedModel)');
  });

  it('retains internal identifiers and pricing in the catalogue data', () => {
    const catalogue = read('src/lib/llm/modelCatalog.ts');
    expect(catalogue).toContain('export interface ModelConfig');
    expect(catalogue).toContain('export const models: ModelConfig[]');
    expect(catalogue).toContain('pricingDetails');
    expect(catalogue).toContain('contextWindow');
  });

  it('falls back safely for unknown provider and model values', () => {
    expect(modelDisplayLabel('some/unreleased-model')).toBe('Managed AI');
    expect(modelDisplayLabel(null)).toBe('Managed AI');
    expect(providerDisplayLabel('Unknown Vendor')).toBe('Managed AI');
    expect(providerDisplayLabel('Google')).not.toMatch(/google/i);
    expect(modelDisplayLabel('google/gemini-2.5-flash')).toBe('Fast');
    expect(modelCapabilityDescription({ speed: 'fast', capabilities: ['Text'] })).not.toMatch(
      /gemini|openai|anthropic/i,
    );
  });
});

describe('final bounded remediation - tenancy and RBAC hooks', () => {
  it('resolves the active tenant through the canonical helper', () => {
    expect(read('src/connections/api.ts')).toContain('active_org_id');
    expect(read('src/pages/account/Settings.tsx')).toContain('active_org_id');
  });

  it('keeps Teams on the RBAC context', () => {
    const teams = read('src/pages/Teams.tsx');
    expect(teams).toContain('useRBAC');
    expect(teams).not.toContain('useUserPermissions(');
  });
});
