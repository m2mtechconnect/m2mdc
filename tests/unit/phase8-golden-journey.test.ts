import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const publicRoutes = read('src/PublicAppRoutes.tsx');
const connections = read('src/connections/api.ts');
const aiSettings = read('src/pages/AISettings.tsx');
const deploy = read('src/pages/Deploy.tsx');
const deploymentHistory = read('src/pages/DeploymentHistory.tsx');

describe('Phase 8 AURA static truth and safety guards', () => {
  it('does not reintroduce a browser-local onboarding completion authority', () => {
    expect(publicRoutes).not.toContain('onboarding_completed');
  });

  it('does not reintroduce platform-wide browser-scoped connection authority', () => {
    expect(connections).not.toContain('Platform-wide (no tenant)');
  });

  it('does not reintroduce client-owned provider or model defaults', () => {
    expect(aiSettings).not.toContain('DEFAULT_EXTERNAL_MODEL');
    expect(aiSettings).not.toContain('localStorage');
  });

  it('does not claim external runtime provisioning where only AURA configuration activation exists', () => {
    expect(deploy).not.toContain('Deploy to Production');
    expect(deploy).not.toContain('AWS Recommendations');
    expect(deploymentHistory).not.toContain('Running systems');
  });
});
