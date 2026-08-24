/**
 * Neutral stack-surface + canonical URL contract.
 *
 * Two regressions are guarded here:
 *
 *  1. The stack manifest becoming dead configuration again. High-traffic
 *     surfaces must consume `auraStackManifest` rather than re-typing stack
 *     wording, otherwise vendor names drift back into customer copy.
 *  2. Implementation-named URLs leaking back into navigation and share links.
 *     `/dsx/evidence-beta` and friends stay mounted as compatibility
 *     redirects, but nothing may emit them.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  AURA_STACK_MANIFEST,
  FORBIDDEN_CUSTOMER_STRINGS,
  customerVisibleStack,
  stackCopy,
  stackDescription,
  stackLabel,
} from '../../src/config/auraStackManifest';
import {
  ACCELERATED_AI_CAPABILITIES_LABEL,
  ACCELERATED_AI_CAPABILITIES_ROUTE,
  EVIDENCE_CANONICAL_PATHS,
  EVIDENCE_ROOT,
  LEGACY_CAPABILITIES_ROUTE,
  LEGACY_EVIDENCE_ROOT,
  evidencePath,
  isLegacyNamedPath,
  neutralEvidencePath,
} from '../../src/config/evidenceRoutes';
import {
  ALL_ROUTES,
  NON_EMITTABLE_PATHS,
  canonicalSharePath,
  isNonEmittablePath,
} from '../../src/config/routeRegistry';
import { MANAGE_NAV, SUPPORT_NAV, WORKSPACE_NAV } from '../../src/config/appNavigation';
import { ROUTE_ALIASES } from '../../src/config/routeAliases';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

// ------------------------------------------------------- manifest consumption

/** Surfaces that must derive stack wording from the manifest, not literals. */
const MANIFEST_CONSUMERS = [
  'src/config/appNavigation.ts',
  'src/components/landing/TwinIntegrationsGrid.tsx',
  'src/components/builder/steps/Step2Intelligence.tsx',
  'src/components/builder/dc-steps/DCStep3Integrations.tsx',
  'src/pages/Blueprint.tsx',
  'src/pages/Deploy.tsx',
  'src/pages/Connections.tsx',
  'src/pages/Help.tsx',
  'src/pages/admin/PlatformReadiness.tsx',
  'src/components/stack/AURAStackSummary.tsx',
];

describe('stack manifest drives the frontend', () => {
  it.each(MANIFEST_CONSUMERS)('%s consumes the stack manifest', (file) => {
    const source = read(file);
    const usesManifest =
      /from ['"]@\/config\/auraStackManifest['"]/.test(source) ||
      /from ['"]@\/components\/stack\/AURAStackSummary['"]/.test(source);
    expect(usesManifest).toBe(true);
  });

  it('exposes a label, description and qualifier for every capability', () => {
    for (const capability of AURA_STACK_MANIFEST) {
      expect(stackLabel(capability.id)).toBe(capability.label);
      expect(stackDescription(capability.id)).toBe(capability.description);
      const copy = stackCopy(capability.id);
      expect(copy.qualifiedLabel).toContain(capability.label);
    }
  });

  it('qualifies non-available capabilities so nothing reads as live', () => {
    const accelerated = stackCopy('ai.accelerated');
    expect(accelerated.qualifier).toBeTruthy();
    expect(accelerated.qualifiedLabel).not.toBe(accelerated.label);

    const simulation = stackCopy('simulation.engine');
    expect(simulation.qualifier?.toLowerCase()).toContain('simulated');
  });

  it('never exposes internal provider or implementation identifiers', () => {
    for (const capability of customerVisibleStack()) {
      const copy = `${capability.label} ${capability.description}`;
      for (const forbidden of FORBIDDEN_CUSTOMER_STRINGS) {
        expect(copy.toLowerCase()).not.toContain(forbidden.toLowerCase());
      }
    }
  });

  it('keeps the AURAStackSummary driven only by customerVisibleStack', () => {
    const source = read('src/components/stack/AURAStackSummary.tsx');
    expect(source).toContain('customerVisibleStack(surface)');
    // No provider logos: the component renders text and badges only.
    expect(source).not.toMatch(/<img\b/);
  });

  it('places the stack summary only where users need the architecture', () => {
    expect(read('src/pages/Help.tsx')).toContain('<AURAStackSummary surface="help" />');
    expect(read('src/pages/admin/PlatformReadiness.tsx')).toContain(
      '<AURAStackSummary surface="readiness" />',
    );
  });
});

// ----------------------------------------------------- neutral evidence URLs

describe('neutral canonical Evidence routes', () => {
  const shell = read('src/AuthenticatedShell.tsx');

  it('mounts the full neutral Evidence matrix', () => {
    expect(shell).toContain('<Route path="/evidence" element={<EvidenceBetaShell />}>');
    for (const sub of [
      'overview',
      'operations/thermal',
      'operations/power',
      'operations/cooling',
      'operations/compute',
      'operations/workload',
      'sustainability',
      'sustainability/financial',
      'sustainability/sovereignty',
      'decisions',
      'decisions/log',
      'assets',
    ]) {
      expect(shell).toContain(`<Route path="${sub}"`);
    }
  });

  it('builds canonical paths from the neutral root', () => {
    expect(evidencePath()).toBe(EVIDENCE_ROOT);
    expect(evidencePath('decisions/log')).toBe('/evidence/decisions/log');
    expect(evidencePath('/assets')).toBe('/evidence/assets');
    expect(EVIDENCE_CANONICAL_PATHS.every((p) => p.startsWith(`${EVIDENCE_ROOT}/`))).toBe(true);
  });

  it('sends /evidence to the overview rather than a legacy alias', () => {
    expect(shell).toContain('<Route index element={<PreserveNavigate to="/evidence/overview" />} />');
    expect(ROUTE_ALIASES.some((a) => a.from === EVIDENCE_ROOT)).toBe(false);
  });

  it('keeps the legacy family as a single-hop compatibility redirect', () => {
    expect(shell).toContain('<Route path="/dsx/evidence-beta/*" element={<LegacyEvidenceRedirect />} />');
    // PreserveNavigate is what carries query and hash across the hop.
    expect(shell).toMatch(/function LegacyEvidenceRedirect[\s\S]*PreserveNavigate/);
  });

  it('rewrites legacy paths onto the neutral family without losing the section', () => {
    expect(neutralEvidencePath(LEGACY_EVIDENCE_ROOT)).toBe(EVIDENCE_ROOT);
    expect(neutralEvidencePath(`${LEGACY_EVIDENCE_ROOT}/operations/power`)).toBe(
      '/evidence/operations/power',
    );
    expect(neutralEvidencePath(LEGACY_CAPABILITIES_ROUTE)).toBe(ACCELERATED_AI_CAPABILITIES_ROUTE);
    expect(neutralEvidencePath('/dashboard')).toBe('/dashboard');
  });

  it('shares legacy deep links as their neutral equivalent', () => {
    expect(canonicalSharePath(`${LEGACY_EVIDENCE_ROOT}/decisions/log`, 'internal')).toBe(
      '/evidence/decisions/log',
    );
    expect(canonicalSharePath(LEGACY_EVIDENCE_ROOT, 'public')).toBe('/evidence/overview');
  });

  it('produces no redirect loop: every alias target is itself neutral', () => {
    for (const alias of ROUTE_ALIASES) {
      expect(isLegacyNamedPath(alias.to.split(/[?#]/)[0])).toBe(false);
      expect(alias.to.split(/[?#]/)[0]).not.toBe(alias.from);
    }
  });
});

// ------------------------------------------------- accelerated AI admin route

describe('accelerated AI capability registry', () => {
  it('mounts the neutral canonical admin route', () => {
    expect(read('src/AuthenticatedShell.tsx')).toContain(
      '<Route path="/admin/accelerated-ai-capabilities"',
    );
    expect(ALL_ROUTES.some((r) => r.path === ACCELERATED_AI_CAPABILITIES_ROUTE)).toBe(true);
  });

  it('keeps the programme-named path as a compatibility alias only', () => {
    const alias = ROUTE_ALIASES.find((a) => a.from === LEGACY_CAPABILITIES_ROUTE);
    expect(alias?.to).toBe(ACCELERATED_AI_CAPABILITIES_ROUTE);
    expect(isNonEmittablePath(LEGACY_CAPABILITIES_ROUTE)).toBe(true);
  });

  it('shows a provider-neutral label in navigation', () => {
    const admin = MANAGE_NAV.find((i) => i.href === '/admin/platform-readiness');
    const child = admin?.children?.find((c) => c.href === ACCELERATED_AI_CAPABILITIES_ROUTE);
    expect(child?.name).toBe(ACCELERATED_AI_CAPABILITIES_LABEL);
    expect(child?.name).not.toMatch(/DSX/i);
  });
});

// --------------------------------------------------------- emission contract

describe('navigation and share links never emit retired paths', () => {
  const navItems = [...WORKSPACE_NAV, ...MANAGE_NAV, ...SUPPORT_NAV].flatMap((item) => [
    item,
    ...(item.children ?? []),
  ]);

  it('TwinFooter never emits /omniverse-scene', () => {
    const source = read('src/components/landing/TwinFooter.tsx');
    const code = source
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n');
    expect(code).not.toContain("'/omniverse-scene'");
    expect(code).not.toContain('"/omniverse-scene"');
    expect(code).toContain('"/twin-preview"');
  });

  it('emits only neutral hrefs', () => {
    for (const item of navItems) {
      expect(isLegacyNamedPath(item.href), `${item.name} -> ${item.href}`).toBe(false);
      expect(item.href).not.toContain('/dsx/');
      expect(item.href).not.toContain('/omniverse-scene');
      expect(item.href).not.toContain('/settings/integrations/nvidia-dsx');
    }
  });

  it('points Evidence at the neutral overview', () => {
    const evidence = WORKSPACE_NAV.find((i) => i.name === 'Evidence');
    expect(evidence?.href).toBe('/evidence/overview');
    // Legacy paths may still be matched for active-state highlighting.
    expect(evidence?.matches).toContain(LEGACY_EVIDENCE_ROOT);
  });

  it('classifies retired paths as non-emittable', () => {
    for (const path of [
      LEGACY_EVIDENCE_ROOT,
      `${LEGACY_EVIDENCE_ROOT}/overview`,
      LEGACY_CAPABILITIES_ROUTE,
      '/settings/integrations/nvidia-dsx',
    ]) {
      expect(isNonEmittablePath(path), path).toBe(true);
    }
    expect(NON_EMITTABLE_PATHS.length).toBe(new Set(NON_EMITTABLE_PATHS).size);
  });

  it('keeps evidence-related source files off the retired root', () => {
    for (const file of [
      'src/config/appNavigation.ts',
      'src/dsx/workspaces/relatedViews.ts',
      'src/data/dataset/surfaceRegistry.ts',
      'src/pages/Help.tsx',
    ]) {
      const source = read(file)
        .split('\n')
        // Comments may explain the retired path; code may not emit it.
        .filter((line) => !line.trim().startsWith('*') && !line.trim().startsWith('//'))
        .join('\n');
      expect(source, file).not.toContain("'/dsx/evidence-beta");
      expect(source, file).not.toContain('"/dsx/evidence-beta');
    }
  });
});
