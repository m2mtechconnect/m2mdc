/**
 * Phase 2 - builder step-5 preview session providers.
 *
 * Builder previews are tick-driven: they emit events over time instead of
 * returning a single value, so they implement `PreviewSessionProvider`. They
 * are still orchestrated - the orchestrator owns readiness, seeding and the
 * provenance record, and the engine receives its generator from the context.
 *
 * Two distinct providers, because they are two distinct execution classes:
 *   - `builder-preview-fixture`  -> `fixture-preview` (scripted template data)
 *   - `builder-preview-estimator`-> `aura-stochastic-seeded` (synthetic ticks)
 *
 * Neither executes NVIDIA code, and neither may be used for an authoritative
 * run.
 */

import {
  BuilderPreviewEngine,
  type BuilderPreviewEvent,
} from '@/components/builder/step5/BuilderPreviewEngine';
import {
  MockSimulationEngine,
  type SimulationPreviewConfig,
} from '@/components/builder/step5/fixtures/builderMock';
import type {
  PreviewSessionProvider,
  ProviderReadiness,
  SimulationExecutionContext,
  SimulationProviderDescriptor,
} from '../types';

export const BUILDER_PREVIEW_FIXTURE_PROVIDER_ID = 'builder-preview-fixture' as const;
export const BUILDER_PREVIEW_ESTIMATOR_PROVIDER_ID = 'builder-preview-estimator' as const;

export type PreviewSpeedFactor = 1 | 2 | 4;

/** The behaviour the builder dashboard actually depends on. */
export interface BuilderPreviewSessionEngine {
  on(event: 'event', callback: (event: BuilderPreviewEvent) => void): void;
  on(event: 'kpi-update', callback: (data: unknown) => void): void;
  on(event: 'complete' | 'error', callback: () => void): void;
  start(): void;
  pause(): void;
  stop(): void;
  reset(): void;
  setSpeed(speed: PreviewSpeedFactor): void;
}

export interface BuilderPreviewSessionValue {
  engine: BuilderPreviewSessionEngine;
  /** Baseline KPI row available before the first tick, when known. */
  baselineMetrics: unknown;
}

export interface BuilderPreviewProviderInput {
  scenario: unknown;
  speed: PreviewSpeedFactor;
  previewConfig?: SimulationPreviewConfig | null;
  workflows?: unknown[];
  kpis?: unknown[];
  template?: unknown;
}

const ANALYSES = ['builder-preview'] as const;

function baseDescriptor(
  overrides: Pick<
    SimulationProviderDescriptor,
    'id' | 'executionClass' | 'engineModule' | 'determinism'
  >,
): SimulationProviderDescriptor {
  return {
    version: '2.0.0',
    supportedAnalyses: ANALYSES,
    supportsPreview: true,
    supportsAuthoritative: false,
    requiresSeed: false,
    requiresExternalRuntime: false,
    runtimeEnvironment: 'browser',
    defaultTimeoutMs: 0,
    supportsCancellation: true,
    verificationLevel: 'unverified',
    ...overrides,
  };
}

export function createBuilderFixturePreviewProvider(): PreviewSessionProvider<BuilderPreviewSessionValue> {
  return {
    descriptor: baseDescriptor({
      id: BUILDER_PREVIEW_FIXTURE_PROVIDER_ID,
      executionClass: 'fixture-preview',
      engineModule: 'src/components/builder/step5/fixtures/builderMock.ts',
      // Playback is scripted, but the emission schedule is drawn from a
      // generator, so the session must be seeded to be reproducible.
      determinism: 'seeded-stochastic',
    }),
    readiness(): ProviderReadiness {
      return { ready: true, reason: null };
    },
    openSession(ctx: SimulationExecutionContext): BuilderPreviewSessionValue {
      const input = ctx.request.input as BuilderPreviewProviderInput;
      if (!input?.scenario) throw new Error('no scenario selected');
      if (!input.previewConfig) {
        throw new Error('this template ships no scripted preview configuration');
      }
      const engine = new MockSimulationEngine({
        scenario: input.scenario,
        previewConfig: input.previewConfig,
        speed: input.speed,
        random: ctx.random,
        runTag: ctx.runId,
      });
      let baselineMetrics: unknown = null;
      try {
        baselineMetrics = engine.getBaselineMetrics();
      } catch {
        baselineMetrics = null;
      }
      return { engine: engine as unknown as BuilderPreviewSessionEngine, baselineMetrics };
    },
  };
}

export function createBuilderEstimatorPreviewProvider(): PreviewSessionProvider<BuilderPreviewSessionValue> {
  return {
    descriptor: baseDescriptor({
      id: BUILDER_PREVIEW_ESTIMATOR_PROVIDER_ID,
      executionClass: 'aura-stochastic-seeded',
      engineModule: 'src/components/builder/step5/BuilderPreviewEngine.ts',
      determinism: 'seeded-stochastic',
    }),
    readiness(): ProviderReadiness {
      return { ready: true, reason: null };
    },
    openSession(ctx: SimulationExecutionContext): BuilderPreviewSessionValue {
      const input = ctx.request.input as BuilderPreviewProviderInput;
      if (!input?.scenario) throw new Error('no scenario selected');
      const engine = new BuilderPreviewEngine({
        scenario: input.scenario,
        workflows: (input.workflows ?? []) as unknown[],
        kpis: (input.kpis ?? []) as unknown[],
        template: input.template,
        speed: input.speed,
        // Orchestrator-owned randomness and identifiers.
        random: ctx.random,
        runTag: ctx.runId,
      } as never);
      return { engine: engine as unknown as BuilderPreviewSessionEngine, baselineMetrics: null };
    },
  };
}