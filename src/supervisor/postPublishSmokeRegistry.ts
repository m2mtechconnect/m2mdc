/**
 * Post-publish smoke evidence registry (generated).
 *
 * Regenerated ONLY by `scripts/post-publish-smoke.mjs` from the read-only
 * evidence artifacts it writes under `docs/evidence/post-publish-smoke/`.
 * Do not hand-edit: every entry is re-validated at runtime by
 * `validateSmokeReport`, and an entry that is malformed, unsigned by a real
 * artifact reference or missing checks is rejected and has no effect on the
 * readiness surface.
 *
 * Empty means no post-publish smoke run has been recorded. That is a truthful
 * state and must never be filled with placeholder or assumed results.
 */
export const POST_PUBLISH_SMOKE_REGISTRY: readonly unknown[] = [
  {
    "suite": "aura.post-publish-smoke.v1",
    "target": "https://auradc.m2mtechconnect.com",
    "observedSha": "bcf0aaeb57130707b4eb1b5c268d376084c55f6a",
    "expectedSha": "e22ccbfd04cbc0c57df6749c6f37dab9aca41a82",
    "completedAt": "2026-09-05T19:22:19.941Z",
    "trigger": "automatic-on-publish",
    "artifactRef": "docs/evidence/post-publish-smoke/smoke-2026-09-05T19-22-19-940Z.json",
    "plane": "public+authenticated",
    "session": "<session-installed>",
    "verdict": "FAIL",
    "checks": [
      {
        "id": "release-fingerprint",
        "plane": "public",
        "status": "FAIL",
        "detail": "sha mismatch: expected e22ccbfd04cbc0c57df6749c6f37dab9aca41a82, got bcf0aaeb57130707b4eb1b5c268d376084c55f6a"
      },
      {
        "id": "public-shell:/",
        "plane": "public",
        "status": "PASS",
        "detail": "AURA SPA shell served"
      },
      {
        "id": "public-shell:/login",
        "plane": "public",
        "status": "PASS",
        "detail": "AURA SPA shell served"
      },
      {
        "id": "auth-gate:unauthenticated-dashboard",
        "plane": "public",
        "status": "PASS",
        "detail": "unauthenticated /dashboard resolved to /login"
      },
      {
        "id": "authed-route:/dashboard",
        "plane": "authenticated",
        "status": "BLOCKED_BY_AUTH",
        "detail": "no resolvable smoke session (fail closed)"
      },
      {
        "id": "authed-route:/analytics",
        "plane": "authenticated",
        "status": "BLOCKED_BY_AUTH",
        "detail": "no resolvable smoke session (fail closed)"
      },
      {
        "id": "authed-route:/evidence/overview",
        "plane": "authenticated",
        "status": "BLOCKED_BY_AUTH",
        "detail": "no resolvable smoke session (fail closed)"
      },
      {
        "id": "truth-labels:analytics",
        "plane": "authenticated",
        "status": "BLOCKED_BY_AUTH",
        "detail": "no resolvable smoke session (fail closed)"
      },
      {
        "id": "truth-labels:evidence",
        "plane": "authenticated",
        "status": "BLOCKED_BY_AUTH",
        "detail": "no resolvable smoke session (fail closed)"
      },
      {
        "id": "journey:builder-saved-draft",
        "plane": "authenticated",
        "status": "BLOCKED_BY_AUTH",
        "detail": "no resolvable smoke session (fail closed)"
      },
      {
        "id": "journey:builder-to-operations",
        "plane": "authenticated",
        "status": "BLOCKED_BY_AUTH",
        "detail": "no resolvable smoke session (fail closed)"
      }
    ]
  }
];
