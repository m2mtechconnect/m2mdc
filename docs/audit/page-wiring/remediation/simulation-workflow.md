# Simulation workflow revalidation - final build

Evidence: `evidence/final-published-build/simulation-workflow.json`, screens `sim-*.png`.

- `/simulation?step=simulate` deep link holds on first mount.
- Run executed: **SIM-2026-08-17-001**.
- After hard refresh the same single run id is present. No duplicate run created.
- Compare (`?step=compare`) and Review/Decide (`?step=decide`) both bind to SIM-2026-08-17-001 and expose the export control.
- CSV export: `aura-run-sim-2026-08-17-001.csv`, 4410 bytes, header carries `simulation_run_id=SIM-2026-08-17-001`, `operating_mode=SIMULATED`, `live_facility_data_used=No`.
- JSON export: `aura-run-sim-2026-08-17-001.json`, 8072 bytes, 18 records (9 KPIs x baseline/result) with per-metric provenance and the same run id in `operatingState`.
- Browser back/forward preserve workflow state (`compare` then `decide`).
- Zero console errors during the workflow; only third-party analytics beacons failed.
