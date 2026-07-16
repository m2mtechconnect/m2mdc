import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';

import { KpiCardProvenance } from '@/components/provenance/KpiCardProvenance';
import { demoMetric } from '@/lib/provenance';
import { simulatedMetric } from '@/lib/provenance/kitMetrics';
import { Activity } from 'lucide-react';

/**
 * Phase 1A.2 §9 — Component tests for the IntelligenceDashboard KPI strip.
 *
 * The real page pulls from `useTwinKPIsFromSimulation` and other hooks, which
 * are heavy to mount in isolation. We assert the invariants that matter to
 * truth-in-UI on the shared wrapper (`KpiCardProvenance`) used by every tile
 * on the strip: each rendered tile must expose `data-provenance`, a
 * `<ProvenanceBadge>` accessible name, and must never fabricate a value when
 * the metric is null.
 */

describe('IntelligenceDashboard KPI strip — provenance wrapper', () => {
  it('tags simulation-sourced tiles with data-provenance="simulated"', () => {
    const metric = simulatedMetric<number>(1.28, 'twin-simulation', 'twin-simulation-kpis@1.0');
    render(
      <KpiCardProvenance
        id="pue"
        label="PUE"
        metric={metric}
        format={(v) => (v as number).toFixed(2)}
        icon={Activity}
      />
    );
    const tile = screen.getByTestId('metric-pue');
    expect(tile).toHaveAttribute('data-provenance', 'simulated');
    // The provenance badge is rendered as a sibling with a descriptive aria-label.
    expect(within(tile).getByLabelText(/Provenance: Simulation/)).toBeInTheDocument();
  });

  it('tags demo-fallback tiles with data-provenance="demo"', () => {
    const metric = demoMetric<number>(78, 'intelligence-dashboard-fixture');
    render(
      <KpiCardProvenance
        id="gpu-utilization"
        label="GPU Utilization"
        metric={metric}
        format={(v) => `${Math.round(v as number)}`}
        icon={Activity}
      />
    );
    const tile = screen.getByTestId('metric-gpu-utilization');
    expect(tile).toHaveAttribute('data-provenance', 'demo');
    expect(within(tile).getByLabelText(/Provenance: Demo data/)).toBeInTheDocument();
  });

  it('never fabricates a value when the metric is null (renders Not available)', () => {
    const metric = { value: null, provenance: 'unavailable' as const, sourceName: 'no-source' };
    render(
      <KpiCardProvenance
        id="thermal-incidents"
        label="Thermal Incidents"
        metric={metric}
        icon={Activity}
      />
    );
    const tile = screen.getByTestId('metric-thermal-incidents');
    expect(tile).toHaveAttribute('data-provenance', 'unavailable');
    expect(tile.textContent).toMatch(/Not available/i);
  });

  it('never allows a demo-fallback tile to render as live', () => {
    const metric = demoMetric<number>(99.97, 'intelligence-dashboard-fixture');
    render(
      <KpiCardProvenance
        id="uptime"
        label="Uptime"
        metric={metric}
        format={(v) => (v as number).toFixed(2)}
        icon={Activity}
      />
    );
    const tile = screen.getByTestId('metric-uptime');
    expect(tile).not.toHaveAttribute('data-provenance', 'live');
  });
});