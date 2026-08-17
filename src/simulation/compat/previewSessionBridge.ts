/**
 * AURA_ARCHITECTURE_CONSOLIDATION_AND_NVIDIA_ALIGNMENT - Phase 4 (builder preview).
 *
 * Single seam for the builder step-5 preview engines.
 *
 * Builder step 5 previously picked between two engine classes inline in the
 * dashboard component. That decision is now made here so that:
 *
 *   - the caller receives a declared `executionClass` and provenance instead
 *     of inferring it from which class was constructed;
 *   - fixture-scripted previews are labelled `fixture-preview` and can never
 *     be mistaken for a run of record;
 *   - a constructor error becomes a typed unavailable session rather than a
 *     crash inside a React effect.
 *
 * Neither path executes NVIDIA code or an NVIDIA service.
 */

import {
  BuilderPreviewEngine,
  type BuilderPreviewEvent,
} from '@/components/builder/step5/BuilderPreviewEngine';
import {
  MockSimulationEngine,
  type SimulationPreviewConfig,
} from '@/components/builder/step5/fixtures/builderMock';
import type { SimulationExecutionClass } from '../providers/types';

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

export interface BuilderPreviewSession {
  kind: 'ok';
  engine: BuilderPreviewSessionEngine;
  executionClass: SimulationExecutionClass;
  /** Preview output is always simulated, never measured. */
  provenance: 'simulated';
  /** True when the run replays scripted template fixtures. */
  fixtureBacked: boolean;
  /** Baseline KPI row available before the first tick, when known. */
  baselineMetrics: unknown;
}

export interface BuilderPreviewSessionUnavailable {
  kind: 'unavailable';
  message: string;
  provenance: 'unavailable';
}

export type BuilderPreviewSessionOutcome =
  | BuilderPreviewSession
  | BuilderPreviewSessionUnavailable;

export interface BuilderPreviewSessionInput {
  scenario: unknown;
  speed: PreviewSpeedFactor;
  /** Present when the template ships a scripted preview configuration. */
  previewConfig?: SimulationPreviewConfig | null;
  useFixturePreview?: boolean;
  workflows?: unknown[];
  kpis?: unknown[];
  template?: unknown;
}

function unavailable(err: unknown): BuilderPreviewSessionUnavailable {
  const message =
    err instanceof Error && typeof err.message === 'string'
      ? err.message.slice(0, 200)
      : 'builder preview engine could not be created';
  return { kind: 'unavailable', message, provenance: 'unavailable' };
}

/**
 * Creates a builder preview session. Never throws.
 */
export function createBuilderPreviewSession(
  input: BuilderPreviewSessionInput
): BuilderPreviewSessionOutcome {
  if (!input.scenario) {
    return { kind: 'unavailable', message: 'no scenario selected', provenance: 'unavailable' };
  }

  const fixtureBacked = Boolean(input.useFixturePreview && input.previewConfig);

  try {
    if (fixtureBacked && input.previewConfig) {
      const engine = new MockSimulationEngine({
        scenario: input.scenario,
        previewConfig: input.previewConfig,
        speed: input.speed,
      });
      let baselineMetrics: unknown = null;
      try {
        baselineMetrics = engine.getBaselineMetrics();
      } catch {
        baselineMetrics = null;
      }
      return {
        kind: 'ok',
        engine: engine as unknown as BuilderPreviewSessionEngine,
        executionClass: 'fixture-preview',
        provenance: 'simulated',
        fixtureBacked: true,
        baselineMetrics,
      };
    }

    const engine = new BuilderPreviewEngine({
      scenario: input.scenario,
      workflows: (input.workflows ?? []) as unknown[],
      kpis: (input.kpis ?? []) as unknown[],
      template: input.template,
      speed: input.speed,
    } as never);

    return {
      kind: 'ok',
      engine: engine as unknown as BuilderPreviewSessionEngine,
      executionClass: 'aura-deterministic',
      provenance: 'simulated',
      fixtureBacked: false,
      baselineMetrics: null,
    };
  } catch (err) {
    return unavailable(err);
  }
}
