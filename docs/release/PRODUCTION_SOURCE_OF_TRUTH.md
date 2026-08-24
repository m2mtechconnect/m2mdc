# AURA production source of truth

## Authoritative source

GitHub branch `main` is the only authoritative source for production releases.

The Lovable project currently consumes `remediation/hybrid-stack-p0`. That ref is a compatibility mirror only; it is not an independent development branch. `.github/workflows/lovable-production-mirror.yml` must keep it fast-forwarded to `main` and must fail rather than force-update if it ever diverges.

No product work should be committed directly to the compatibility mirror.

## Publish contract

A production publish is considered bound only when all of the following are true:

1. The intended Git SHA exists on `main`.
2. The compatibility mirror resolves to the same Git SHA.
3. The provider has ingested that source.
4. The live `https://auradc.m2mtechconnect.com/release.json` reports the exact expected SHA.
5. The effective release fingerprint origin remains `https://auradc.m2mtechconnect.com`.

Provider dashboard state or a successful publish request is not sufficient evidence by itself.

## Release fingerprint

Lovable production uses an internal `__orphan__` checkout marker. The application normalizes that provider detail to:

- `branch: main`
- `environment: production`

Explicit `AURA_RELEASE_BRANCH` / `AURA_RELEASE_ENVIRONMENT` values always take precedence for controlled verification builds.

## Rollback

Rollback source must be an immutable previously published Git SHA. A rollback is complete only after the live `/release.json` reports the rollback SHA and the production smoke/CORS checks pass again.

Never restore production by manually reconstructing files in the provider editor.

## Current baseline

The first exact live binding established under this contract was source SHA `8bcd10c7ad09a8511671697c0eb088a74958b519` on 2026-08-24.
