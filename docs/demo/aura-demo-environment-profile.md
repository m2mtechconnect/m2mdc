# AURA demo environment profile — Phase D4

## Purpose

Prepare a reproducible, reviewable demo artifact for the original AURA application without deploying it, provisioning secrets, or accessing production data.

## Build contract

The demo artifact is a normal production-mode Vite build with the following non-secret profile:

- `VITE_AURA_DEMO_INTEGRATIONS=true`
- `AURA_RELEASE_ENVIRONMENT=demo`
- `PROD_BASE_URL=https://auradc.m2mtechconnect.com`

The build must use approved non-production public client values when it is eventually promoted to a preview environment. No gateway token, connector credential, service-role key, or provider OAuth secret is stored in Git or exposed through a `VITE_` variable.

## Why production mode

Development mode enables build-time development tooling. The demo must instead use the same production-mode bundle path as AURA so the artifact can be evaluated for release fingerprinting, customer-visible branding and source-map exposure.

## Artifact acceptance gate

`AURA Demo Build Artifact` must complete on the exact PR head and produce an artifact named `aura-demo-<sha>`.

The verifier requires:

1. `/release.json` exists and reports `environment: demo`.
2. `/release.json` SHA matches the exact GitHub head SHA.
3. `VITE_AURA_DEMO_INTEGRATIONS=true` was used for the build.
4. the compiled artifact contains the AURA demo integration surface and explicit `Demo data` truth label.
5. no source maps are published.
6. customer-visible static assets do not expose implementation-platform hostnames or branding.
7. development component tagging is absent.

The verifier writes `/aura-demo-build.json` into the artifact as machine-readable evidence.

## Runtime truth rules

Building the demo artifact does not make any connector live.

- Search Analytics may display `Live · read only` only when AURA's runtime capability evidence, white-label gateway readiness, enabled connection instance and eligible connection state all pass.
- Google Drive remains demo-data only until an approved non-production account is connected and verified.
- Slack remains preview/demo-data only until an approved non-production account is connected and verified.
- no write action is enabled by this phase.
- no interactive OAuth is introduced by this phase.

## Promotion boundary

A successful artifact is **demo-build ready**, not deployed.

A later phase may publish the exact verified artifact to an approved demo/preview environment only after:

- Phase D4 CI passes on the exact SHA;
- Phase 7A gateway checks are usable/passed for any live managed-connector claim;
- the target environment is confirmed non-production;
- approved demo public environment values are supplied through environment management;
- live connector accounts, if any, are explicitly confirmed as non-production/test accounts.

Production AURA and PR #4 remain outside this demo phase.
