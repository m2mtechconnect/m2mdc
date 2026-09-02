/**
 * Facility truth context - client serializer contract.
 *
 * The block must mirror the canonical truth modules exactly and never
 * fabricate a run, timestamp or capability.
 */
import { describe, it, expect } from 'vitest';
import {
  FACILITY_TRUTH_SCHEMA,
  buildFacilityTruthContext,
  viewportEvidenceForPage,
} from '../truthContext';
import { CAPABILITIES } from '@/capabilities/registry';

describe('buildFacilityTruthContext', () => {
  it('serializes the dashboard truth surfaces', () => {
    const truth = buildFacilityTruthContext('dashboard');
    expect(truth.schema).toBe(FACILITY_TRUTH_SCHEMA);
    expect(truth.mode).toBe('SIMULATED');
    expect(truth.inputClassification).toBe('Synthetic inputs');
    expect(truth.source).toBe('AURA deterministic simulation');
    expect(truth.viewport).toEqual({
      id: 'command-centre-plan-card',
      renderer: 'svg-2d',
      disclosure: 'Procedural 2D floor plan of the modelled design',
      limitation: 'Not a validated OpenUSD stage',
    });
    expect(Number.isNaN(Date.parse(truth.capturedAt))).toBe(false);
  });

  it('reports no run when none has been recorded', () => {
    const truth = buildFacilityTruthContext('dashboard');
    expect(truth.run).toBeNull();
  });

  it('mirrors the capability registry without upgrades', () => {
    const truth = buildFacilityTruthContext('dashboard');
    expect(truth.capabilities).toHaveLength(Object.keys(CAPABILITIES).length);
    const live = truth.capabilities.find((c) => c.key === 'liveTelemetry');
    expect(live?.enabled).toBe(false);
    const openUsd = truth.capabilities.find((c) => c.key === 'openUsdStage');
    expect(openUsd?.enabled).toBe(false);
  });

  it('reports the fail-closed readiness verdict', () => {
    expect(buildFacilityTruthContext('dashboard').readiness.productionVerdict).toBe('NO-GO');
  });
});

describe('viewportEvidenceForPage', () => {
  it('returns null for pages without a registered facility surface', () => {
    expect(viewportEvidenceForPage('metrics')).toBeNull();
    expect(viewportEvidenceForPage(undefined)).toBeNull();
  });

  it('maps blueprint and simulation to the workspace model viewport', () => {
    expect(viewportEvidenceForPage('blueprint')?.id).toBe('workspace-model-viewport');
    expect(viewportEvidenceForPage('simulation')?.id).toBe('workspace-model-viewport');
  });
});
