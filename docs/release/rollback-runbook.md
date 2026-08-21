# AURA DC Release Rollback Runbook

## Purpose

This runbook defines the minimum controlled rollback procedure for an AURA DC release. It does not authorize production deployment or rollback by itself. Human release approval is required before any production action.

## Rollback principles

1. Roll back application code only to a previously approved immutable Git SHA.
2. Never rewrite or delete historical database migrations.
3. If a database change is incompatible with rollback, use a new forward-fix migration instead of reverting migration history.
4. Production rollback must preserve tenant isolation, RLS, authentication, CORS, audit logging and truth-in-UI guarantees.
5. The live target must prove the rolled-back SHA through `/release.json` before rollback can be considered complete.

## Evidence required before production release

Record the following in the Release Supervisor ledger before deployment:

- release SHA being deployed
- previous approved production SHA
- provider deployment/publish reference for both versions when available
- production URL
- exact `CORS_ALLOWED_ORIGINS`
- migration set included in the release
- database compatibility assessment
- rollback owner and approver

If the previous approved production SHA is unknown, `ROLLBACK_REQUIRED` remains unresolved and production approval must not proceed.

## Rollback triggers

Initiate rollback consideration when any of the following occurs after production deployment:

- authentication or tenant-isolation regression
- RLS or authorization failure
- CORS perimeter regression
- critical route or workspace unavailable
- evidence/audit integrity failure
- release fingerprint mismatch
- severe performance regression beyond approved thresholds
- security vulnerability introduced by the release
- migration or schema incompatibility that prevents safe operation

Minor UI issues that do not affect safety, security, data integrity or core operation should normally use a forward fix rather than an emergency rollback.

## Procedure

### 1. Freeze changes

- Stop further release changes.
- Record the current live `/release.json` payload.
- Record the current provider deployment reference and timestamp.
- Preserve relevant logs, screenshots and CI/deployment evidence.

### 2. Confirm rollback target

The rollback target must be a previously approved production SHA.

Verify:

```text
rollback_target_sha == previous_approved_production_sha
```

Do not use a branch name such as `main` as the rollback identity. Use the exact 40-character Git SHA.

### 3. Check database compatibility

Before republishing the previous application SHA:

- list migrations introduced by the current release;
- determine whether the previous application version can safely operate against the current schema;
- do not reverse historical migrations;
- if compatibility is not proven, stop application rollback and prepare a new forward migration or forward application fix.

A rollback that would create a schema/application mismatch is blocked.

### 4. Republish the approved rollback SHA

Use the external hosting/publishing mechanism to publish the exact approved rollback SHA.

Record:

- rollback SHA
- provider deployment/publish reference
- operator/approver
- start and completion timestamps

### 5. Verify live SHA binding

Run `Release Target Verification` for `production` using:

- `expected_sha`: rollback target SHA
- `target_url`: `https://auradc.m2mtechconnect.com`
- `deployment_reference`: provider rollback deployment reference

The rollback is not verified unless the production target serves:

```text
/release.json.sha == rollback_target_sha
```

Any missing, unknown or mismatched fingerprint is `DEPLOYMENT_BLOCKED`.

### 6. Run production smoke validation

Verify at minimum:

- authenticated login
- organization/tenant isolation
- Auth/RLS/CORS perimeter
- Command Center
- Blueprint
- Simulation
- Evidence
- Connections
- People & Access
- Platform Readiness
- audit/evidence chain
- published SEO validation

Do not access or mutate production customer data solely for testing. Use approved smoke identities and non-destructive checks.

### 7. Close or escalate

Rollback is complete only when:

- production `/release.json` matches the rollback SHA;
- required production smoke checks pass;
- security/tenant controls pass;
- the Release Supervisor ledger contains the rollback evidence;
- a human release owner records completion.

If rollback cannot safely restore service, declare `ROLLBACK_REQUIRED` unresolved and execute the incident/forward-fix path.

## Abort criteria

Stop rollback and escalate if:

- the previous application cannot safely run against the current database schema;
- the target SHA is not a previously approved production SHA;
- the provider cannot prove which release was published;
- production fingerprint does not match the requested SHA;
- authentication, RLS, tenant isolation or CORS remains broken after rollback;
- rollback would require destructive database history changes.

## Post-incident requirements

After any production rollback:

1. preserve CI, deployment and runtime evidence;
2. document root cause and timeline;
3. identify why pre-production gates did not catch the issue;
4. add or strengthen automated coverage where appropriate;
5. requalify the next release from a new frozen SHA;
6. obtain fresh human approval before redeployment.
