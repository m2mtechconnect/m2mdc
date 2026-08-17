# Route and workflow results

## Status: NOT RUN

The prior deep audit surface is reconciled and recorded (86 route declarations
enumerated into `page-data-coverage-matrix.csv`), but the 83-route anonymous,
engineer and admin sweeps against the migrated data layer were **not executed**,
because there is no migrated data layer to sweep: Phase 7 was not performed.

None of the required chains were exercised:

- Reference Facility -> Facility Blueprint -> Simulation Studio
- NVIDIA source configuration -> AURA durable simulation run
- Run -> Compare -> Review -> Evidence -> Export
- Source Asset -> OpenUSD Asset Pipeline -> Validation & Evidence
- Reference Connector -> Integrations -> Operations & Telemetry
- Reference Agent Command -> Agents & Optimization -> execution-status truth
- Search -> reference record -> source provenance
- Admin Dataset -> Activate -> page population -> Deactivate
- Montreal scenario -> missing input -> honest unavailable state
- Sign Out -> protected reference content denied

All previously verified page-wiring, routing, claims-policy, authorization and
simulation-persistence behaviour is untouched by this change.
