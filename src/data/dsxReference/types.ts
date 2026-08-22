/**
 * Canonical types for the NVIDIA DSX reference-data baseline.
 *
 * Truth rules encoded here (see docs/dsx-reference-data/cutover/):
 *  - NVIDIA sample data is reference data, never measured data.
 *  - NVIDIA hardcoded KPI values are never live telemetry.
 *  - Reference and derived-scenario facilities never contribute to
 *    operational totals.
 *  - A missing input is reported, never fabricated.
 *  - Conflicting NVIDIA demo-source records are preserved as conflicts; AURA
 *    never silently chooses one value and calls it authoritative.
 */

/** Classification of an individual normalized reference record. */
export type ReferenceDataClass =
  | 'REFERENCE_SPECIFICATION'
  | 'REFERENCE_CONFIGURATION'
  | 'REFERENCE_FORMULA'
  | 'REFERENCE_KPI_VALUE'
  | 'REFERENCE_KPI_METADATA'
  | 'REFERENCE_OPTION'
  | 'REFERENCE_GPU_SPECIFICATION'
  | 'REFERENCE_BUILDING_SPECIFICATION'
  | 'REFERENCE_SITE_SPECIFICATION_VARIANT'
  | 'REFERENCE_SIMULATION_VARIABLE'
  | 'REFERENCE_SCENARIO'
  | 'SAMPLE_SIMULATION_OUTPUT'
  | 'SAMPLE_CFD_OUTPUT'
  | 'SAMPLE_ELECTRICAL_OUTPUT'
  | 'ASSET_METADATA'
  | 'REFERENCE_AGENT_COMMAND'
  | 'REFERENCE_CONNECTOR'
  | 'DEPLOYMENT_REFERENCE'
  | 'DOCUMENTATION_ONLY';

/** How a facility relates to physical reality. */
export type FacilityClass = 'REFERENCE' | 'DERIVED_SCENARIO' | 'OPERATIONAL';

/** What a value is actually entitled to claim. */
export type TruthState =
  | 'REFERENCE_ONLY'
  | 'SIMULATED_NOT_MEASURED'
  | 'NOT_CONNECTED'
  | 'NOT_OPERATIONAL'
  | 'AWAITING_VALIDATION'
  | 'UNAVAILABLE';

/** Outcome of the licence gate for a source. */
export type LicenceStatus =
  | 'APPROVED_PUBLIC_REFERENCE'
  | 'APPROVED_AUTHENTICATED_DEMO'
  | 'APPROVED_INTERNAL_EVALUATION'
  | 'REQUIRES_LEGAL_REVIEW'
  | 'REDISTRIBUTION_PROHIBITED'
  | 'BLOCKED';

/** Relationship between equivalent-looking values in NVIDIA's demo source. */
export type SourceConsistency =
  | 'UNIQUE'
  | 'DUPLICATE'
  | 'SCOPED_VARIANT'
  | 'SOURCE_CONFLICT';

/**
 * One normalized value sourced from an official NVIDIA artefact. Every field
 * is mandatory provenance: a record that cannot answer "where did this come
 * from" must not exist.
 */
export interface ReferenceRecord {
  record_id: string;
  dataset_id: string;
  dataset_version: string;
  publisher: string;
  source_url: string;
  source_repository: string;
  source_commit: string;
  source_file: string;
  source_record_path: string;
  source_checksum: string;
  retrieved_at: string;
  licence_status: LicenceStatus;
  data_class: ReferenceDataClass;
  operational_status: TruthState;
  configuration_id: string | null;
  site: string | null;
  compute_platform: string | null;
  power_generation: string | null;
  metric_key: string | null;
  metric_label: string;
  formula: string | null;
  original_value: number | string | null;
  normalized_value: number | string | null;
  unit: string | null;
  transformation_record: string;
  validation_status: string;
  is_reference: boolean;
  is_measured: boolean;
  is_simulated: boolean;
  is_operational: boolean;
  /** Which source block produced this normalized record. */
  source_variant?: string | null;
  /** Whether an equivalent source value is unique, duplicate, scoped, or conflicting. */
  source_consistency?: SourceConsistency;
  /** Stable key joining records that describe the same semantic fact. */
  source_conflict_group?: string | null;
  /** Narrow scope note used to prevent false conflict merges (for example GPU-preset vs site+GPU). */
  source_scope?: string | null;
}

/** A facility in the portfolio, with its honest classification. */
export interface ClassifiedFacility {
  id: string;
  name: string;
  facilityClass: FacilityClass;
  truthState: TruthState;
  /** Who authored the facility model. */
  authoredBy: 'NVIDIA' | 'AURA';
  datasetId: string | null;
  datasetVersion: string | null;
  configurationId: string | null;
  site: string | null;
  sourceUrl: string | null;
  licenceStatus: LicenceStatus | null;
  /** Disclosures that MUST be rendered wherever the facility is shown. */
  disclosures: readonly string[];
  /** Inputs with no defensible source. Rendered as "Not supplied". */
  missingInputs: readonly string[];
  /** True only for facilities allowed to roll up into operational totals. */
  countsTowardOperationalTotals: boolean;
}

/** Explicit dataset modes for the canary cutover. */
export type DatasetMode = 'legacy-synthetic' | 'nvidia-dsx-reference' | 'montreal-derived';
