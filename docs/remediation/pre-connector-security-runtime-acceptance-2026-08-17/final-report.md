# AURA_PRE_CONNECTOR_SECURITY_AND_RUNTIME_ACCEPTANCE — final report

## Verdict

**AURA_PRE_CONNECTOR_SECURITY_AND_RUNTIME_VERIFIED_WITH_LIMITATIONS**

This verdict applies only to the pre-connector security and runtime foundation.
It is not evidence that any external managed connector is operational.

## Why "with limitations" and not "verified"

Two acceptance items could not be closed at runtime:

1. The **published host is stale**. It predates the connections control plane,
   so `/manage/connections` and `/admin/platform-readiness` return 404 there.
   Both routes are clean on the current build with zero console errors. The
   published-runtime acceptance criterion is therefore not fully satisfied until
   the app is republished. This is publish state, not a code regression.
2. **Rate-limit window reset and independent-anonymous-user non-interference**
   could not be observed: the window is hourly and all probes share one egress
   address.

Neither limitation is caused by the absence of Google Drive, which is
intentionally out of scope and did not affect the verdict.

## What was proved

| Acceptance criterion | Result |
| --- | --- |
| Positive same-tenant access demonstrated | **PASS** — both directions, four tables |
| Negative cross-tenant access demonstrated | **PASS** |
| Unfiltered tenant queries remain isolated | **PASS** — isolation does not depend on a client filter |
| Client-supplied tenant identifiers cannot bypass authorization | **PASS** — query string ignored, insert 403 |
| Public rate limits withstand header spoofing and concurrent bursts | **PASS after fix**, with documented limitations |
| Published-runtime acceptance tests pass | **PARTIAL** — stale published bundle |
| Google Drive remains intentionally unconfigured | **PASS** — affordance removed entirely |
| No connector falsely represented as operational | **PASS** |
| Legacy parallel Google OAuth removed or provably quarantined | **PASS** — removed, not quarantined |
| No raw Google tokens exist | **PASS** — `rag_tokens` = 0 rows |
| Typecheck and production build pass | **PASS** |
| No critical/high security regression introduced | **PASS** |
| All failures, skips and blocked tests disclosed | **PASS** |

## The one real defect found, and fixed

The public intake rate limiter was **read-then-write**. Sequential traffic hit
the limit correctly, which is why it looked healthy. A concurrent burst of 12
requests against a fresh bucket was **admitted in full — 12 of 12, zero
rejections**, because every request read the same pre-increment count.

Fixed with `public.consume_public_intake_quota()`, a single atomic
`INSERT ... ON CONFLICT DO UPDATE ... RETURNING request_count`, executable only
by `service_role`. Re-tested: the same burst is now rejected 10 of 12 and the
counter accumulates every request. Header spoofing (`X-Forwarded-For`,
`X-Real-IP`) and identifier rotation created no new bucket in either version.

## Security verification

| Check | Result |
| --- | --- |
| RLS enabled on all public tables | pass |
| No new blanket `USING (true)` tenant-data policies | pass |
| Anonymous users cannot read stored query text | pass |
| Anonymous users cannot insert into protected intake tables | pass — direct grants revoked, edge function is the only path |
| Tenant identity derived server-side | pass — `current_tenant_id()` from the caller's own profile |
| User identity derived from authenticated claims | pass — `auth.getUser()`, body-supplied ids ignored |
| Cross-tenant reads and writes fail closed | pass |
| Managed connector writes require approval | pass |
| No credentials in client bundles or browser storage | pass — zero matches in the production build |
| Errors do not leak secrets | pass — error code plus correlation id only |
| Logs contain correlation ids, not credentials | pass |
| Google OAuth token storage no longer exists | pass |
| Obsolete OAuth endpoints cannot be invoked | pass — 404, function deleted |

## Test totals

1639 passed, 0 failed, 91 skipped (pre-existing backend-gated), 7 blocked or not
run. Typecheck clean. Production build clean with a passing SEO gate. No test
was deleted, skipped or weakened to obtain a green result.

## Preserved

Dataset surface registry coverage, tenant-aware RLS, anonymous query-text
protections, controlled public intake, managed connector authorization gates,
per-user connection isolation architecture, correlation ids, audit persistence,
white-label protections, existing truth tests, and existing fail-closed
connector behaviour are all intact and passing.

## Connector status, unchanged and honest

`AVAILABLE_ARCHITECTURE_NOT_CONFIGURED`

## Next action to reach a clean verdict

Republish the application, then re-run the published authenticated sweep. That
closes the single substantive limitation.
