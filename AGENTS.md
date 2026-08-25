# AURA Repository Governance

## Scope

These instructions apply to all work in this repository unless a more specific `AGENTS.md` exists in a subdirectory.

## Release-line rules

- Never commit directly to `main` for remediation, feature, security, release, or visual work.
- Create work from the exact reviewed `main` SHA and record that SHA in the pull request.
- Do not merge or deploy as part of a coding task unless the task explicitly authorizes that release action.
- Keep coding, qualification, merge, and production publishing as separate steps.
- Lovable is a preview and publishing surface during governed remediation. Do not use Lovable to introduce overlapping source changes while a Git remediation branch is active.
- Never force-push `main`.

## Security invariants

- Preserve fail-closed authorization behavior.
- Do not create service-role clients before caller identity, approval state, scope, and authorization have been validated.
- Approved-account gates must require `is_approved = true` where the existing security contract requires approval.
- Tenant authorization must come from authoritative organization membership and active-organization resolution. Do not infer tenant authority from platform authority.
- Platform authority and tenant authority are separate planes. A tenant admin is not automatically a platform admin.
- Preserve RLS. Do not weaken, bypass, disable, or replace RLS for convenience.
- Preserve JWT verification for protected server functions.
- Preserve strict CORS allowlists. Include `x-organization-id` in preflight handling where the endpoint contract requires it. Do not introduce wildcard CORS on authenticated or tenant-scoped endpoints.
- Never trust client-supplied organization IDs, roles, approval state, scope, or permission labels as authorization evidence.
- Do not expose credentials, service-role keys, invite tokens, secrets, private account identifiers, or production customer data.

## Truth and provenance

- Do not fabricate operational values, health states, timestamps, availability, connectivity, KPI results, simulation results, or deployment state.
- Missing, failed, ambiguous, stale, or unavailable evidence must remain explicitly unavailable or unknown.
- Demonstration fixtures must be labelled as demonstration data and must never be presented or exported as live telemetry.
- Simulation output must not be represented as measured production telemetry.
- Preview routes must not imply that a production runtime exists unless runtime evidence proves it.
- Preserve provenance metadata and source timestamps when data is exported, summarized, or transformed.
- Do not claim NVIDIA, Omniverse, DSX, accelerated-computing, or other vendor runtime integration unless the repository contains evidence supporting the exact claim.
- Prefer provider-neutral naming when a capability is conceptual, planned, compatibility-only, or not configured.

## Editing discipline

- Make atomic changes. Each commit should have one clear purpose.
- Avoid opportunistic refactors while fixing P1 defects.
- Do not replace working architecture solely for visual consistency.
- Preserve unrelated changes.
- Prefer the smallest safe fix that closes the proven defect.
- Add or update focused tests for every behavioral, authorization, provenance, routing, or release-integrity change.
- Do not silence a failing test by deleting it, weakening its assertion, broadening an allowlist, or adding an unexplained skip.
- Any skipped test must have an explicit, reviewable reason.

## Required qualification

Run focused tests after each atomic change. Before a remediation batch is considered complete, run the repository's applicable qualification gates, including:

- `verify:fast`
- typecheck
- lint
- production build
- SEO checks
- authentication and authorization tests
- tenant-isolation tests
- truth and provenance tests
- provider-neutral or neutral-stack checks
- route tests
- release-fingerprint tests

A batch is not qualified when a required test is failing, cancelled, missing, or newly skipped without an approved reason.

## P1 remediation order

Unless the active task states otherwise, complete the current P1 queue in this order:

1. Batch A: `/analytics`, `/account/settings`, `/settings/ai`
2. Batch B: `/blueprint/preview`, `/simulation/preview`, `/studio/systems/:id/manage`
3. Batch C: `/teams`, Admin DSX or accelerated-AI naming, `/infrastructure`

Run the full applicable qualification gate after each batch before moving to the next.

## Pull-request archaeology

- Treat stale PRs as a feature library, not as automatic merge candidates.
- Do not directly merge PRs #65 through #74 solely because they contain desired work.
- Classify old PRs as superseded, partially reusable, authoritative after rebase, or obsolete/contradictory.
- Prefer reconstructing or cherry-picking the smallest still-relevant change onto the current remediation branch.
- Close or supersede stale PRs only when current `main` clearly contains newer equivalent behavior or when the old branch contradicts the current security and release model.

## Release candidate rules

- A release candidate must be tied to one exact Git SHA.
- Do not substitute test results from an older SHA for the candidate SHA.
- Merge only after the exact candidate has passed all required checks.
- Publish once through the approved production publishing path.
- After publishing, verify `/release.json` or the repository's canonical release fingerprint against the merged Git SHA.
- Smoke-test the high-value authenticated routes after publication.
- If production exposes a defect, fix it in Git, qualify a new exact SHA, and republish. Do not patch production through an untracked Lovable coding pass.

## Visual debt

Correctness, security, provenance, and release integrity take precedence over visual-system migration. Finish P1 before broad legacy-page visual refactoring.
