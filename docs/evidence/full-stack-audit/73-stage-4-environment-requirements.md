# Stage 4 environment requirements and reproduction plan

This is the executable plan Stage 4 will follow once the environment exists. It
is published now so the blocked stage is resumable without rediscovery. Nothing
here has been run.

## Required from the administrator

| # | Requirement | Why |
|---|---|---|
| R-01 | A host with at least one NVIDIA RTX or data-centre GPU, driver installed, `nvidia-smi` functional | G4-02 |
| R-02 | Container runtime plus NVIDIA Container Toolkit | G4-01, G4-05 |
| R-03 | An NGC account and API key with entitlement to the Omniverse DSX Blueprint on build.nvidia.com | G4-01 |
| R-04 | Written confirmation of the Blueprint licence terms permitting this evaluation | claims hygiene |
| R-05 | Official NVIDIA DSX Exchange component distribution and its AsyncAPI schema documents | G4-05, G4-06 |
| R-06 | OpenUSD toolchain with `usdchecker` (Blueprint ships one; otherwise a standalone OpenUSD build) | G4-03 |
| R-07 | A disposable, non-production backend target with `AURA_DC_TEST_ENV=aura-dc-security-test` | G4-08, reuses the Stage 2B guard |
| R-08 | Explicit statement that no production credential is provided to the runner | G4-11 |

The NGC API key must be supplied to the runner as an injected secret. It must
never be written into this evidence package; artifact 74 records only a
fingerprint of the entitlement, never the value.

## Ordered execution plan once unblocked

1. Prove the GPU: capture `nvidia-smi` and a CUDA sample run. -> G4-02
2. Pull and start the Omniverse DSX Blueprint per its published quickstart, recording image digests. -> G4-01
3. Load the Blueprint's reference data-centre stage; run `usdchecker --strict` and capture output. -> G4-03
4. Select one operational asset (rack, CDU, UPS or cooling unit). Record its prim path, geometry validity and power/thermal attributes. Report SimReady status only as "aligned" unless a published NVIDIA validator returns a pass. -> G4-04
5. Deploy the official DSX Exchange components; capture the running topology. -> G4-05
6. Publish one telemetry event validated against the official AsyncAPI document before publication; capture both the schema and the validator output. -> G4-06
7. Bind the telemetry identifier to the chosen prim path through `src/dsx/contracts/assetMapping.ts` and prove the resolved prim exists in the loaded stage. -> G4-07
8. Render the resulting value in AURA DC through the existing provenance path, with the mode badge reading SIMULATED or REPLAYED as applicable and no literal in the component. -> G4-08
9. Run one deterministic thermal or power-loading scenario twice from the same seed and diff the outputs byte-for-byte. -> G4-09
10. Tear down, redeploy from the recorded instructions on a clean host, and repeat steps 1-9. -> G4-10
11. Scan the whole evidence set for credentials before sealing. -> G4-11

## Input classification policy for the slice

Every value produced by this slice will be labelled `SIMULATED` unless it
originates from a recorded facility capture, in which case `REPLAYED`. `LIVE`
remains disabled in `src/dsx/modes.ts` and will not be enabled by Stage 4.
