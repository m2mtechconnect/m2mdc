# Mapping validation

Status: SCHEMA IMPLEMENTED, EDITOR NOT IMPLEMENTED.

`connection_twin_mappings` carries source identifier, facility, target asset, OpenUSD prim path,
target property, source and target units, conversion rule, data type, direction, quality rule,
timestamp rule, validation status, sample value, last mapped value and owner. Write access is
restricted to administrators by RLS.

The Mappings tab is read-only in this phase: it lists and searches mappings and renders an empty
state. Create, edit, validate, activate, preview, export and import are not implemented.

Validation rules to enforce when the editor is built: reject incompatible source types, missing
target properties, incompatible units, mismatched facilities and missing provenance.

Current count: 0 mappings, because no operational source supplies signals.
