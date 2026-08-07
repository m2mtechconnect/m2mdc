# AURA DC — Operations Runbook

Status: PLANNED. AURA DC currently runs as a static frontend plus Supabase; there is
no Kubernetes deployment, no NATS, no Temporal, no TimescaleDB and no NIM inference.

## Local development (works today)
```
npm install
npm run dev          # http://localhost:8080
npm run test         # Vitest unit + integration
npm run test:e2e     # Playwright
npm run lint
npm run typecheck
```

## Planned service topology
Web portal, control-plane API, DSX session service, telemetry ingestor, agent
service, simulation worker, document-ingestion worker, PostgreSQL, TimescaleDB,
NATS JetStream, Redis, object storage, observability stack.

## Planned procedures
Deployment and rollback (Argo CD), incident response, backup and restore drills,
key and credential rotation, capacity management, DSX session recovery,
telemetry backpressure handling, database failover.

Each procedure is written only after the corresponding service exists and its
acceptance gate passes. No runbook step is documented against a service that
cannot be executed.
