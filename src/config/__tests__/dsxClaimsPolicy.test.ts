import { describe, expect, it } from 'vitest';
import {
  APPROVED_CLAIMS,
  allowedClaimsFor,
  enforceClaims,
  findClaimViolations,
  isClaimAllowed,
  simReadyClaimants,
} from '../dsxClaimsPolicy';
import { getCapability } from '../dsxCapabilityRegistry';

describe('DSX claims policy', () => {
  it('blocks a full-DSX-implementation claim', () => {
    expect(isClaimAllowed('A full NVIDIA DSX implementation')).toBe(false);
  });

  it('blocks Omniverse and RTX streaming claims about the browser runtime', () => {
    expect(isClaimAllowed('Omniverse-rendered scene')).toBe(false);
    expect(isClaimAllowed('RTX streaming session')).toBe(false);
    expect(enforceClaims('Omniverse-rendered scene')).toBe('AURA Web Runtime scene');
  });

  it('gates SimReady on a SIMREADY_VALIDATED capability', () => {
    const pipeline = getCapability('openusd-asset-pipeline')!;
    expect(isClaimAllowed('SimReady rack', pipeline)).toBe(false);
    expect(simReadyClaimants()).toEqual([]);
  });

  it('gates NIM claims on runtime evidence', () => {
    const agents = getCapability('agents-optimization')!;
    expect(isClaimAllowed('NIM-powered agent', agents)).toBe(false);
  });

  it('blocks DSX Exchange and Max-Q and Flex claims', () => {
    expect(isClaimAllowed('DSX Exchange connected')).toBe(false);
    expect(isClaimAllowed('Max-Q optimized cooling')).toBe(false);
    expect(isClaimAllowed('DSX Flex enabled')).toBe(false);
  });

  it('blocks calling simulated data live telemetry', () => {
    const violations = findClaimViolations('Live telemetry from the hall');
    expect(violations[0].replacement).toBe('Simulated result');
  });

  it('accepts every approved phrase', () => {
    for (const claim of APPROVED_CLAIMS) {
      if (claim === 'AURA Web Runtime' || claim === 'Simulated result') {
        expect(isClaimAllowed(claim)).toBe(true);
        continue;
      }
      expect(isClaimAllowed(claim), claim).toBe(true);
    }
  });

  it('derives allowed claims from capability evidence', () => {
    const pipeline = getCapability('openusd-asset-pipeline')!;
    expect(allowedClaimsFor(pipeline)).toContain('NVIDIA OpenUSD-derived geometry');
    expect(allowedClaimsFor(pipeline)).toContain('OpenUSD canonical asset');
    expect(allowedClaimsFor(pipeline)).not.toContain('SimReady validated');
  });

  it('keeps Search out of the DSX vocabulary', () => {
    const search = getCapability('search')!;
    expect(search.dsxArea).toBe('Not a DSX component');
    expect(allowedClaimsFor(search)).not.toContain('DSX-aligned');
  });
});