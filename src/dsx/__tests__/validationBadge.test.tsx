import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ValidationBadge } from '@/components/dsx/StateBadges';

describe('ValidationBadge honesty', () => {
  it('never says Validated when uncalibrated', () => {
    render(<ValidationBadge validation="validated" calibration="uncalibrated" />);
    const b = screen.getByTestId('dsx-validation');
    expect(b.textContent).toBe('Range-checked · unverified');
    expect(b.textContent).not.toMatch(/^Validated/);
    expect(b.getAttribute('data-verified')).toBe('false');
  });

  it('flags declared unattested inputs as unverified', () => {
    render(<ValidationBadge validation="validated" calibration="field_calibrated" unattestedInputs={['site_rated_kw']} />);
    expect(screen.getByTestId('dsx-validation').textContent).toBe('Range-checked · unverified');
  });

  it('reports range-checked when calibrated with attested inputs', () => {
    render(<ValidationBadge validation="validated" calibration="field_calibrated" />);
    const b = screen.getByTestId('dsx-validation');
    expect(b.textContent).toBe('Range-checked');
    expect(b.getAttribute('data-verified')).toBe('true');
  });
});
