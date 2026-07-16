import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MetricValue } from '../MetricValue';
import {
  liveMetric,
  demoMetric,
  staticMetric,
  unavailableMetric,
} from '@/lib/provenance';
import { simulatedMetric, notAssessedMetric } from '@/lib/provenance/kitMetrics';

function q<T extends Element = HTMLElement>(root: HTMLElement, sel: string): T | null {
  return root.querySelector<T>(sel);
}
function required<T extends Element>(el: T | null, hint: string): T {
  if (!el) throw new Error(`Expected element for ${hint}`);
  return el;
}

describe('MetricValue', () => {
  it('renders a live value with a Live badge and data-provenance="live"', () => {
    const { container } = render(
      <MetricValue
        id="pue"
        label="PUE"
        metric={liveMetric(1.24, 'omniverse-kit', new Date().toISOString())}
        format={(v) => (typeof v === 'number' ? v.toFixed(2) : String(v))}
      />,
    );
    const card = required(q<HTMLElement>(container, '[data-testid="metric-pue"]'), 'card');
    expect(card.getAttribute('data-provenance')).toBe('live');
    expect(q<HTMLElement>(container, '[data-testid="metric-pue-value"]')?.textContent).toContain('1.24');
    expect(q<HTMLElement>(container, '[aria-label*="Provenance: Live"]')).not.toBeNull();
  });

  it('renders a demo value with a Demo data badge and NEVER "Live"', () => {
    const { container } = render(
      <MetricValue
        id="gpu"
        label="GPU utilization"
        metric={demoMetric(61, 'demo-fixture')}
        unit="%"
      />,
    );
    expect(q<HTMLElement>(container, '[data-testid="metric-gpu"]')?.getAttribute('data-provenance')).toBe('demo');
    expect(q<HTMLElement>(container, '[aria-label*="Provenance: Demo data"]')).not.toBeNull();
    expect(q<HTMLElement>(container, '[aria-label*="Provenance: Live"]')).toBeNull();
  });

  it('renders a static target with the Configured target chip', () => {
    const { container } = render(
      <MetricValue
        id="pue-target"
        label="Target PUE"
        metric={staticMetric(1.3, 'user-config')}
        format={(v) => (typeof v === 'number' ? v.toFixed(2) : String(v))}
      />,
    );
    const card = required(q<HTMLElement>(container, '[data-testid="metric-pue-target"]'), 'card');
    expect(card.getAttribute('data-provenance')).toBe('static');
    expect(container.textContent).toMatch(/Configured target/i);
  });

  it('renders unavailable metric as "Not available", never a number', () => {
    const { container } = render(
      <MetricValue
        id="carbon"
        label="Carbon intensity"
        metric={unavailableMetric<number>('grid-feed')}
        unit="gCO₂/kWh"
      />,
    );
    expect(q<HTMLElement>(container, '[data-testid="metric-carbon"]')?.getAttribute('data-provenance')).toBe('unavailable');
    expect(q<HTMLElement>(container, '[data-testid="metric-carbon-value"]')?.textContent).toContain('Not available');
  });

  it('renders a not-assessed sovereignty metric as "Not assessed"', () => {
    const { container } = render(
      <MetricValue
        id="sovereignty"
        label="Sovereignty assessment"
        metric={notAssessedMetric<number>('sovereignty-engine')}
      />,
    );
    expect(q<HTMLElement>(container, '[data-testid="metric-sovereignty"]')?.getAttribute('data-provenance')).toBe('unavailable');
    expect(q<HTMLElement>(container, '[data-testid="metric-sovereignty-value"]')?.textContent).toContain('Not assessed');
  });

  it('renders a simulated metric with the Simulation badge', () => {
    const { container } = render(
      <MetricValue
        id="cooling-delta"
        label="Cooling-failure impact"
        metric={simulatedMetric(4.2, 'aura-estimator', 'v0-demo', 'linear scenario delta')}
        unit="°C"
      />,
    );
    expect(q<HTMLElement>(container, '[data-testid="metric-cooling-delta"]')?.getAttribute('data-provenance')).toBe('simulated');
    expect(q<HTMLElement>(container, '[aria-label*="Provenance: Simulation"]')).not.toBeNull();
  });

  it('exposes stale timestamp when isStale is true', () => {
    const at = new Date(Date.now() - 60_000).toISOString();
    const { container } = render(
      <MetricValue
        id="gpu-stale"
        label="GPU utilization"
        metric={{ ...liveMetric(60, 'gpu-agent', at), isStale: true }}
        unit="%"
      />,
    );
    expect(q<HTMLElement>(container, '[data-testid="metric-gpu-stale"]')?.getAttribute('data-stale')).toBe('true');
    expect(q<HTMLElement>(container, '[data-testid="metric-gpu-stale-stale"]')?.textContent).toMatch(/Stale/);
  });
});