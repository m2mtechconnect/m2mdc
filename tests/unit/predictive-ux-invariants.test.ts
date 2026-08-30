import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  INVITABLE_ORGANIZATION_ROLES,
  ORGANIZATION_ROLE_LABELS,
  ORGANIZATION_ROLE_PERMISSIONS,
} from '@/auth/organizationAuthorization';
import { routeUsesShellOperatingState } from '@/components/capability/operatingStateRoute';
import { stableVisualizationFraction } from '@/components/twin-visualization/hooks/useTwinVisualizationData';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

function testSources(directory: string): string[] {
  return readdirSync(resolve(process.cwd(), directory)).flatMap((entry) => {
    const relativePath = `${directory}/${entry}`;
    const absolutePath = resolve(process.cwd(), relativePath);
    if (statSync(absolutePath).isDirectory()) return testSources(relativePath);
    return /\.(test|spec)\.[cm]?[jt]sx?$/.test(entry) ? [relativePath] : [];
  });
}

describe('predictive UX invariants', () => {
  it('derives identical visualization values from identical identities without ambient entropy', () => {
    const seed = 'facility-1|rack-1|temperature';
    expect(stableVisualizationFraction(seed)).toBe(stableVisualizationFraction(seed));
    expect(stableVisualizationFraction(seed)).not.toBe(
      stableVisualizationFraction('facility-2|rack-1|temperature'),
    );
    expect(stableVisualizationFraction(seed)).toBeGreaterThanOrEqual(0);
    expect(stableVisualizationFraction(seed)).toBeLessThanOrEqual(1);

    const source = read('src/components/twin-visualization/hooks/useTwinVisualizationData.ts');
    expect(source).not.toContain('Math.random()');
    expect(source).not.toContain('Date.now()');
  });

  it('keeps every assignable organization role in one labelled permission registry', () => {
    expect(new Set(INVITABLE_ORGANIZATION_ROLES).size).toBe(INVITABLE_ORGANIZATION_ROLES.length);
    for (const role of INVITABLE_ORGANIZATION_ROLES) {
      expect(ORGANIZATION_ROLE_LABELS[role]).toBeTruthy();
      expect(ORGANIZATION_ROLE_PERMISSIONS[role]).toBeDefined();
    }
    expect(INVITABLE_ORGANIZATION_ROLES).toContain('viewer');
  });

  it('shows the shell run context only where the same run authority is consumed', () => {
    expect(routeUsesShellOperatingState('/dashboard')).toBe(true);
    for (const route of [
      '/analytics',
      '/simulation',
      '/evidence/overview',
      '/account/settings',
      '/teams/access-control',
      '/manage/integrations',
      '/settings/ai',
      '/deployments',
    ]) {
      expect(routeUsesShellOperatingState(route)).toBe(false);
    }
  });

  it('requires a first rendered scene frame instead of treating canvas presence as ready', () => {
    const host = read('src/workspace/FacilityCanvas.tsx');
    const scene = read('src/components/twin-visualization/DataCenter3DScene.tsx');
    expect(host).not.toContain("querySelector('canvas')");
    expect(host).toContain("useState<ViewMode>('2d')");
    expect(host).toContain("import('@/components/twin-visualization/DataCenter3DScene')");
    expect(host).toContain('onSceneReady={handleSceneReady}');
    expect(scene).toContain('<SceneReadySignal onReady={props.onSceneReady} />');
  });

  it('rejects always-pass assertions and shell-dependent command strings in test gates', () => {
    const alwaysPass = new RegExp([
      'expect\\([^\\n]*',
      '\\|\\|\\s*true',
      '|expect\\(true\\)\\.toBe\\(true\\)',
    ].join(''));
    const offenders = [...testSources('tests'), ...testSources('src')]
      .filter((path) => {
        const source = read(path);
        return alwaysPass.test(source) || /\bexecSync\s*\(/.test(source);
      });

    expect(offenders).toEqual([]);
  });

  it('keeps performance qualification on authenticated current routes and meaningful readiness', () => {
    const performanceGate = read('tests/truth-in-ui/authenticated-performance.spec.ts');
    expect(performanceGate).toContain("path: '/dashboard'");
    expect(performanceGate).toContain("path: '/analytics'");
    expect(performanceGate).toContain("path: '/simulation?step=inspect'");
    expect(performanceGate).toContain("path: '/evidence/overview'");
    expect(performanceGate).toContain("path: '/search'");
    expect(performanceGate).toContain("path: '/account/settings'");
    expect(performanceGate).toContain("path: '/settings/ai'");
    expect(performanceGate).toContain('meaningfulMarker');
    expect(performanceGate).not.toContain("path: '/marketplace");
    expect(performanceGate).not.toContain("page.goto('/agents')");
    expect(performanceGate).not.toContain("waitForLoadState('networkidle')");

    const operations = read('src/pages/IntelligenceDashboard.tsx');
    const layout = read('src/components/Layout.tsx');
    expect(operations).not.toContain('Operational telemetry service is unavailable in this environment.');
    expect(operations).not.toContain("queryKey: ['ops-overview'");
    expect(operations).toContain('<DataTrustStrip state={dataTrust} />');
    expect(layout).toContain('min-h-[calc(100svh-3.5rem)]');
  });
});
