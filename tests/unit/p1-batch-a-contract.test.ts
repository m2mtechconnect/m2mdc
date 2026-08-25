import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const settings = read('src/pages/account/Settings.tsx');
const aiSettings = read('src/pages/AISettings.tsx');
const aiConfig = read('supabase/functions/ai-config/index.ts');
const copilotHealth = read('supabase/functions/copilot-health/index.ts');

describe('P1 Batch A workspace settings authorization', () => {
  it('uses canonical effective permissions for workspace mutation authority', () => {
    expect(settings).toContain('useRBAC');
    expect(settings).toContain("const { can } = useRBAC();");
    expect(settings).toContain("const isAdmin = can('tenant.manage_members');");
  });

  it('does not reintroduce a legacy user_roles role-label authorization decision', () => {
    expect(settings).not.toContain(".from('user_roles')");
    expect(settings).not.toContain("roleData?.role === 'executive'");
  });

  it('keeps active organization resolution server-authoritative', () => {
    expect(settings).toContain("supabase.rpc('active_org_id')");
    expect(settings).toContain("if (!organization || !isAdmin)");
  });
});

describe('P1 Batch A managed AI runtime truth contract', () => {
  it('keeps provider, model, project and credential authority out of the browser', () => {
    expect(aiSettings).toContain("runtimeControl: 'server_owned';");
    expect(aiSettings).toContain('This browser does not configure the AI provider');
    expect(aiSettings).toContain("invokeEdgeFunction('ai-config', {})");
    expect(aiSettings).not.toContain('DEFAULT_EXTERNAL_MODEL');
    expect(aiSettings).not.toContain('FAST_EXTERNAL_MODEL');
    expect(aiSettings).not.toContain('normalizeExternalModel');
    expect(aiSettings).not.toContain('gemini-1.5');
    expect(aiSettings).not.toContain('localStorage');
  });

  it('reports readiness instead of presenting browser configuration as runtime evidence', () => {
    expect(aiSettings).toContain('title="Managed AI runtime"');
    expect(aiSettings).toContain("status={runtimeAvailable ? 'operational' : 'critical'}");
    expect(aiSettings).toContain("runtime?.groundingSearch.available === true ? 'Available' : 'Not exposed'");
    expect(aiSettings).toContain('Runtime health evidence');
    expect(aiSettings).toContain("health?.managedAi.status === 'ok'");
  });

  it('makes the server configuration contract explicitly server-owned and provider-neutral', () => {
    expect(aiConfig).toContain("runtimeControl: 'server_owned'");
    expect(aiConfig).toContain('managedAi');
    expect(aiConfig).toContain('groundingSearch');
    expect(aiConfig).not.toContain('projectId:');
    expect(aiConfig).not.toContain('location:');
    expect(aiConfig).not.toContain('active_provider');
  });

  it('probes the same server-owned runtime used by execution', () => {
    expect(copilotHealth).toContain("checkAIHealth({ model: 'primary' })");
    expect(copilotHealth).toContain("runtimeControl: 'server_owned'");
    expect(copilotHealth).not.toContain("Deno.env.get('GEMINI_MODEL')");
    expect(copilotHealth).not.toContain('req.json()');
  });

  it('preserves the authenticated health-check perimeter', () => {
    expect(copilotHealth).toContain('await requireCaller(req)');
    expect(copilotHealth).toContain('callerRejectedResponse(error, req)');
  });

  it('does not expose provider-managed gateway implementation details as a customer setting', () => {
    expect(aiSettings).not.toContain('provider-managed gateway path');
    expect(aiSettings).not.toContain('google/gemini-2.5-flash');
    expect(aiSettings).not.toContain('GEMINI_MODEL');
  });
});
