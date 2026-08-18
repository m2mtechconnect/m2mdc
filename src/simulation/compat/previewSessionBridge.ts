/**
 * Phase 2 - builder step-5 preview seam.
 *
 * This module no longer constructs engines. It is a thin adapter that asks the
 * SimulationOrchestrator to open a preview session and translates the result
 * into the shape the builder dashboard already consumes. All readiness,
 * seeding and provenance decisions belong to the orchestrator.
 *
 * Neither path executes NVIDIA code or an NVIDIA service.
 */

import type { SimulationPreviewConfig } from '@/components/builder/step5/fixtures/builderMock';
import { simulationOrchestrator } from '../orchestrator';
import {
  BUILDER_PREVIEW_ESTIMATOR_PROVIDER_ID,
  BUILDER_PREVIEW_FIXTURE_PROVIDER_ID,
  type BuilderPreviewSessionValue,
} from '../orchestrator/providers/builderPreviewProviders';
import type {
  SimulationExecutionClass,
  SimulationProvenance,
} from '../orchestrator/types';

export type { PreviewSpeedFactor, BuilderPreviewSessionEngine } from '../orchestrator';
import type {
  BuilderPreviewSessionEngine,
  PreviewSpeedFactor,
} from '../orchestrator/providers/builderPreviewProviders';

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
  /** Full orchestrator provenance record for this session. */
  record: SimulationProvenance;
}

export interface BuilderPreviewSessionUnavailable {
  kind: 'unavailable';
  message: string;
  provenance: 'unavailable';
  record: SimulationProvenance;
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

/**
 * Creates a builder preview session. Never throws.
 */
export function createBuilderPreviewSession(
  input: BuilderPreviewSessionInput
): BuilderPreviewSessionOutcome {
  const fixtureBacked = Boolean(input?.useFixturePreview && input?.previewConfig);

  const outcome = simulationOrchestrator.openPreviewSession<BuilderPreviewSessionValue>({
    providerId: fixtureBacked
      ? BUILDER_PREVIEW_FIXTURE_PROVIDER_ID
      : BUILDER_PREVIEW_ESTIMATOR_PROVIDER_ID,
    analysis: 'builder-preview',
    intent: 'preview',
    input: {
      scenario: input?.scenario ?? null,
      speed: input?.speed ?? 1,
      previewConfig: input?.previewConfig ?? null,
      workflows: input?.workflows ?? [],
      kpis: input?.kpis ?? [],
      template: input?.template,
    },
  });

  if (outcome.kind !== 'ok') {
    return {
      kind: 'unavailable',
      message: outcome.message,
      provenance: 'unavailable',
      record: outcome.provenance,
    };
  }

  return {
    kind: 'ok',
    engine: outcome.session.engine,
    executionClass: outcome.provenance.executionClass,
    provenance: 'simulated',
    fixtureBacked,
    baselineMetrics: outcome.session.baselineMetrics,
    record: outcome.provenance,
  };
}
