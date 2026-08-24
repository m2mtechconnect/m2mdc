# Visual baseline verification

This branch is intentionally pinned to main at `b36349599272ed5354b2783518de6b0f69be5c40`.

Its only purpose is to execute the existing visual-regression workflow against the current main application source without changing any UI code. The documentation-only commit must not affect application rendering.

Acceptance rule:

1. Generate fresh screenshots through the committed visual workflow.
2. Compare the produced SHA-256 fingerprints and dimensions with `tests/visual/approved-linux-visuals.json`.
3. If the same broad drift seen on P1 PR #84 appears here, classify the approved visual manifest as stale rather than treating P1 product code as the cause.
4. Any baseline refresh must be reviewed separately and must not be generated or committed automatically by CI.
5. Viewport dimensions must be deterministic before a refreshed baseline is approved.
