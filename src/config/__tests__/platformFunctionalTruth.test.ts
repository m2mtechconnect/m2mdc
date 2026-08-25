import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('platform functional-truth source invariants', () => {
  it('workspace and team authority use canonical permissions instead of ad hoc role labels', () => {
    const settings = source('src/pages/account/Settings.tsx');
    const teams = source('src/pages/Teams.tsx');

    expect(settings).not.toContain("roleData?.role === 'executive'");
    expect(settings).not.toContain('setIsAdmin(isExec)');
    expect(teams).not.toContain("hasRole('admin')");
  });

  it('AI settings keep customer-visible controls AURA white-label', () => {
    const aiSettings = source('src/pages/AISettings.tsx');

    expect(aiSettings).not.toMatch(/Google Cloud Project ID/i);
    expect(aiSettings).not.toMatch(/Vertex AI/i);
    expect(aiSettings).not.toMatch(/Gemini/i);
    expect(aiSettings).not.toMatch(/Google Cloud region/i);
  });

  it('system management does not expose fake-success actions, vendor plumbing or invented intelligence defaults', () => {
    const systemManage = source('src/pages/SystemManage.tsx');

    expect(systemManage).not.toMatch(/will be available soon/i);
    expect(systemManage).not.toMatch(/llmProvider=["']Google["']/i);
    expect(systemManage).not.toMatch(/mcpServers=\{\[\]\}/i);
    expect(systemManage).not.toMatch(/Gemini 2\.5 Flash/i);
    expect(systemManage).not.toMatch(/\['Gemini',\s*'OpenAI'\]/i);
    expect(systemManage).not.toMatch(/temperature:\s*0\.7/);
  });

  it('blueprint preview does not present fixed counts as if they were recommendation-derived facts', () => {
    const preview = source('src/pages/BlueprintPreview.tsx');

    expect(preview).not.toMatch(/<p className="text-lg font-semibold">(?:8|24|12|4)<\/p>/);
  });
});
