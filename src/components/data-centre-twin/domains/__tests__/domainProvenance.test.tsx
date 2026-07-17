/**
 * Phase 1A.3.c — domain-view + chart-array + InfrastructurePage
 * truth-in-UI regression tests.
 *
 * These render each retrofitted surface in isolation and assert:
 *   • the root `data-provenance` attribute matches the classification
 *     table in `docs/remediation/phase-1a3-scope.md` §4;
 *   • no fixture-backed subtree ever renders `data-provenance="live"`,
 *     even if a hypothetical caller tried to force it via prop;
 *   • the shared `DomainProvenanceHeader` is present exactly once per
 *     surface and exposes a screen-reader-accessible description.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

// Radix / recharts ResizeObserver shim.
class RO { observe() {} unobserve() {} disconnect() {} }
(globalThis as unknown as { ResizeObserver: typeof RO }).ResizeObserver = RO;

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
  };
});

// Real demo facility from the sovereign DC fixture. Using it here also
// exercises the domain views through the same shape the app renders in
// production, so structural regressions are caught by these tests.
import { generateDataCentreFacility } from '@/twins/dataCenter/mockData';
const facility = generateDataCentreFacility('test-facility', 'Test');

import { PowerDomainView } from '../PowerDomainView';
import { CoolingDomainView } from '../CoolingDomainView';
import { NetworkDomainView } from '../NetworkDomainView';
import { FacilityDomainView } from '../FacilityDomainView';
import { WorkloadDomainView } from '../WorkloadDomainView';
import { SovereigntyDomainView } from '../SovereigntyDomainView';
import { CarbonDomainView } from '../CarbonDomainView';
import { FinancialDomainView } from '../FinancialDomainView';
import { ThermalDomainView } from '../ThermalDomainView';
import {
  POWER_METRICS,
  COOLING_METRICS,
  THERMAL_METRICS,
  NETWORK_METRICS,
  FACILITY_METRICS,
  WORKLOAD_METRICS,
  SOVEREIGNTY_METRICS,
  CARBON_METRICS,
  FINANCIAL_METRICS,
} from '../metricCatalogs';
import type { MetricCatalogEntry } from '@/lib/provenance/metricCatalog';

interface DomainCase {
  testId: string;
  Comp: React.FC<{ facility: typeof facility }>;
  rootProvenance: string;
  domainName: string;
  metrics: MetricCatalogEntry[];
}

const cases: DomainCase[] = [
  { testId: 'thermal-domain-view',     Comp: ThermalDomainView,     rootProvenance: 'demo',        domainName: 'thermal',     metrics: THERMAL_METRICS },
  { testId: 'power-domain-view',       Comp: PowerDomainView,       rootProvenance: 'demo',        domainName: 'power',       metrics: POWER_METRICS },
  { testId: 'cooling-domain-view',     Comp: CoolingDomainView,     rootProvenance: 'demo',        domainName: 'cooling',     metrics: COOLING_METRICS },
  { testId: 'network-domain-view',     Comp: NetworkDomainView,     rootProvenance: 'demo',        domainName: 'network',     metrics: NETWORK_METRICS },
  { testId: 'facility-domain-view',    Comp: FacilityDomainView,    rootProvenance: 'demo',        domainName: 'facility',    metrics: FACILITY_METRICS },
  { testId: 'workload-domain-view',    Comp: WorkloadDomainView,    rootProvenance: 'demo',        domainName: 'workload',    metrics: WORKLOAD_METRICS },
  { testId: 'sovereignty-domain-view', Comp: SovereigntyDomainView, rootProvenance: 'unavailable', domainName: 'sovereignty', metrics: SOVEREIGNTY_METRICS },
  { testId: 'carbon-domain-view',      Comp: CarbonDomainView,      rootProvenance: 'demo',        domainName: 'carbon',      metrics: CARBON_METRICS },
  { testId: 'financial-domain-view',   Comp: FinancialDomainView,   rootProvenance: 'demo',        domainName: 'financial',   metrics: FINANCIAL_METRICS },
];

describe('Domain views — Phase 1A.3.c provenance retrofit', () => {
  for (const { testId, Comp, rootProvenance, domainName, metrics } of cases) {
    it(`${testId} root exposes data-provenance="${rootProvenance}", manifest is present, and no descendant is live`, () => {
      const { container } = render(
        <MemoryRouter>
          <Comp facility={facility} />
        </MemoryRouter>,
      );
      const root = container.querySelector(`[data-testid="${testId}"]`);
      expect(root).not.toBeNull();
      expect(root?.getAttribute('data-provenance')).toBe(rootProvenance);
      // No element anywhere in the subtree may claim `live` provenance.
      expect(root?.querySelector('[data-provenance="live"]')).toBeNull();
      const headers = container.querySelectorAll('[data-testid="domain-provenance-header"]');
      expect(headers.length).toBe(1);
      const manifest = container.querySelector(
        `[data-testid="metric-provenance-manifest"][data-domain="${domainName}"]`,
      );
      expect(manifest).not.toBeNull();
      expect(manifest?.getAttribute('data-metric-count')).toBe(String(metrics.length));
      const sr = container.querySelector('[aria-live="polite"]');
      expect(sr?.textContent ?? '').toMatch(/measurement|reference|unavailable|Live/i);
    });

    // Per-metric enumeration: every catalog entry must render with its
    // exact `data-provenance` value. This is the "enumerate expected
    // metric IDs and verify each" acceptance criterion.
    describe(`${testId} — per-metric provenance enumeration`, () => {
      for (const m of metrics) {
        it(`renders metric ${m.id} with data-provenance="${m.provenance}"`, () => {
          const { container } = render(
            <MemoryRouter>
              <Comp facility={facility} />
            </MemoryRouter>,
          );
          const el = container.querySelector(
            `[data-metric-id="${m.id}"]`,
          ) as HTMLElement | null;
          expect(el, `metric ${m.id} not rendered`).not.toBeNull();
          expect(el?.getAttribute('data-provenance')).toBe(m.provenance);
          expect(el?.getAttribute('data-provenance-source')).toBe(m.source);
          // Never `live`, even by accident — this is the fail-closed
          // guarantee at the individual-metric level.
          expect(el?.getAttribute('data-provenance')).not.toBe('live');
        });
      }
    });
  }

  it('ThermalDomainView no longer renders a "Live" pill (renamed to Snapshot)', () => {
    const { container } = render(
      <MemoryRouter>
        <ThermalDomainView facility={facility} />
      </MemoryRouter>,
    );
    // The former legacy pill was a Badge whose accessible text was "Live".
    // Assert that no interactive Badge in the mode-switch header carries that copy.
    const pills = Array.from(container.querySelectorAll('div, span, button'));
    const offenders = pills.filter((n) => n.textContent?.trim() === 'Live');
    expect(offenders).toEqual([]);
  });
});

describe('DomainProvenanceHeader — fail-closed guarantees', () => {
  it('never renders `live` when passed `demo`', async () => {
    const { DomainProvenanceHeader } = await import(
      '@/components/provenance/DomainProvenanceHeader'
    );
    const { container } = render(
      <DomainProvenanceHeader provenance="demo" sourceName="fixture" />,
    );
    expect(container.querySelector('[data-provenance="live"]')).toBeNull();
    expect(
      container.querySelector('[data-provenance="demo"]'),
    ).not.toBeNull();
  });

  it('renders `unavailable` when explicitly unavailable — never falls back to `live`', async () => {
    const { DomainProvenanceHeader } = await import(
      '@/components/provenance/DomainProvenanceHeader'
    );
    const { container } = render(
      <DomainProvenanceHeader provenance="unavailable" sourceName="not-assessed" />,
    );
    expect(
      container.querySelector('[data-provenance="unavailable"]'),
    ).not.toBeNull();
    expect(container.querySelector('[data-provenance="live"]')).toBeNull();
  });
});