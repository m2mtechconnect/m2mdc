import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricValue } from '../MetricValue';
import {
  liveMetric,
  demoMetric,
  staticMetric,
  unavailableMetric,
} from '@/lib/provenance';
import { simulatedMetric, notAssessedMetric } from '@/lib/provenance/kitMetrics';

describe('MetricValue', () => {
  it('renders a live value with a Live badge and data-provenance="live"', () => {
    render(
      <MetricValue
        id="pue"
        label="PUE"
        metric={liveMetric(1.24, 'omniverse-kit', new Date().toISOString())}
        format={(v) => (typeof v === 'number' ? v.toFixed(2) : String(v))}
      />,
    );
    const card = screen.getByTestId('metric-pue');
    expect(card.getAttribute('data-provenance')).toBe('live');
    expect(screen.getByTestId('metric-pue-value').textContent).toContain('1.24');
    expect(screen.getByLabelText(/Provenance: Live/)).toBeInTheDocument();
  });

  it('renders a demo value with a Demo data badge and NEVER "Live"', () => {
    render(
      <MetricValue
        id="gpu"
        label="GPU utilization"
        metric={demoMetric(61, 'demo-fixture')}
        unit="%"
      />,
    );
    expect(screen.getByTestId('metric-gpu').getAttribute('data-provenance')).toBe('demo');
    expect(screen.getByLabelText(/Provenance: Demo data/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Provenance: Live/)).toBeNull();
  });

  it('renders a static target with the Configured target chip', () => {
    render(
      <MetricValue
        id="pue-target"
        label="Target PUE"
        metric={staticMetric(1.3, 'user-config')}
        format={(v) => (typeof v === 'number' ? v.toFixed(2) : String(v))}
      />,
    );
    const card = screen.getByTestId('metric-pue-target');
    expect(card.getAttribute('data-provenance')).toBe('static');
    expect(screen.getByText(/Configured target/i)).toBeInTheDocument();
  });

  it('renders unavailable metric as "Not available", never a number', () => {
    render(
      <MetricValue
        id="carbon"
        label="Carbon intensity"
        metric={unavailableMetric<number>('grid-feed')}
        unit="gCO₂/kWh"
      />,
    );
    expect(screen.getByTestId('metric-carbon').getAttribute('data-provenance')).toBe('unavailable');
    expect(screen.getByTestId('metric-carbon-value').textContent).toContain('Not available');
  });

  it('renders a not-assessed sovereignty metric as "Not assessed"', () => {
    render(
      <MetricValue
        id="sovereignty"
        label="Sovereignty assessment"
        metric={notAssessedMetric<number>('sovereignty-engine')}
      />,
    );
    expect(screen.getByTestId('metric-sovereignty').getAttribute('data-provenance')).toBe('unavailable');
    expect(screen.getByTestId('metric-sovereignty-value').textContent).toContain('Not assessed');
  });

  it('renders a simulated metric with the Simulation badge', () => {
    render(
      <MetricValue
        id="cooling-delta"
        label="Cooling-failure impact"
        metric={simulatedMetric(4.2, 'aura-estimator', 'v0-demo', 'linear scenario delta')}
        unit="°C"
      />,
    );
    expect(screen.getByTestId('metric-cooling-delta').getAttribute('data-provenance')).toBe('simulated');
    expect(screen.getByLabelText(/Provenance: Simulation/)).toBeInTheDocument();
  });

  it('exposes stale timestamp when isStale is true', () => {
    const at = new Date(Date.now() - 60_000).toISOString();
    render(
      <MetricValue
        id="gpu-stale"
        label="GPU utilization"
        metric={{ ...liveMetric(60, 'gpu-agent', at), isStale: true }}
        unit="%"
      />,
    );
    expect(screen.getByTestId('metric-gpu-stale').getAttribute('data-stale')).toBe('true');
    expect(screen.getByTestId('metric-gpu-stale-stale').textContent).toMatch(/Stale/);
  });
});