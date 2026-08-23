# AURA DC production readiness gates

This document codifies the production-release controls for AURA DC. It does not authorize deployment and does not replace GitHub native branch/ruleset or environment protection.

## Native repository controls

Before a production release can be approved:

- `main` must be protected by a GitHub branch protection rule or ruleset.
- Pull requests must be required for changes to `main`.
- Force-push and branch deletion must be blocked.
- Required status checks must be enforced; `QA Summary` is the stable aggregate QA context.
- Repository visibility must be private, or public visibility must be an explicit recorded decision and repository variable `AURA_PUBLIC_REPOSITORY_INTENTIONAL=true` must be set.
- The GitHub `production` environment must require reviewer approval and restrict deployments by branch policy.

## Technical release gates

The final production SHA must retain passing evidence for:

- Unit, Chromium, Firefox and WebKit E2E coverage.
- Accessibility and security scans.
- Lighthouse and integration tests without lowering thresholds.
- Production perimeter / exact-origin CORS policy.
- Ephemeral Supabase replay and migration immutability.
- Truth-in-UI / route stress evidence.
- DSX scoped checks and DSX audit-chain integrity.
- Visual regression plus separate human visual approval.
- Exact build/release fingerprint binding.

## Human approvals

Production authorization requires recorded approval from the designated release owner plus independent security and release/DBA reviewers. Approval must cover:

- Auth/RLS/CORS evidence.
- Migration immutability and database compatibility.
- Visual/product review.
- Rollback runbook and rollback SHA.
- Intentional repository visibility decision.

## Current rollback baseline

The previously verified production baseline for the current closeout is:

`0e2972a24b5f4b1226ba66b2ce03103453d583eb`

That SHA is a rollback reference only. Any prior risk acceptance tied to it does not authorize a later production candidate.

## Production cutover

Only after all gates above are green and the final `main` SHA is frozen:

1. Obtain explicit human production approval.
2. Publish the exact approved `main` SHA using the approved hosting path.
3. Run `Release Target Verification` with the exact SHA, production environment, approved custom-domain origin and provider deployment reference.
4. Verify live `/release.json` exact-SHA binding.
5. Complete route, SEO, security and runtime smoke validation without modifying production data.
6. Record the evidence in GitHub issue #5.

A merge or successful CI run is not itself a production deployment authorization.
