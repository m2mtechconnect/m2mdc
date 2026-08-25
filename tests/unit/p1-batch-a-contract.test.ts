import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const settings = read('src/pages/account/Settings.tsx');
const aiSettings = read('src/pages/AISettings.tsx');
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

describe('P1 Batch A managed AI configuration truth contract', () => {
  it('uses supported external response profiles rather than retired Gemini 1.5 defaults', () => {
    expect(aiSettings).toContain("const DEFAULT_EXTERNAL_MODEL = 'gemini-3.5-flash';");
    expect(aiSettings).toContain("const FAST_EXTERNAL_MODEL = 'gemini-3.5-flash-lite';");
    expect(aiSettings).toContain('setModel(normalizeExternalModel(settings.model))');
    expect(aiSettings).not.toMatch(/<SelectItem[^>]+gemini-1\.5-/);
  });

  it('migrates stale browser-saved response profiles instead of resubmitting them', () => {
    expect(aiSettings).toContain('normalizeExternalModel');
    expect(aiSettings).toContain("'gemini-1.5-flash-002'");
    expect(aiSettings).toContain('SUPPORTED_EXTERNAL_MODELS.has(value)');
  });

  it('does not present an unprobed configuration form as operational runtime evidence', () => {
    expect(aiSettings).toMatch(/title="Managed AI configuration"[\s\S]*?status="neutral"/);
    expect(aiSettings).toMatch(/title="Generation Parameters"[\s\S]*?status="neutral"/);
    expect(aiSettings).toContain('The selected profile is validated only when you run the health check.');
    expect(aiSettings).toMatch(/title="Health Check Results"[\s\S]*?status=\{healthStatus\.managedAi\.status === 'ok' \? 'operational' : 'critical'\}/);
  });

  it('uses the supported external model fallback on the server health probe', () => {
    expect(copilotHealth).toContain("Deno.env.get('GEMINI_MODEL') || 'gemini-3.5-flash'");
  });

  it('preserves the authenticated health-check perimeter', () => {
    expect(copilotHealth).toContain('await requireCaller(req)');
    expect(copilotHealth).toContain('callerRejectedResponse(error, req)');
  });

  it('keeps the provider-managed gateway model separate from the external profile selector', () => {
    expect(copilotHealth).toContain('provider-managed gateway path');
    expect(copilotHealth).toContain("model: 'google/gemini-2.5-flash'");
  });
});
