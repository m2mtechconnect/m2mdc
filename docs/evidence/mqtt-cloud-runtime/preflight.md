# Preflight - AURA_MQTT_CLOUD_RUNTIME_ACCEPTANCE

Date: 2026-08-17 (UTC). Source revision: 9d420a6d2449015f61186ce9f72ddeb3f8a40887.

## Code and pipeline
- Worker present: services/mqtt-ingest-worker (index.ts, env.ts, worker.ts, evidence.ts, vault.ts), Node 22 + mqtt.js, Dockerfile at services/mqtt-ingest-worker/Dockerfile.
- Shared pipeline present: src/runtime/mqtt/{policy,provenance,units,pipeline}.ts.
- Unit suite: `bunx vitest run src/runtime/mqtt/__tests__/pipeline.test.ts` - 15 passed, 0 failed.
- Credential vault integration present: AES-GCM decrypt in vault.ts keyed by CONNECTION_CREDENTIAL_KEY; no plaintext returned to any client path.
- Supabase write paths present in evidence.ts (connection_ingest_runs, connection_ingest_messages, connection_runtime_workers, connection_audit_events, twin_property_values).

## Database state (live project, read via psql)
All required tables exist. Row counts at preflight:

| table | rows |
| --- | --- |
| connection_instances | 5 |
| connection_data_contracts | 1 |
| connection_twin_mappings | 0 |
| connection_ingest_runs | 0 |
| connection_ingest_messages | 0 |
| connection_runtime_workers | 0 |
| connection_credentials | 0 |

No active signal-to-twin mapping and no vaulted credential exist, so no canary connection is configured end to end even before cloud access is considered.

## Deployment assets
- infra/brev/aura-usd-pipeline.launchable.json exists but targets the USD pipeline, not the MQTT worker. No Brev launchable for services/mqtt-ingest-worker.
- infra/aws/publication-architecture.md is a design document. No ECS task definition, IoT Core policy, Secrets Manager or KMS definition exists for the worker.

## Credentials, tooling and authorization
- `aws` CLI available. `aws sts get-caller-identity` fails: InvalidClientTokenId (the injected AWS key pair is not a valid account credential). No AWS_REGION configured.
- `brev` CLI not installed; no Brev API token available in the environment.
- `docker` not installed in this environment, so no container image can be built, digested or pushed here.
- No SUPABASE_SERVICE_ROLE_KEY, so the worker's service-role write path cannot be exercised from here either.
- No spending authorization, budget ceiling or account owner approval has been supplied for either cloud lane.

## Blocker (exact)
1. AWS: `An error occurred (InvalidClientTokenId) when calling the GetCallerIdentity operation: The security token included in the request is invalid.` No usable AWS account, no region, no spend approval.
2. Brev: no CLI and no API token; no Brev organisation/instance authorization.
3. No container runtime available to build or publish the worker image.
4. No workspace approval recorded for cloud spend.

Per the phase rules, no infrastructure was provisioned and no credentials were requested in chat.
