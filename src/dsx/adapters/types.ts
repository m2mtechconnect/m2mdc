/**
 * Single operational-source interface. UI components consume ONLY this
 * interface — no mock-data conditionals are permitted in components.
 */
import type { DataMode } from '../modes';
import type { DsxEventEnvelope, DsxConnectionState } from '../contract';
import type { AssetMapping } from '../contracts/assetMapping';
import type { FixtureAsset } from '../fixtures/evidenceBetaFacility';

export interface IngestRejection {
  reason:
    | 'schema_invalid'
    | 'unsupported_version'
    | 'not_an_object'
    | 'missing_schema_version'
    | 'unit_invalid'
    | 'duplicate'
    | 'stale'
    | 'unknown_mapping'
    | 'mapping_not_approved'
    | 'missing_value';
  source_asset_id: string;
  event_id: string | null;
  observed_at: string | null;
  detail: string;
  payload_hash: string;
}

export interface AcceptedEvent {
  envelope: DsxEventEnvelope;
  mapping: AssetMapping;
  metric_name: string;
  payload_hash: string;
}

export interface SourceSnapshot {
  data_mode: DataMode;
  connection_state: DsxConnectionState;
  /** ISO timestamp of the newest accepted observation, or null. */
  last_observed_at: string | null;
  /** Simulation/replay run identity — required for non-live modes. */
  run_id: string | null;
  tick: number;
  accepted: AcceptedEvent[];
  rejected: IngestRejection[];
  assets: FixtureAsset[];
  mappings: AssetMapping[];
}

export interface OperationalSource {
  readonly id: string;
  readonly mode: DataMode;
  /** Human description shown in the connection panel. */
  readonly description: string;
  /** Produce the snapshot for a given tick. Pure and deterministic. */
  snapshotAt(tick: number, nowMs: number): SourceSnapshot;
  readonly maxTick: number;
}