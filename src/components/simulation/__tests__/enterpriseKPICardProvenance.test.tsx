/**
 * Phase 1A.3.b unit tests for EnterpriseKPICard.
 *
 * The legacy `isLive` prop rendered a green pulsing "LIVE" badge for values
 * produced by the local simulation engine — a truth-in-UI regression. This
 * suite pins the corrected behaviour:
 *   1. isLive={true} maps to provenance="simulated" (never "live")
 *   2. Explicit `provenance` prop wins over `isLive`
 *   3. The card always exposes `data-provenance` for downstream tests
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { EnterpriseKPICard } from '../EnterpriseKPICard';

// EnterpriseKPICard renders `null` unless the kpiId is present in
// DEFAULT_KPI_CONFIGS. Use `pue` which is a standard configured KPI id.
const KPI = 'pue';

describe('EnterpriseKPICard provenance', () => {
  it('renders provenance="demo" when neither isLive nor provenance is set', () => {
    const { container } = render(
      <EnterpriseKPICard kpiId={KPI} currentValue={1.24} />,
    );
    const el = container.querySelector(`[data-testid="metric-kpi-${KPI}"]`);
    expect(el).not.toBeNull();
    expect(el?.getAttribute('data-provenance')).toBe('demo');
  });

  it('maps legacy isLive={true} to provenance="simulated" (never "live")', () => {
    const { container } = render(
      <EnterpriseKPICard kpiId={KPI} currentValue={1.24} isLive={true} />,
    );
    const el = container.querySelector(`[data-testid="metric-kpi-${KPI}"]`);
    expect(el?.getAttribute('data-provenance')).toBe('simulated');
    expect(container.querySelector('[data-provenance="live"]')).toBeNull();
  });

  it('respects an explicit provenance prop', () => {
    const { container } = render(
      <EnterpriseKPICard
        kpiId={KPI}
        currentValue={1.24}
        provenance="derived"
        provenanceSource="derived-from-live-kit-payload"
      />,
    );
    const el = container.querySelector(`[data-testid="metric-kpi-${KPI}"]`);
    expect(el?.getAttribute('data-provenance')).toBe('derived');
  });
});