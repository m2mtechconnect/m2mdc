import { describe, expect, it } from 'vitest';
import {
  classifyCreateTwinFields,
  describeProvenance,
  isAuthoritativeFact,
  satisfiesReadinessGate,
} from '../twinFieldProvenance';

describe('twin field provenance', () => {
  const map = classifyCreateTwinFields({ name: 'DC A', city: 'Toronto', capacity_kw: 5000 });

  it('labels context-applied defaults as assumptions or neutral defaults', () => {
    expect(map.pue_target.classification).toBe('modeled-assumption');
    expect(map.renewable_target_pct.classification).toBe('modeled-assumption');
    expect(map.sovereignty_level.classification).toBe('neutral-default');
    expect(map.industry.classification).toBe('unavailable');
  });

  it('marks omitted values as neutral defaults, not facts', () => {
    expect(map.region_code.classification).toBe('neutral-default');
    expect(map.tier.classification).toBe('neutral-default');
  });

  it('keeps supplied blueprint values distinct from defaults', () => {
    expect(map.city.classification).toBe('user-supplied');
    expect(map.name.classification).toBe('user-supplied');
  });

  it('never lets a default satisfy an evidence or readiness gate', () => {
    for (const p of Object.values(map)) {
      expect(satisfiesReadinessGate(p)).toBe(false);
      expect(isAuthoritativeFact(p)).toBe(false);
    }
  });

  it('never describes a default as validated', () => {
    expect(describeProvenance(map.pue_target)).toBe(
      'Modeled assumption · Source: Default simulation configuration · Evidence: None',
    );
    expect(describeProvenance(map.pue_target)).not.toContain('Validated');
  });
});
