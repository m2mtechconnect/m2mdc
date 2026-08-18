# Phase 9 - Deployment record consolidation and removal of timer-driven UI

## Finding

`src/pages/Deploy.tsx` advanced a five-stage progress list on `setTimeout`
timers totalling ~7 s. The stages a user watched complete were scripted: only
one of them (agent activation) corresponded to a real operation. The durable
trace was a single terminal row written after the animation, duplicated across
two tables (`deployments`, `deployment_tracking`).

`SovereignDCDeploymentSteps.tsx` was worse: seven scripted phases plus three
scripted "smoke tests" ending in green ticks that claimed telemetry streaming,
KPI calculation and simulation-engine verification had passed. Nothing was
verified.

Measured row counts before the change: `deployments` 0, `deployment_tracking` 0,
`cloud_deployments` 0.

## Canonical model

| Concern | Table |
|---|---|
| Current deployment state | `public.deployments` |
| Immutable step log | `public.deployment_events` (new) |
| Deprecated | `public.deployment_tracking` (grants revoked, 0 rows) |
| Out of scope, retained | `public.cloud_deployments` (AOC runtime feature) |

`deployment_events` carries `deployment_id`, `system_id`, `sequence`, `stage`,
`status` (`started` / `succeeded` / `failed` / `skipped`), `detail`, `actor_id`
and `occurred_at`, unique on `(deployment_id, sequence)`. Only `SELECT` and
`INSERT` are granted to `authenticated`; there is no `UPDATE` or `DELETE` grant,
so a recorded step cannot be rewritten. RLS scopes both reads and appends to
deployments the caller performed.

All access goes through `src/workspace/deploymentRecords.ts`:
`openDeployment` -> `appendDeploymentEvent` -> `closeDeployment`, plus
`listDeploymentEvents` for the read path.

## UI changes

- `Deploy.tsx`: the deployment opens a `pending` row first, then runs five real
  operations (validation summary, workflow packaging, system activation,
  integration resolution, economics persistence). Each stage's UI status is set
  from the outcome of that operation and appended to the event log. Failures
  mark the failing stage, append a `deployment-failed` event and close the
  record as `failed`. No `setTimeout` remains in the file.
- `SovereignDCDeploymentSteps.tsx`: scripted phases and the fabricated smoke
  tests are removed. The step now states plainly that post-deploy verification
  is not implemented and reports only "Deployment recorded".
- `DeploymentHistory.tsx`: each row can expand to show the immutable step log
  for that deployment.

## Verification

- `bunx tsgo --noEmit`: no diagnostics.
- `bunx vitest run`: 1806 passed / 91 skipped, plus 5 new cases in
  `src/workspace/__tests__/deploymentRecords.test.ts` asserting no timer-driven
  stages, canonical-model usage, no `deployment_tracking` writers, and no update
  or delete path against `deployment_events`.
