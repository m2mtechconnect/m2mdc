# Remediation Roadmap (no changes implemented during this audit)

## Immediate containment
- F-03/F-10: provision the disposable `aura-dc-security-test` project; deny production hostnames in every test command. Blocks POC: YES. Blocks production: YES.
- F-07: label every simulated surface at runtime; no unlabelled synthetic KPI. Blocks POC: YES.

## Phase 1 - security and data integrity
- F-02: add WITH CHECK to every UPDATE/ALL policy. Verification: authenticated ownership-rewrite test. Blocks production: YES.
- F-01: introduce tenants + memberships; add tenant_id to all tenant_owned resources; rewrite RLS. Complexity: high. Blocks production: YES.
- Re-verify B-02/B-03/B-06 with authenticated runtime probes.

## Phase 2 - functional completion
- F-04 delete or gate 107 orphan functions; F-09 implement RAG with citations; connect DSX/Omniverse behind explicit feature flags.

## Phase 3 - reliability and observability
- F-08 introduce API + durable worker tier; structured logs, correlation and run IDs, health checks, alerting.

## Phase 4 - production readiness
- F-05/F-06 zero failing tests and a lint ratchet; mandatory CI gates; rollback and restore drills.

## Phase 5 - scale and optimization
- Bundle budgets, caching, cost and latency controls for AI.
