# Normalization schema

Emitted by `scripts/dsx-reference/ingest.mjs` into
`src/data/dsxReference/records.generated.ts`. Types live in
`src/data/dsxReference/types.ts`.

Every record carries: `record_id`, `dataset_id`, `dataset_version`, `publisher`,
`source_url`, `source_repository`, `source_commit`, `source_file`,
`source_record_path`, `source_checksum`, `retrieved_at`, `licence_status`,
`data_class`, `operational_status`, `original_value`, `normalized_value`,
`unit`, `transformation_record`, `validation_status`, `is_reference`,
`is_measured`, `is_simulated`, `is_operational`.

Transformation policy for this dataset version: **verbatim**. NVIDIA supplies
PUE as a ratio, WUE in m3/MWh, CUE in Kg/kWh, token efficiency in kWh/token,
energy in MWh and cost in USD. No unit conversion or rescaling is applied, so
`original_value === normalized_value` for every record and
`transformation_record` records that fact. Any future conversion must be added
to `transformation_record` and covered by a test.

Record counts by data class (65 total):

| Data class | Count |
| --- | --- |
| `REFERENCE_KPI_VALUE` | 36 |
| `REFERENCE_SPECIFICATION` | 21 |
| `REFERENCE_CONFIGURATION` | 6 |
| `REFERENCE_SCENARIO` | 2 |

`SAMPLE_SIMULATION_OUTPUT`, `SAMPLE_CFD_OUTPUT`, `SAMPLE_ELECTRICAL_OUTPUT` and
`ASSET_METADATA` are defined but hold **zero** records: they depend on the NGC
dataset, which is blocked.
