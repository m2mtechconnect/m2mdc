# Centralized dataset registry

`src/data/dataset/` is the single owner of dataset selection.

| File | Responsibility |
| --- | --- |
| `datasetRegistry.ts` | Typed descriptors, URL parsing, admin gate, safe fallback, link preservation |
| `DatasetProvider.tsx` | React context; URL-owned selection, activation and one-action rollback |
| `valueClassification.ts` | The nine value classifications and the terminal NGC blocker |
| `referenceSelectors.ts` | The only read path over the 65 normalized records |
| `exportProvenance.ts` | CSV/JSON shaping with full lineage |
| `canaryEvents.ts` | Durable activation / rollback event record |

## Selection rules

- `?dataset=` is canonical. No component parses it independently.
- Unknown value -> `invalid-value-fallback` -> `legacy-synthetic`.
- `nvidia-dsx-reference` requires `platform.view_admin_console`; a non-admin
  gets `unauthorized-fallback` -> `legacy-synthetic`. The records are never
  returned to an unauthorized caller through the provider, search or export.
- `legacy-synthetic` remains `PRODUCTION_DEFAULT_DATASET`. The
  `DEFAULT_DATASET_MODE` constant in the data layer is **not** the production
  default and still has no runtime consumer.
- `linkTo()` preserves the selection across navigation, refresh and deep links.

## Classifications

`REFERENCE_VALUE`, `REFERENCE_SPECIFICATION`, `REFERENCE_CONFIGURATION`,
`REFERENCE_SCENARIO`, `DERIVED_VALUE`, `SIMULATED_RESULT`, `UNAVAILABLE`,
`NOT_SUPPLIED`, `NOT_CONNECTED`.

There is deliberately no representation for live, measured, commissioned,
operational, NVIDIA-integrated or SimReady-validated. Presence of reference
data cannot produce those states.
