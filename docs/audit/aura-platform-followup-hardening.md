# AURA Platform Follow-up Hardening

Audit date: 2026-08-22

Base: `ux/aura-builder-connections-remediation` @ `74aa8f4b3185b2ae676148c0815ee8a55fdedcb3`

Scope: safe follow-on UX, truth and accessibility hardening for the original AURA application while PR #12 and PR #13 remain frozen for qualification.

## Guardrails

- original AURA only
- no remix/project deletion
- no production publish or production-data access
- no database migration
- no auth/RBAC/RLS/CORS weakening
- no secrets/DNS changes
- no visual baseline acceptance
- no PR #4, PR #12 or PR #13 branch movement

## Phase P0 — inherited test-harness repair

Fixed the deterministic `customerSurfaceWhiteLabel.test.ts` Node 24 failure by converting `URL` objects to file paths with `fileURLToPath()` before `readFileSync()`.

This changes the test harness only; it does not relax the forbidden-term assertions.

## Phase P1 — Command Center / Blueprint / Simulation

### Command Center truth

- Removed the synthetic current-time fallback used when no durable simulation run exists.
- The header now says `No recorded simulation result` instead of presenting modelled baseline values as freshly calculated.
- Downstream quick-view/canvas labels use `No run recorded` when no run exists.
- Renamed the facility action from `Open Integrations` to `Open Connections` to match the canonical control-plane terminology.

### Blueprint

Source review found the current Blueprint flow already preserves facility identity/provenance, does not restore the old Montreal/QC/Tier defaults, and separates Blueprint-owned configuration from Manage/Connections. No additional code change was justified in this phase.

### Simulation

- Initialize the overlay-inspector breakpoint from the real `matchMedia` value to avoid a narrow-screen first-render mismatch.
- Establish the default inspector state only once. Later viewport breakpoint changes no longer override an operator's explicit open/closed choice.

## Phase P2 — Evidence / Platform Readiness / Analytics

Source review confirmed these surfaces already preserve the key truth distinctions:

- evidence workspaces retain explicit operational truth/context bars;
- Platform Readiness explicitly states capability support is not a configured customer connection;
- Analytics reports telemetry-service unavailability separately from demo/simulated chart fixtures and keeps chart export provenance classified per metric.

No broad refactor was performed because the audited implementation is already aligned with the truth model.

## Phase P3 — Teams / Admin / Help

### Teams

Removed customer-looking fixture truth defects:

- member status now derives from stored `profiles.is_approved` evidence (`approved` / `pending`) instead of assigning every profile `active`;
- `lastActive` remains explicitly `Not tracked`;
- department is explicitly `Not tracked` rather than derived from role;
- pending invitations no longer inflate the total-member count;
- `Active now` and `Departments` summary cells show `Not tracked` instead of false numeric precision;
- removed the hard-coded named `Recent Simulation Runs` card (`Sarah Chen`, `Michael Wong`, `Alex Johnson`, `run-001` etc.);
- `View all` activity now routes to the canonical evidence decision log rather than the broad `/compliance` alias;
- replaced legacy gradient/glow header styling with the standard AURA enterprise hierarchy;
- member status filtering now uses `Approved` / `Pending` instead of ungrounded `Active` / `Inactive`.

### People/Admin shells

Reviewed permission-aware local navigation and responsive behavior. No deterministic defect requiring a source change was found.

### Help

Removed `status="operational"` decoration from learning, navigation, guided-tour and build-information cards. Operational status semantics remain reserved for actual runtime evidence.

## Phase P4 — accessibility / reduced motion

Added `src/styles/aura-accessibility.css` and loaded it from `src/main.tsx`.

For users requesting reduced motion, the authenticated `.aura-v2` shell now:

- disables smooth scrolling;
- reduces transition duration/delay;
- reduces animation duration and iteration count.

Anchored content also receives sticky-header scroll margin.

## Phase P5 — regression protection

Added `platformFollowupTruth.test.ts` to prevent regressions in:

- Teams fixture data and false presence/department claims;
- Command Center synthetic calculation timestamps;
- Help misuse of operational status styling;
- Simulation inspector breakpoint behavior;
- shared reduced-motion stylesheet loading.

The existing Builder/Connections white-label regression remains intact and is also part of the follow-on CI gate.

## Phase P6 — qualification

Added `AURA Platform Follow-up UX Audit` for pull requests into the frozen PR #13 branch. It requires:

- exact-head checkout
- frozen dependency install
- TypeScript typecheck
- follow-up truth tests
- Builder/Connections UX invariants
- customer-surface white-label regression
- AURA runtime catalog tests
- demo truth-policy tests
- brand regression
- production-mode application build

The repository's existing Production Perimeter remains independent and is not weakened or replaced.

## Remaining rendered acceptance

After exact-head static/build qualification succeeds, perform authenticated rendered validation on the original AURA implementation at:

- 1920x1080
- 1440x1000
- 1280x900
- 1024x900
- 768x1024
- 390x844

Include keyboard/focus flow, 400% reflow, reduced-motion behavior, screen-reader naming, contrast, overflow and modal/drawer focus restoration.

No visual baseline may be accepted automatically.
