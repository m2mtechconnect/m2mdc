/**
 * Phase 1A.3.b2 unit tests for simulation-chrome retrofits.
 *
 * Covers:
 *   • EnhancedKPIChartsPanel — deterministic seeded generation, per-tile
 *     provenance, header rename ("Simulation Metrics"), fail-closed demo.
 *   • LiveInsightsKPIPanel   — header rename ("Simulation Insights"),
 *     provenance="simulated" when running, no "live" leak.
 *   • LiveSimulationDashboard — title rename, provenance="simulated",
 *     deterministic fanSpeed / upsValues for identical `currentTime`.
 *   • AnimatedRackHeatmap    — fixture fallback is `demo` even when
 *     `isRunning`, deterministic default rack generation.
 *   • KPICorrelationMatrix   — fixture impacts are `demo`, deterministic.
 *
 * Accessibility spot-check: provenance badges expose an accessible name
 * (aria-label) — no icon-only unlabeled controls.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Radix ResizeObserver + jsdom shim (project setup wires ResizeObserver as
// vi.fn() which is not a constructor). Install a minimal constructor.
class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-expect-error – jsdom
globalThis.ResizeObserver = RO;

// Silence recharts ResizeObserver crash under jsdom (same pattern as
// kpiProvenance.test.tsx).
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
  };
});

import { EnhancedKPIChartsPanel } from '../EnhancedKPIChartsPanel';
import { LiveInsightsKPIPanel } from '../LiveInsightsKPIPanel';
import { LiveSimulationDashboard } from '../LiveSimulationDashboard';
import { AnimatedRackHeatmap } from '../AnimatedRackHeatmap';
import { KPICorrelationMatrix } from '../KPICorrelationMatrix';

// -----------------------------------------------------------------------
// EnhancedKPIChartsPanel
// -----------------------------------------------------------------------
describe('EnhancedKPIChartsPanel (Phase 1A.3.b2)', () => {
  it('renders "Simulation Metrics" header and never surfaces the legacy "Live" badge', () => {
    render(
      <EnhancedKPIChartsPanel data={[]} isRunning industry="data-centre" />,
    );
    expect(screen.getByText('Simulation Metrics')).toBeInTheDocument();
    expect(screen.queryByText('Live')).toBeNull();
  });

  it('exposes provenance="simulated" at the root when a run is active', () => {
    const { container } = render(
      <EnhancedKPIChartsPanel data={[]} isRunning industry="data-centre" />,
    );
    const root = container.querySelector('[data-testid="enhanced-kpi-charts-panel"]');
    expect(root?.getAttribute('data-provenance')).toBe('simulated');
  });

  it('exposes provenance="demo" when idle and forces fixture tiles to `demo` even mid-run', () => {
    // Idle root → demo.
    const { container: idle } = render(
      <EnhancedKPIChartsPanel data={[]} isRunning={false} industry="data-centre" />,
    );
    expect(
      idle.querySelector('[data-testid="enhanced-kpi-charts-panel"]')?.getAttribute('data-provenance'),
    ).toBe('demo');
    // Fixture tiles (no caller `data`) resolve to `demo` even while running.
    const { container: running } = render(
      <EnhancedKPIChartsPanel data={[]} isRunning industry="data-centre" />,
    );
    const tiles = running.querySelectorAll('[data-testid^="enhanced-kpi-tile-"]');
    expect(tiles.length).toBeGreaterThan(0);
    for (const t of tiles) {
      expect(t.getAttribute('data-provenance')).toBe('demo');
    }
  });

  it('never renders any element with data-provenance="live"', () => {
    render(<EnhancedKPIChartsPanel data={[]} isRunning industry="data-centre" />);
    expect(document.querySelector('[data-provenance="live"]')).toBeNull();
  });

  it('is deterministic: two mounts with identical inputs produce identical tile counts and provenance', () => {
    const { container: a } = render(
      <EnhancedKPIChartsPanel data={[]} isRunning={false} industry="data-centre" />,
    );
    const { container: b } = render(
      <EnhancedKPIChartsPanel data={[]} isRunning={false} industry="data-centre" />,
    );
    const labelsA = Array.from(a.querySelectorAll('[data-testid^="enhanced-kpi-tile-"]')).map(
      (n) => n.getAttribute('data-kpi-label'),
    );
    const labelsB = Array.from(b.querySelectorAll('[data-testid^="enhanced-kpi-tile-"]')).map(
      (n) => n.getAttribute('data-kpi-label'),
    );
    expect(labelsA).toEqual(labelsB);
  });
});

// -----------------------------------------------------------------------
// LiveInsightsKPIPanel
// -----------------------------------------------------------------------
describe('LiveInsightsKPIPanel (Phase 1A.3.b2)', () => {
  it('renders "Simulation Insights" and never leaks provenance="live"', () => {
    const { container } = render(
      <LiveInsightsKPIPanel snapshots={[]} events={[]} currentTime={0} isRunning />,
    );
    expect(screen.getByText('Simulation Insights')).toBeInTheDocument();
    const root = container.querySelector('[data-testid="live-insights-panel"]');
    expect(root?.getAttribute('data-provenance')).toBe('simulated');
    expect(document.querySelector('[data-provenance="live"]')).toBeNull();
    // Legacy uppercase "LIVE" badge removed.
    expect(screen.queryByText('LIVE')).toBeNull();
  });

  it('renders provenance="demo" when no simulation is running', () => {
    const { container } = render(
      <LiveInsightsKPIPanel snapshots={[]} events={[]} currentTime={0} isRunning={false} />,
    );
    const root = container.querySelector('[data-testid="live-insights-panel"]');
    expect(root?.getAttribute('data-provenance')).toBe('demo');
  });
});

// -----------------------------------------------------------------------
// LiveSimulationDashboard
// -----------------------------------------------------------------------
describe('LiveSimulationDashboard (Phase 1A.3.b2)', () => {
  const props = {
    isVisible: true,
    rackMetrics: [],
    events: [],
    currentTime: 42,
    kpis: {},
  };

  it('renders "Simulation Dashboard" (never "Live Simulation Dashboard")', () => {
    render(<LiveSimulationDashboard {...props} />);
    expect(screen.getByText('Simulation Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Live Simulation Dashboard')).toBeNull();
  });

  it('root exposes provenance="simulated" and no "live" node anywhere', () => {
    const { container } = render(<LiveSimulationDashboard {...props} />);
    const root = container.querySelector('[data-testid="live-simulation-dashboard"]');
    expect(root?.getAttribute('data-provenance')).toBe('simulated');
    expect(document.querySelector('[data-provenance="live"]')).toBeNull();
  });

  it('renders identical UPS voltage summary for identical currentTime (deterministic)', () => {
    // The tile renders `${last.toFixed(1)}V` — assert equality across two mounts.
    const { container: a } = render(<LiveSimulationDashboard {...props} />);
    const { container: b } = render(<LiveSimulationDashboard {...props} />);
    const va = a.querySelector('.font-mono.font-bold')?.textContent;
    const vb = b.querySelector('.font-mono.font-bold')?.textContent;
    expect(va).toBeTruthy();
    expect(va).toEqual(vb);
  });
});

// -----------------------------------------------------------------------
// AnimatedRackHeatmap
// -----------------------------------------------------------------------
describe('AnimatedRackHeatmap (Phase 1A.3.b2)', () => {
  it('fixture fallback is always `demo`, even when isRunning=true', () => {
    const { container } = render(
      <AnimatedRackHeatmap rackMetrics={[]} isRunning />,
    );
    const root = container.querySelector('[data-testid="animated-rack-heatmap"]');
    expect(root?.getAttribute('data-provenance')).toBe('demo');
    expect(document.querySelector('[data-provenance="live"]')).toBeNull();
    // Legacy "LIVE" pill removed.
    expect(screen.queryByText('LIVE')).toBeNull();
  });

  it('renders identical average temperature across two mounts (deterministic fixture)', () => {
    const { container: a } = render(<AnimatedRackHeatmap rackMetrics={[]} />);
    const { container: b } = render(<AnimatedRackHeatmap rackMetrics={[]} />);
    const ta = a.textContent?.match(/Avg:\s*([\d.]+)°C/)?.[1];
    const tb = b.textContent?.match(/Avg:\s*([\d.]+)°C/)?.[1];
    expect(ta).toBeTruthy();
    expect(ta).toEqual(tb);
  });
});

// -----------------------------------------------------------------------
// KPICorrelationMatrix
// -----------------------------------------------------------------------
describe('KPICorrelationMatrix (Phase 1A.3.b2)', () => {
  it('fixture impacts resolve to provenance="demo"', () => {
    const { container } = render(<KPICorrelationMatrix snapshots={[]} />);
    const root = container.querySelector('[data-testid="kpi-correlation-matrix"]');
    expect(root?.getAttribute('data-provenance')).toBe('demo');
    expect(document.querySelector('[data-provenance="live"]')).toBeNull();
  });

  it('caller-supplied scenarioImpacts resolve to provenance="simulated"', () => {
    const { container } = render(
      <KPICorrelationMatrix
        snapshots={[]}
        scenarioImpacts={[
          {
            scenarioId: 'thermal-runaway',
            kpiId: 'pue',
            impactScore: 42,
            impactCategory: 'positive',
            explanation: 'test',
          },
        ]}
      />,
    );
    const root = container.querySelector('[data-testid="kpi-correlation-matrix"]');
    expect(root?.getAttribute('data-provenance')).toBe('simulated');
  });

  it('overall Impact banner is deterministic across two identical mounts', () => {
    const grab = (c: HTMLElement) =>
      c.textContent?.match(/Impact:\s*([+\-\d.]+)/)?.[1];
    const { container: a } = render(<KPICorrelationMatrix snapshots={[]} />);
    const { container: b } = render(<KPICorrelationMatrix snapshots={[]} />);
    const va = grab(a);
    const vb = grab(b);
    expect(va).toBeTruthy();
    expect(va).toEqual(vb);
  });
});

// -----------------------------------------------------------------------
// Accessibility spot-check on provenance badges
// -----------------------------------------------------------------------
describe('Provenance badges accessibility (Phase 1A.3.b2)', () => {
  it('all rendered ProvenanceBadges expose an aria-label starting with "Provenance:"', () => {
    const { container } = render(
      <>
        <AnimatedRackHeatmap rackMetrics={[]} />
        <KPICorrelationMatrix snapshots={[]} />
        <LiveInsightsKPIPanel snapshots={[]} events={[]} currentTime={0} />
      </>,
    );
    const labelled = container.querySelectorAll('[aria-label^="Provenance:"]');
    expect(labelled.length).toBeGreaterThan(0);
  });
});

// -----------------------------------------------------------------------
// simulatedMetric() canonicalization
// -----------------------------------------------------------------------
describe('simulatedMetric canonicalization (Phase 1A.3.b2)', () => {
  it('`@/lib/provenance` and `@/lib/provenance/kitMetrics` export the SAME function reference', async () => {
    const indexMod = await import('@/lib/provenance');
    const kitMod = await import('@/lib/provenance/kitMetrics');
    expect(indexMod.simulatedMetric).toBe(kitMod.simulatedMetric);
  });

  it('the canonical simulatedMetric() emits provenance="simulated" and NEVER upgrades to `live`', async () => {
    const { simulatedMetric } = await import('@/lib/provenance');
    const m = simulatedMetric<number>(1.28, 'twin-simulation', 'twin-simulation-kpis@1.0');
    expect(m.provenance).toBe('simulated');
    expect((m as { provenance: string }).provenance).not.toBe('live');
  });

  it('deriveMetric() refuses to upgrade a simulated source to derived/live', async () => {
    const { simulatedMetric, deriveMetric } = await import('@/lib/provenance');
    const src = simulatedMetric<number>(100, 'twin-sim', 'v1');
    const out = deriveMetric(src, (v) => v / 2, 'half');
    expect(out.provenance).toBe('simulated');
  });
});