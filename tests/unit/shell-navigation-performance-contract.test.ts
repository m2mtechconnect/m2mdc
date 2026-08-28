import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');

describe('authenticated shell navigation performance contract', () => {
  const app = read('src/App.tsx');
  const shell = read('src/AuthenticatedShell.tsx');
  const layout = read('src/components/Layout.tsx');
  const loaders = read('src/routing/primaryWorkspaceLoaders.ts');
  const buildVersion = read('src/components/BuildVersion.tsx');

  it('shares preloadable module loaders with all five permanent workspace routes', () => {
    for (const path of ['/dashboard', '/builder', '/analytics', '/simulation', '/evidence/overview']) {
      expect(loaders).toContain(`'${path}'`);
    }
    expect(shell).toContain('const Dashboard = lazy(loadDashboard)');
    expect(shell).toContain('const Builder = lazy(loadBuilder)');
    expect(shell).toContain('const IntelligenceDashboard = lazy(loadOperations)');
    expect(shell).toContain('const AuraWorkspace = lazy(loadSimulation)');
    expect(shell).toContain('const EvidenceBetaShell = lazy(loadEvidenceShell)');
  });

  it('warms authenticated workspace routes on idle and navigation intent', () => {
    expect(layout).toContain('preloadPrimaryWorkspace(href)');
    expect(layout).toContain('window.setTimeout(warmNext, 750)');
    expect(layout).toContain('onPointerEnter={() => preloadWorkspaceIntent(item.href)}');
    expect(layout).toContain('onFocus={() => preloadWorkspaceIntent(item.href)}');
    expect(layout).toContain('onTouchStart={() => preloadWorkspaceIntent(item.href)}');
  });

  it('does not leave the previous workspace visible while a new route suspends', () => {
    expect(app).toContain('<BrowserRouter useTransitions={false}>');
    expect(shell).toContain('<Suspense\n                    key={location.pathname}');
    expect(shell).toContain('Loading workspace...');
  });

  it('detects a stale open tab from the canonical release fingerprint', () => {
    expect(buildVersion).toContain('if (!import.meta.env.PROD) return');
    expect(buildVersion).toContain('`/release.json?build=${encodeURIComponent(currentBuild.buildId)}&check=${Date.now()}`');
    expect(buildVersion).toContain("cache: 'no-store'");
    expect(buildVersion).toContain('published.sha !== currentBuild.commitSha');
    expect(buildVersion).toContain('published.buildId !== currentBuild.buildId');
    expect(buildVersion).not.toContain('localStorage.getItem("app_version")');
  });

  it('keeps the public pilot label separate from the exact build fingerprint', () => {
    expect(buildVersion).toContain("const PUBLIC_RELEASE_CHANNEL = 'pilot'");
    expect(buildVersion).toContain('<span>v{PUBLIC_RELEASE_CHANNEL}</span>');
    expect(buildVersion).not.toContain('<span>v{currentBuild.appVersion}</span>');
  });
});
