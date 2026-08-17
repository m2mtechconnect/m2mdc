# Worker acceptance mode (durable write-path acceptance)

Status: implemented, executable wherever a service-role token is injected.
Evidence class: `ACCEPTANCE_EVIDENCE` (never `PRODUCTION_TELEMETRY`).

## What it is

`services/mqtt-ingest-worker` can now run in acceptance mode:

```
npm run acceptance          # or: tsx src/index.ts --acceptance [--keep-evidence]
```

It connects to no broker and fabricates no telemetry. It exercises exactly the
durable Supabase write paths the ingestion runtime depends on, reads each write
back, and deletes the probe rows again unless `--keep-evidence` is passed.

Steps, in order:

| Step | Table | Operation |
| --- | --- | --- |
| resolve connection | `connection_instances` | select |
| register worker row | `connection_runtime_workers` | insert + read-back |
| open ingest run | `connection_ingest_runs` | insert |
| write message evidence | `connection_ingest_messages` | insert |
| close ingest run | `connection_ingest_runs` | update + read-back |
| write twin property | `twin_property_values` | insert |
| write audit event | `connection_audit_events` | insert + read-back |
| clean up probe rows | all of the above | delete |

The probe writes are unmistakable: `worker_id = <worker>-acceptance`,
`target_entity = AURA-ACCEPTANCE-PROBE`, `outcome = REJECTED` with reason
`ACCEPTANCE_PROBE`, and `evidence_class = ACCEPTANCE_EVIDENCE`. Nothing in the
probe can be mistaken for operational telemetry.

Exit code is 0 only when every step passes; the JSON report on stdout lists each
step with status, detail and duration.

## Injected service-role token (no developer-owned key)

The token is never authored by a developer and never committed. It is resolved
at boot by `src/serviceRoleToken.ts` from platform secret injection, first hit
wins:

1. `SUPABASE_SERVICE_ROLE_KEY` - plain env injection
2. `SUPABASE_SERVICE_ROLE_KEY_FILE` - mounted secret file (ECS/K8s/Brev)
3. `AURA_INJECTED_SECRETS_JSON` - Secrets Manager JSON blob in env
4. `AURA_INJECTED_SECRETS_FILE` - Secrets Manager JSON blob on disk

If none resolve, the worker refuses to start and names every injection source it
looked at. The token value is never logged: evidence records only the source
label and a non-reversible `sha256:<16 hex>` fingerprint, which is also stamped
into the `runtime.worker.acceptance` audit event so a run can be tied to the
exact injected credential.

Unit coverage: `tests/unit/serviceRoleTokenInjection.test.ts` (6 cases, passing).

## Current environment

This sandbox still has no injected service-role token, so acceptance mode has
not been executed here - it exits with the injection blocker described above.
It is designed to be run inside the Brev/AWS canary task, where the token is
injected by the platform, and its JSON report is the persistence evidence for
`persistence-results.md`.
