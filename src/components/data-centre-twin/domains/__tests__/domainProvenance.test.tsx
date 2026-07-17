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

const cases: Array<[string, React.FC<{ facility: typeof facility }>, string]> = [
  ['thermal-domain-view',     ThermalDomainView,     'demo'],
  ['power-domain-view',       PowerDomainView,       'demo'],
  ['cooling-domain-view',     CoolingDomainView,     'demo'],
  ['network-domain-view',     NetworkDomainView,     'demo'],
  ['facility-domain-view',    FacilityDomainView,    'demo'],
  ['workload-domain-view',    WorkloadDomainView,    'demo'],
  ['sovereignty-domain-view', SovereigntyDomainView, 'unavailable'],
  ['carbon-domain-view',      CarbonDomainView,      'demo'],
  ['financial-domain-view',   FinancialDomainView,   'demo'],
];

describe('Domain views — Phase 1A.3.c provenance retrofit', () => {
  for (const [testId, Comp, expected] of cases) {
    it(`${testId} root exposes data-provenance="${expected}" and no "live" descendants`, () => {
      const { container } = render(
        <MemoryRouter>
          <Comp facility={facility} />
        </MemoryRouter>,
      );
      const root = container.querySelector(`[data-testid="${testId}"]`);
      expect(root).not.toBeNull();
      expect(root?.getAttribute('data-provenance')).toBe(expected);
      // No element in the entire subtree may claim live provenance.
      expect(root?.querySelector('[data-provenance="live"]')).toBeNull();
      // Header primitive is present exactly once.
      const headers = container.querySelectorAll('[data-testid="domain-provenance-header"]');
      expect(headers.length).toBe(1);
      // Screen-reader accessible description is present.
      const sr = container.querySelector('[aria-live="polite"]');
      expect(sr?.textContent ?? '').toMatch(/measurement|reference|unavailable|Live/i);
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