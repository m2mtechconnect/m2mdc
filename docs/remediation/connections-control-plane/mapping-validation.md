# Mapping validation

Status: SCHEMA IMPLEMENTED, EDITOR IMPLEMENTED (export/import not implemented).

`connection_twin_mappings` carries source identifier, facility, target asset, OpenUSD prim path,
target property, source and target units, conversion rule, data type, direction, quality rule,
timestamp rule, validation status, sample value, last mapped value and owner. Write access is
restricted to administrators by RLS.

The Mappings tab supports list, search, create, edit, validate, activate, deactivate and delete.
All writes are gated by the `connection_twin_mappings_admin_write` RLS policy (admin or owner) and
the UI disables the controls for other roles. Export and import are not implemented.

Enforced validation rules (`src/connections/mappingValidation.ts`, 7 unit tests):
- connection, source identifier, target facility, target asset or absolute prim path, target
  property, data type, direction and an authoritative timestamp rule are all required;
- numeric mappings require both units; units are resolved against declared families
  (temperature, power, energy, pressure, flow, ratio, dimensionless);
- cross-family units are rejected unless an explicit conversion rule is supplied, and the result
  is then flagged as unverified;
- relative prim paths are rejected;
- a missing quality rule is a warning, not an error;
- activation is blocked unless validation returns zero errors; the stored `validation_status`
  reflects the computed result (VALID, INVALID, INCOMPLETE).

Current count: 0 mappings, because no operational source supplies signals.
