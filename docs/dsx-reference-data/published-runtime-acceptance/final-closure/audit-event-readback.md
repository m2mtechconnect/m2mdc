# Audit-event read-back

Status: **BLOCKED_UNVERIFIED**. Activation and rollback events are written by
`src/data/dataset/canaryEvents.ts` (local record plus best-effort `audit_logs`
mirror), but no administrator read-back, duplicate-event check or
engineer/anonymous write-attempt test was executed against the new bundle.
