# Phase 12 - Evidence / decision identity consolidation

## Finding
The Evidence workspace produced recommendations deterministically and required a
human decision with a rationale, but the decision log lived only in React state
(`useEvidenceBeta`). A reload erased the entire audit trail, so the platform
could not evidence *who decided what, on what basis*. No decision table existed.

Adjacent tables checked: `recommendations` and `ai_recommendations_cache` are the
URL-scanner surface (edge-function owned, 0 rows) and are unrelated to operational
evidence decisions; `managed_connector_write_approvals` is connector governance.
None of them are a decision log, so nothing was merged into them.

## Canonical model
`public.decision_records` is the one authoritative decision log.

- Append-only: only `SELECT` and `INSERT` are granted to `authenticated`; no
  update or delete grant exists, so a recorded decision cannot be rewritten.
- Ownership comes from the session (`user_id = auth.uid()` in both policies and
  the insert payload), never from caller-supplied data.
- Each row stores the frozen `evidence_snapshot` plus its `snapshot_hash`, the
  `timeline_id`, `data_mode` and `observation_tick`, so a later reader can
  reconstruct exactly what was on screen at decision time.
- A rationale of at least 10 trimmed characters is enforced in the database, not
  only in the UI.
- `(user_id, recommendation_id, snapshot_hash)` is unique: a replayed submission
  resolves to the original row instead of duplicating the audit trail.

## Changes
- Migration: created `public.decision_records` with grants, RLS, indexes and a
  deprecation-proof comment.
- Added `src/dsx/runtime/decisionPersistence.ts` (`persistDecision`,
  `loadDecisions`, `rowToDecision`).
- `useEvidenceBeta` now restores the durable log on mount and appends every new
  decision, exposing `decisionPersistence: 'durable' | 'in-memory'`.
- `DecisionLog` in `src/components/dsx/ScenarioPanel.tsx` states the truth: it
  says decisions are recorded durably only when they are, and warns that a
  signed-out session keeps them in memory only.

## Truth boundaries kept
- Signed-out / demo use still works; it is labelled in-memory rather than
  silently claiming a durable record.
- A failed write downgrades the reported durability instead of being swallowed.
- Recommendations remain advisory: nothing in this phase dispatches control.

## Tests
`src/dsx/__tests__/decisionPersistence.test.ts` covers the no-session path (no
write at all), session ownership and snapshot-hash fidelity of the payload,
unique-violation replay resolving to `duplicate`, and row-to-contract
restoration. Existing `decisionWorkflow.test.ts` still passes unchanged.
