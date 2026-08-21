# AURA DC Enterprise Visual-System Corrective Pass

## Goal
Eliminate the authenticated-shell `m2mLogo` runtime failure and make the existing V2 theme consistently light, Salesforce-inspired enterprise UI, while retaining graphite only for true 3D, visualization, telemetry, and runtime-diagnostic zones. Preserve all routes, auth/RBAC, data behavior, truth/provenance semantics, and test IDs.

## Implementation
1. **Runtime and brand closure**
   - Remove every authenticated or auth-adjacent `m2mLogo` import/reference and standardize those surfaces on `AuraLogo` / `AuraNodeMark` where product branding is shown.
   - Keep the authenticated lockup exactly `M2M | [AURA Node] AURA`, with compact node-only behavior and accessible naming.
   - Add a regression guard so stale `m2mLogo` references cannot return in authenticated code.

2. **Authoritative light V2 theme**
   - Refactor the current `.aura-v2` tokens in `src/index.css` rather than creating another theme.
   - Add explicit app-header, canvas, panel, elevated panel, technical viewport, action, focus, disabled, and semantic-state roles.
   - Change the global app bar to white/light neutral with graphite text/icons, subtle border/shadow, and restrained NVIDIA-green active treatment.
   - Keep graphite tokens scoped to `v2-tech-zone`, viewports, telemetry rails, and diagnostics, with AA-safe near-white/light-gray foregrounds.
   - Harden inherited shadcn colors for buttons, fields, placeholders, tabs, badges, menus, popovers, dialogs, sheets, tables, disabled states, loading/empty/error states, and icon foregrounds under `.aura-v2`.

3. **Shared component correction**
   - Update the shell header, logo usage, search/Assistant controls, mobile drawer, user menu, V2 headers/panels, and error boundary to consume semantic light-theme roles.
   - Raise ordinary supporting text to the 12-14px floor and keep body/actions/tables at 14-16px. Reserve monospace for telemetry, identifiers, and metrics.

4. **Authenticated workspace sweep**
   - Correct shared and unavoidable local styling across Command Center, Blueprint, Simulation, Evidence, Manage, Govern, Connections, Platform Readiness, People & Access, Admin/settings, and Help/Learning.
   - Keep only actual technical canvases and tightly scoped diagnostic blocks dark. Remove white-on-white, gray-on-gray, gray-on-black, blank-looking controls, mismatched icons, and all-dark enterprise sections.

## Verification
- Run TypeScript typecheck and focused shell/navigation/component tests without updating visual baselines.
- Browser-smoke representative authenticated routes with console/runtime capture.
- Inspect desktop screenshots for Command Center, Blueprint, Simulation, Evidence, Connections, and Platform Readiness, plus a 1024px or mobile/tablet pass.
- Check horizontal overflow, focus states, logo scaling, dropdown/popover contrast, disabled/selected controls, and the requested contrast defect classes.
- Report changed files, checks, unresolved visual issues, and the exact repository commit SHA.

## Technical notes
- The current source scan shows no `m2mLogo` symbol in `AuraLogo.tsx`, but auth-adjacent modules still import it. The implementation will remove those references so lazy-loaded/auth transitions cannot reintroduce the runtime symbol.
- The existing `.aura-v2` block already remaps shadcn tokens to light surfaces, but `v2-appbar` and shell controls still explicitly consume graphite tokens. The correction will update those shared roles first, then limit page-specific edits to remaining inheritance defects.
