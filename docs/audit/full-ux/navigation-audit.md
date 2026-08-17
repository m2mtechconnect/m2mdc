# Phase 4 - navigation audit

Verified automatically: every one of the 85 navigated routes mounted a component and produced a document title; 84/85 rendered exactly one `h1`; 0 routes rendered more than one `main`.

Findings:
- Dataset context: the `?dataset=nvidia-dsx-reference` parameter is sticky across in-app navigation and can be removed manually to roll back (verified on the 17-route sample). Reference labelling was detected on only 2 of 17 sampled reference loads - the remaining 15 rendered without a visible "NVIDIA DSX Reference - Read-only" string in body text (P1, data honesty).
- Alias set (24) resolves as declared per source; runtime alias traversal was not re-executed in this pass - BLOCKED_UNVERIFIED.
- Contextual steps (Configure/Simulate/Compare/Review) are reachable only through the Simulation workspace, which is correct, but they also appear as URL steps with no breadcrumb.
- Keyboard traversal, focus return on drawer close, browser back/forward context retention, sign-out path and admin return path were not re-executed here - BLOCKED_UNVERIFIED.
