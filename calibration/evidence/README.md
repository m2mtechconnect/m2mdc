# AURA Simulation Calibration Evidence

This directory is intentionally empty of calibration packages until real evidence exists.

The NVIDIA DSX asset audit was already completed and remediated in PR #16. Files added here are **post-remediation simulation evidence**, not a substitute for the DSX asset/source gates.

## Rules

- Calibration evidence packages are JSON files validated by `scripts/verify-simulation-calibration-evidence.ts`.
- Zero JSON packages is a valid state and means **no benchmarked/calibrated promotion is claimed**.
- Do not commit generated numbers merely to satisfy the validator.
- Reference data must have known use rights and an immutable SHA-256 digest.
- Every claimed observable requires a quantitative acceptance criterion and a documented rationale.
- `calibrated` requires distinct calibration and holdout/validation datasets.
- `externally-validated` additionally requires independent validation data and an independent review artifact.
- `nvidia-dsx-reference` scope additionally requires complete exact-role coverage for the declared DSX gate plus immutable hashes for the USD stage, asset manifest, semantic bindings, and source map.
- A DSX/OpenUSD scene being structurally correct does not itself prove calibrated thermal, hydraulic, electrical, network, or workload behavior.
- NVIDIA solver/runtime claims require an actual `nvidia-solver` execution path with `nvidiaIntegrated=true` and immutable runtime evidence.

## Evidence lifecycle

1. Acquire traceable measured/reference data with documented rights.
2. Freeze the model version, inputs, configuration, toolchain, and runtime/hardware profile.
3. Define acceptance criteria **before** evaluating the holdout set.
4. Run calibration using only the calibration split.
5. Evaluate the frozen model against distinct validation data.
6. Record immutable inputs/outputs/reports and their SHA-256 digests.
7. For DSX-reference scope, bind the evidence to the exact USD/asset/binding/source-map state.
8. For external validation, attach the independent validation dataset and signed/reviewed report artifact.
9. Commit the JSON evidence package only when the evidence actually exists.
10. Let CI determine the maximum eligible calibration state; never hand-edit UI copy to promote a claim.
