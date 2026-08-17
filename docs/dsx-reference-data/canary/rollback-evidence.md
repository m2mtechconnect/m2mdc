# Rollback evidence

Rollback is a single action and requires no deployment:

1. Press **Return to default dataset** in the canary banner, or
2. Press **Roll back to default dataset** in `/admin/dataset-registry`, or
3. Remove `?dataset=` from the URL.

All three route through `withDataset(path, null)`, which deletes the parameter,
and the provider then resolves `reason: 'default'`, `mode: 'legacy-synthetic'`,
`canaryActive: false`.

Verified by unit test:

- `withDataset('/dashboard?dataset=nvidia-dsx-reference', null)` -> `/dashboard`
- `resolveDataset(null, {isAdmin:true}).mode` -> `legacy-synthetic`
- `resolveDataset('nvidia-dsx-reference', {isAdmin:false})` -> fallback

No legacy data or mock file was deleted, so rollback restores the exact prior
experience. Activation and rollback events are appended to a local log and
mirrored best-effort to `audit_logs`.
